import type { Place, Transition, Token } from './types';
import { useSimStore, getActionProbability, rollActionOutcome } from './simStore';
import type { PlaceConfigSchema } from './placeConfig';

// Check if a transition is enabled (all input places have at least one token)
export function isTransitionEnabled(
  transition: Transition,
  tokens: Record<string, Token[]>,
  _places: Place[]
): boolean {
  // All input places must have at least one token
  return transition.from.every((fromId) => {
    const placeTokens = tokens[fromId] || [];
    return placeTokens.length > 0;
  });
}

// Get all enabled transitions, sorted by priority (highest first)
// Ties are broken by last fired time (least recently fired has preference)
export function getEnabledTransitions(
  transitions: Transition[],
  tokens: Record<string, Token[]>,
  places: Place[],
  lastFiredTime: Record<string, number> = {}
): Transition[] {
  return transitions
    .filter((t) => isTransitionEnabled(t, tokens, places))
    .sort((a, b) => {
      const priorityDiff = (b.priority || 1) - (a.priority || 1);
      if (priorityDiff !== 0) return priorityDiff;
      // Tie-break: least recently fired wins (lower timestamp = higher preference)
      const aTime = lastFiredTime[a.id] || 0;
      const bTime = lastFiredTime[b.id] || 0;
      return aTime - bTime;
    });
}

// Fire a transition: move tokens from input places to output places
export function fireTransition(
  transition: Transition,
  tokens: Record<string, Token[]>,
  places: Place[],
  placeConfig: PlaceConfigSchema
): {
  newTokens: Record<string, Token[]>;
  actionExecutions: Array<{ placeId: string; token: Token }>;
  logs: Array<{ type: 'transition_fire' | 'token_move'; message: string; details?: Record<string, unknown> }>;
} {
  const newTokens = { ...tokens };
  const logs: Array<{ type: 'transition_fire' | 'token_move'; message: string; details?: Record<string, unknown> }> = [];
  const actionExecutions: Array<{ placeId: string; token: Token }> = [];

  // Collect one token from each input place
  const collectedTokens: Token[] = [];
  for (const fromId of transition.from) {
    const placeTokens = newTokens[fromId] || [];
    if (placeTokens.length === 0) {
      // Should not happen if transition is enabled
      return { newTokens: tokens, actionExecutions: [], logs: [] };
    }

    // Take the first token
    const [token, ...remaining] = placeTokens;
    collectedTokens.push(token);
    newTokens[fromId] = remaining;
  }

  // Merge all collected tokens into one (combine actors)
  const mergedToken: Token = {
    id: collectedTokens[0]?.id || 'merged',
    actors: collectedTokens.flatMap((t) => t.actors),
  };

  logs.push({
    type: 'transition_fire',
    message: `Transition ${transition.id} fired`,
    details: {
      transitionId: transition.id,
      inputPlaces: transition.from,
      outputPlaces: transition.to.map((o) => o.to),
      tokenId: mergedToken.id,
    },
  });

  // Distribute to output places
  if (transition.to.length === 0) {
    // Token is consumed (destroyed)
    return { newTokens, actionExecutions, logs };
  }

  // For each output, check token filter and place type
  for (const output of transition.to) {
    const targetPlaceId = output.to;
    const targetPlace = places.find((p) => p.id === targetPlaceId);

    // Handle token filter - split actors if needed
    let tokenToSend = mergedToken;
    if (output.tokenFilter) {
      // Filter actors by type
      const filteredActors = mergedToken.actors.filter((a) => a.type === output.tokenFilter);
      if (filteredActors.length === 0) {
        // No matching actors, skip this output
        continue;
      }
      tokenToSend = {
        id: mergedToken.id,
        actors: filteredActors,
      };
    }

    // Check if target is an action place
    const placeType = targetPlace?.type;
    const placeTypeDef = placeConfig?.placeTypes[placeType || ''];

    if (placeTypeDef?.hasSubplaces) {
      // Action place - token goes to in-progress, schedule action execution
      actionExecutions.push({ placeId: targetPlaceId, token: tokenToSend });
    } else {
      // Regular place - add token directly
      newTokens[targetPlaceId] = [...(newTokens[targetPlaceId] || []), tokenToSend];
      logs.push({
        type: 'token_move',
        message: `Token ${tokenToSend.id} moved to ${targetPlaceId}`,
        details: { placeId: targetPlaceId, tokenId: tokenToSend.id },
      });
    }
  }

  return { newTokens, actionExecutions, logs };
}

