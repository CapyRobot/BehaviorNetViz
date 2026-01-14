import { create } from 'zustand';
import type { Token, SimLogEntry, ActionOutcomeProbability } from './types';

// Tokens per place (keyed by place ID, including subplaces like "action::in_execution")
type TokenDistribution = Record<string, Token[]>;

interface SimState {
  // Simulation control
  isRunning: boolean;
  stepIntervalMs: number; // Time between auto-steps (default 1000ms)

  // Token distribution - where tokens currently are
  tokens: TokenDistribution;

  // Action places currently executing (placeId -> tokens in execution)
  executingActions: Record<string, Token[]>;

  // Action outcome probabilities (placeId -> probabilities)
  // Default is 100% success
  actionProbabilities: Record<string, ActionOutcomeProbability>;

  // Last fired time for each transition (for tie-breaking)
  // Transitions fired more recently have lower preference
  lastFiredTime: Record<string, number>;

  // Simulation log
  logs: SimLogEntry[];

  // Counter for unique token IDs
  tokenCounter: number;

  // Actions
  start: () => void;
  stop: () => void;
  reset: () => void;
  setStepInterval: (ms: number) => void;

  // Token operations
  injectToken: (placeId: string, token: Token) => void;
  moveTokens: (fromPlaceId: string, toPlaceId: string, tokens: Token[]) => void;
  removeTokens: (placeId: string, tokenIds: string[]) => void;
  removeOneToken: (placeId: string) => void;
  setTokens: (distribution: TokenDistribution) => void;

  // Transition tracking
  recordTransitionFired: (transitionId: string) => void;

  // Action execution tracking
  startActionExecution: (placeId: string, token: Token) => void;
  completeActionExecution: (placeId: string, tokenId: string, outcome: 'success' | 'failure' | 'error') => void;

  // Action probability configuration
  setActionProbability: (placeId: string, probabilities: ActionOutcomeProbability) => void;
  setActionProbabilities: (probabilities: Record<string, ActionOutcomeProbability>) => void;

  // Logging
  addLog: (entry: Omit<SimLogEntry, 'timestamp'>) => void;
  clearLogs: () => void;

  // Token generation
  generateTokenId: () => string;
}

const DEFAULT_PROBABILITY: ActionOutcomeProbability = {
  success: 100,
  failure: 0,
  error: 0,
};

