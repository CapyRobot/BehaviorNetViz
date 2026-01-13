import type {
  BNetConfig,
  Place,
  Transition,
  ActorDefinition,
  ActionDefinition,
} from '../store/types';

export function importFromJson(json: string): BNetConfig {
  const data = JSON.parse(json);

  // Extract GUI metadata for positions and edge offsets
  const guiMetadata = data._gui_metadata || {};
  const placePositions = guiMetadata.places || {};
  const transitionPositions = guiMetadata.transitions || {};
  const edgeOffsets = guiMetadata.edgeOffsets || {};

  // Import actors
  const actors: ActorDefinition[] = (data.actors || []).map(
    (a: Record<string, unknown>): ActorDefinition => {
      const actor: ActorDefinition = {
        id: a.id as string,
        requiredInitParams: (a.required_init_params || {}) as Record<
          string,
          { type: string }
        >,
        optionalInitParams: a.optional_init_params as
          | Record<string, { type: string }>
          | undefined,
      };
      if (a.type === 'http_actor' && a.services) {
        actor.httpConfig = {
          services: a.services as NonNullable<ActorDefinition['httpConfig']>['services'],
        };
      }
      return actor;
    }
  );

  // Import actions
  const actions: ActionDefinition[] = (data.actions || []).map(
    (a: Record<string, unknown>): ActionDefinition => {
      const action: ActionDefinition = {
        id: a.id as string,
        requiredActors: (a.required_actors || []) as string[],
      };
      if (a.type === 'http_actor_service' && a.params) {
        const params = a.params as Record<string, unknown>;
        action.httpConfig = {
          actorId: params.actor_id as string,
          serviceId: params.service_id as string,
          serviceParams: params.service_params as Record<string, unknown> | undefined,
        };
      }
      return action;
    }
  );

  // Import places
  const places: Place[] = (data.places || []).map(
    (p: Record<string, unknown>, index: number) => {
      const id = p.id as string;
      const type = p.type as string;
      const position = placePositions[id]?.position || {
        x: 100 + (index % 5) * 150,
        y: 100 + Math.floor(index / 5) * 150,
      };

      // Convert snake_case params to camelCase
      const rawParams = (p.params || {}) as Record<string, unknown>;
      const params: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rawParams)) {
        // Convert snake_case to camelCase
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        params[camelKey] = value;
      }

      return {
        id,
        type,
        params,
        position,
        description: p.description as string | undefined,
        tokenCapacity: p.token_capacity as number | undefined,
        requiredActors: p.required_actors as string[] | undefined,
      };
    }
  );

  // Import transitions
  const transitions: Transition[] = (data.transitions || []).map(
    (t: Record<string, unknown>, index: number) => {
      // Generate a transition ID if not present
      const id = `transition_${index + 1}`;
      const position = transitionPositions[id]?.position || {
        x: 250 + (index % 5) * 150,
        y: 100 + Math.floor(index / 5) * 150,
      };

      const from = t.from as string[];
      const toRaw = t.to as Array<string | { to: string; token_filter?: string }>;

      const to = toRaw.map((output) => {
        if (typeof output === 'string') {
          return { to: output };
        }
        return {
          to: output.to,
          tokenFilter: output.token_filter,
        };
      });

      return {
        id,
        from,
        to,
        priority: (t.priority as number) || 1,
        position,
      };
    }
  );

  return {
    actors,
    actions,
    places,
    transitions,
    edgeOffsets,
    // TODO: Import global error handler if present
  };
}