// Execute a single simulation step
// If specificTransitionId is provided, fire that transition (if enabled)
// Otherwise, fire the highest priority enabled transition
export function executeStep(
  transitions: Transition[],
  places: Place[],
  placeConfig: PlaceConfigSchema,
  simStore: ReturnType<typeof useSimStore.getState>,
  specificTransitionId?: string
): boolean {
  const { tokens, actionProbabilities, lastFiredTime } = simStore;

  // Get enabled transitions (with tie-breaking by last fired time)
  const enabled = getEnabledTransitions(transitions, tokens, places, lastFiredTime);

  if (enabled.length === 0) {
    // No enabled transitions
    return false;
  }

  // Fire either the specific transition or the highest priority one
  let toFire: Transition;
  if (specificTransitionId) {
    const specific = enabled.find(t => t.id === specificTransitionId);
    if (!specific) {
      // The specific transition is not enabled
      return false;
    }
    toFire = specific;
  } else {
    toFire = enabled[0];
  }
  const { newTokens, actionExecutions, logs } = fireTransition(
    toFire,
    tokens,
    places,
    placeConfig
  );

  // Record that this transition was fired
  simStore.recordTransitionFired(toFire.id);

  // Update token distribution
  simStore.setTokens(newTokens);

  // Log firing
  for (const log of logs) {
    simStore.addLog(log);
  }

  // Handle action executions
  for (const { placeId, token } of actionExecutions) {
    const place = places.find((p) => p.id === placeId);
    const retries = (place?.params?.retries as number) || 0;
    const failureAsError = (place?.params?.failureAsError as boolean) || false;

    // Get probability for this action place
    const probability = getActionProbability(actionProbabilities, placeId);

    // Roll for outcome
    let outcome = rollActionOutcome(probability);

    // Handle retries
    let retriesRemaining = retries;
    while (outcome === 'failure' && retriesRemaining > 0) {
      retriesRemaining--;
      simStore.addLog({
        type: 'action_start',
        message: `Retrying action at ${placeId} (${retriesRemaining} retries left)`,
        details: { placeId, tokenId: token.id, retriesLeft: retriesRemaining },
      });
      outcome = rollActionOutcome(probability);
    }

    // Handle failureAsError
    if (outcome === 'failure' && failureAsError) {
      outcome = 'error';
    }

    // Move token to appropriate subplace
    const subplaceId = `${placeId}::${outcome}`;
    simStore.injectToken(subplaceId, token);

    simStore.addLog({
      type: 'action_complete',
      message: `Action at ${placeId} completed: ${outcome}`,
      details: { placeId, tokenId: token.id, outcome },
    });
  }

  return true;
}

// Get token count for a place (including subplaces)
export function getTokenCount(
  tokens: Record<string, Token[]>,
  placeId: string,
  includeSubplaces: boolean = false
): number {
  let count = (tokens[placeId] || []).length;

  if (includeSubplaces) {
    // Check for subplace tokens
    for (const key of Object.keys(tokens)) {
      if (key.startsWith(`${placeId}::`)) {
        count += tokens[key].length;
      }
    }
  }

  return count;
}

// Get all tokens in a place (including subplaces optionally)
export function getPlaceTokens(
  tokens: Record<string, Token[]>,
  placeId: string,
  subplace?: string
): Token[] {
  if (subplace) {
    return tokens[`${placeId}::${subplace}`] || [];
  }
  return tokens[placeId] || [];
}