export const useSimStore = create<SimState>((set, get) => ({
  // Initial state
  isRunning: false,
  stepIntervalMs: 1000,
  tokens: {},
  executingActions: {},
  actionProbabilities: {},
  lastFiredTime: {},
  logs: [],
  tokenCounter: 1,

  // Control actions
  start: () => {
    set({ isRunning: true });
    get().addLog({ type: 'token_inject', message: 'Simulation started' });
  },

  stop: () => {
    set({ isRunning: false });
    get().addLog({ type: 'token_inject', message: 'Simulation stopped' });
  },

  reset: () => {
    set({
      isRunning: false,
      tokens: {},
      executingActions: {},
      lastFiredTime: {},
      logs: [],
      tokenCounter: 1,
    });
  },

  setStepInterval: (ms) => {
    set({ stepIntervalMs: Math.max(100, Math.min(5000, ms)) });
  },

  // Token operations
  injectToken: (placeId, token) => {
    set((state) => ({
      tokens: {
        ...state.tokens,
        [placeId]: [...(state.tokens[placeId] || []), token],
      },
    }));
    get().addLog({
      type: 'token_inject',
      message: `Token ${token.id} injected into ${placeId}`,
      details: { placeId, token },
    });
  },

  moveTokens: (fromPlaceId, toPlaceId, tokens) => {
    if (tokens.length === 0) return;

    const tokenIds = new Set(tokens.map(t => t.id));

    set((state) => ({
      tokens: {
        ...state.tokens,
        [fromPlaceId]: (state.tokens[fromPlaceId] || []).filter(t => !tokenIds.has(t.id)),
        [toPlaceId]: [...(state.tokens[toPlaceId] || []), ...tokens],
      },
    }));

    get().addLog({
      type: 'token_move',
      message: `${tokens.length} token(s) moved from ${fromPlaceId} to ${toPlaceId}`,
      details: { fromPlaceId, toPlaceId, tokenIds: Array.from(tokenIds) },
    });
  },

  removeTokens: (placeId, tokenIds) => {
    const idSet = new Set(tokenIds);
    set((state) => ({
      tokens: {
        ...state.tokens,
        [placeId]: (state.tokens[placeId] || []).filter(t => !idSet.has(t.id)),
      },
    }));
  },

  removeOneToken: (placeId) => {
    const placeTokens = get().tokens[placeId] || [];
    if (placeTokens.length === 0) return;

    const removedToken = placeTokens[placeTokens.length - 1]; // Remove last token
    set((state) => ({
      tokens: {
        ...state.tokens,
        [placeId]: (state.tokens[placeId] || []).slice(0, -1),
      },
    }));
    get().addLog({
      type: 'token_inject',
      message: `Token ${removedToken.id} removed from ${placeId}`,
      details: { placeId, tokenId: removedToken.id },
    });
  },

  setTokens: (distribution) => {
    set({ tokens: distribution });
  },

  recordTransitionFired: (transitionId) => {
    set((state) => ({
      lastFiredTime: {
        ...state.lastFiredTime,
        [transitionId]: Date.now(),
      },
    }));
  },

  // Action execution
  startActionExecution: (placeId, token) => {
    set((state) => ({
      executingActions: {
        ...state.executingActions,
        [placeId]: [...(state.executingActions[placeId] || []), token],
      },
    }));
    get().addLog({
      type: 'action_start',
      message: `Action started for token ${token.id} at ${placeId}`,
      details: { placeId, tokenId: token.id },
    });
  },

  completeActionExecution: (placeId, tokenId, outcome) => {
    const { executingActions } = get();
    const token = executingActions[placeId]?.find(t => t.id === tokenId);

    if (!token) return;

    // Remove from executing
    set((state) => ({
      executingActions: {
        ...state.executingActions,
        [placeId]: (state.executingActions[placeId] || []).filter(t => t.id !== tokenId),
      },
    }));

    // Move to appropriate subplace
    const subplaceId = `${placeId}::${outcome}`;
    get().injectToken(subplaceId, token);

    get().addLog({
      type: 'action_complete',
      message: `Action completed for token ${tokenId} at ${placeId}: ${outcome}`,
      details: { placeId, tokenId, outcome },
    });
  },

  // Probability configuration
  setActionProbability: (placeId, probabilities) => {
    // Normalize to ensure they sum to 100
    const total = probabilities.success + probabilities.failure + probabilities.error;
    const normalized: ActionOutcomeProbability = total > 0 ? {
      success: Math.round((probabilities.success / total) * 100),
      failure: Math.round((probabilities.failure / total) * 100),
      error: Math.round((probabilities.error / total) * 100),
    } : DEFAULT_PROBABILITY;

    set((state) => ({
      actionProbabilities: {
        ...state.actionProbabilities,
        [placeId]: normalized,
      },
    }));
  },

  setActionProbabilities: (probabilities) => {
    set({ actionProbabilities: probabilities });
  },

  // Logging
  addLog: (entry) => {
    set((state) => ({
      logs: [...state.logs, { ...entry, timestamp: Date.now() }],
    }));
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  // Token generation
  generateTokenId: () => {
    const id = `token_${get().tokenCounter}`;
    set((state) => ({ tokenCounter: state.tokenCounter + 1 }));
    return id;
  },
}));

// Helper to get action probability for a place
export function getActionProbability(
  actionProbabilities: Record<string, ActionOutcomeProbability>,
  placeId: string
): ActionOutcomeProbability {
  return actionProbabilities[placeId] || DEFAULT_PROBABILITY;
}

// Helper to determine outcome based on probability
export function rollActionOutcome(probability: ActionOutcomeProbability): 'success' | 'failure' | 'error' {
  const roll = Math.random() * 100;
  if (roll < probability.success) return 'success';
  if (roll < probability.success + probability.failure) return 'failure';
  return 'error';
}
