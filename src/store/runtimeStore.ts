import { create } from 'zustand';
import type {
  RuntimeConnectionState,
  RuntimeStats,
  RuntimePlaceState,
  RuntimeTokenInfo,
  BNetConfig,
} from './types';
import { useNetStore } from './netStore';

// WebSocket message types from server
interface ServerMessage {
  type: string;
  payload: unknown;
}

interface ConfigMessage {
  type: 'config';
  payload: BNetConfig;
}

interface StateSnapshotMessage {
  type: 'state_snapshot';
  payload: {
    places: Record<string, RuntimePlaceState>;
    stats: RuntimeStats;
  };
}

interface TokenEnteredMessage {
  type: 'token_entered';
  payload: {
    placeId: string;
    token: { data: Record<string, unknown> };
  };
}

// TokenExitedMessage not currently used since we just request state refresh

interface TransitionFiredMessage {
  type: 'transition_fired';
  payload: {
    transitionId: string;
    epoch: number;
  };
}

interface PlaceTokensMessage {
  type: 'place_tokens';
  payload: {
    placeId: string;
    tokens: RuntimeTokenInfo[];
  };
}

interface RuntimeState {
  // Connection state
  connectionState: RuntimeConnectionState;
  serverUrl: string;
  socket: WebSocket | null;
  error: string | null;

  // Runtime data
  stats: RuntimeStats;
  placeTokens: Record<string, RuntimePlaceState>;

  // Actions
  connect: (url: string) => void;
  disconnect: () => void;
  injectToken: (entrypointId: string, data?: Record<string, unknown>) => void;
  queryPlace: (placeId: string) => void;
  requestState: () => void;

  // Internal
  handleMessage: (message: ServerMessage) => void;
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  // Initial state
  connectionState: 'disconnected',
  serverUrl: 'ws://localhost:8080',
  socket: null,
  error: null,
  stats: {
    epoch: 0,
    transitionsFired: 0,
    tokensProcessed: 0,
    activeTokens: 0,
  },
  placeTokens: {},

  connect: (url: string) => {
    const { socket } = get();

    // Close existing connection
    if (socket) {
      socket.close();
    }

    set({ connectionState: 'connecting', serverUrl: url, error: null });

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        set({ connectionState: 'connected', socket: ws });
        console.log('Connected to runtime server');
      };

      ws.onclose = () => {
        set({ connectionState: 'disconnected', socket: null });
        console.log('Disconnected from runtime server');
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        set({
          connectionState: 'error',
          error: 'Connection failed. Is the server running?',
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          get().handleMessage(message);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      set({ socket: ws });
    } catch (e) {
      set({
        connectionState: 'error',
        error: e instanceof Error ? e.message : 'Connection failed',
      });
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
    }
    set({
      connectionState: 'disconnected',
      socket: null,
      error: null,
      placeTokens: {},
      stats: {
        epoch: 0,
        transitionsFired: 0,
        tokensProcessed: 0,
        activeTokens: 0,
      },
    });
  },

  injectToken: (entrypointId: string, data?: Record<string, unknown>) => {
    const { socket, connectionState } = get();
    if (socket && connectionState === 'connected') {
      const message = {
        type: 'inject_token',
        payload: {
          entrypointId,
          data: data || {},
        },
      };
      socket.send(JSON.stringify(message));
    }
  },

  queryPlace: (placeId: string) => {
    const { socket, connectionState } = get();
    if (socket && connectionState === 'connected') {
      const message = {
        type: 'query_place',
        payload: { placeId },
      };
      socket.send(JSON.stringify(message));
    }
  },

  requestState: () => {
    const { socket, connectionState } = get();
    if (socket && connectionState === 'connected') {
      const message = { type: 'request_state' };
      socket.send(JSON.stringify(message));
    }
  },

  handleMessage: (message: ServerMessage) => {
    switch (message.type) {
      case 'config': {
        const configMsg = message as ConfigMessage;
        // Add default positions to places that don't have them
        const configWithPositions = {
          ...configMsg.payload,
          places: configMsg.payload.places.map((place, index) => ({
            ...place,
            position: place.position || {
              x: 100 + (index % 5) * 200,
              y: 100 + Math.floor(index / 5) * 150,
            },
          })),
          transitions: configMsg.payload.transitions.map((trans, index) => ({
            ...trans,
            id: trans.id || `transition_${index + 1}`,
            position: trans.position || {
              x: 200 + (index % 5) * 200,
              y: 175 + Math.floor(index / 5) * 150,
            },
          })),
        };
        // Load config into netStore
        const netStore = useNetStore.getState();
        netStore.importConfig(configWithPositions);
        console.log('Received config from server');
        break;
      }

      case 'state_snapshot': {
        const stateMsg = message as StateSnapshotMessage;
        // Log places with tokens for debugging
        const placesWithTokens = Object.entries(stateMsg.payload.places)
          .filter(([, state]) => state.tokens.length > 0)
          .map(([id, state]) => `${id}:${state.tokens.length}`);
        console.log('state_snapshot stats:', stateMsg.payload.stats, 'tokens at:', placesWithTokens.join(', ') || 'none');
        set({
          stats: stateMsg.payload.stats,
          placeTokens: stateMsg.payload.places,
        });
        break;
      }

      case 'token_entered': {
        const enterMsg = message as TokenEnteredMessage;
        set((state) => {
          const placeTokens = { ...state.placeTokens };
          if (!placeTokens[enterMsg.payload.placeId]) {
            placeTokens[enterMsg.payload.placeId] = { tokens: [] };
          }
          // Add token (ID will come from next state snapshot)
          placeTokens[enterMsg.payload.placeId].tokens.push({
            id: Date.now(), // Temporary ID
            data: enterMsg.payload.token.data,
          });
          return {
            placeTokens,
            stats: {
              ...state.stats,
              activeTokens: state.stats.activeTokens + 1,
            },
          };
        });
        break;
      }

      case 'token_exited': {
        // Update stats and request fresh state for accurate token positions
        set((state) => ({
          stats: {
            ...state.stats,
            activeTokens: Math.max(0, state.stats.activeTokens - 1),
          },
        }));
        get().requestState();
        break;
      }

      case 'transition_fired': {
        const fireMsg = message as TransitionFiredMessage;
        set((state) => ({
          stats: {
            ...state.stats,
            epoch: fireMsg.payload.epoch,
            transitionsFired: state.stats.transitionsFired + 1,
          },
        }));
        // Request state to get updated token positions
        get().requestState();
        break;
      }

      case 'place_tokens': {
        const tokensMsg = message as PlaceTokensMessage;
        set((state) => ({
          placeTokens: {
            ...state.placeTokens,
            [tokensMsg.payload.placeId]: {
              tokens: tokensMsg.payload.tokens,
            },
          },
        }));
        break;
      }
    }
  },
}));
