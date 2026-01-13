import type { BNetConfig, Place, Transition } from '../store/types';

// Convert internal format to export format matching DESIGN.md spec
export function exportToJson(config: BNetConfig): string {
  const exportConfig = {
    actors: config.actors.map((actor) => ({
      id: actor.id,
      required_init_params: actor.requiredInitParams,
      optional_init_params: actor.optionalInitParams,
      ...(actor.httpConfig && {
        type: 'http_actor',
        services: actor.httpConfig.services,
      }),
    })),
    actions: config.actions.map((action) => ({
      id: action.id,
      required_actors: action.requiredActors,
      ...(action.httpConfig && {
        type: 'http_actor_service',
        params: {
          actor_id: action.httpConfig.actorId,
          service_id: action.httpConfig.serviceId,
          service_params: action.httpConfig.serviceParams,
        },
      }),
    })),
    places: config.places.map((place) => exportPlace(place)),
    transitions: config.transitions.map((transition) => exportTransition(transition)),
    ...(config.globalErrorHandler && {
      global_error_handler: {
        places: config.globalErrorHandler.places.map((p) => exportPlace(p)),
        mapping: config.globalErrorHandler.mapping.map((m) => ({
          error_id_filter: m.errorIdFilter,
          actor_filter: m.actorFilter,
          destination: m.destination,
        })),
      },
    }),
    // GUI metadata (positions and edge offsets)
    _gui_metadata: {
      places: Object.fromEntries(
        config.places.map((p) => [p.id, { position: p.position }])
      ),
      transitions: Object.fromEntries(
        config.transitions.map((t) => [t.id, { position: t.position }])
      ),
      edgeOffsets: config.edgeOffsets || {},
    },
  };

  return JSON.stringify(exportConfig, null, 2);
}

function exportPlace(place: Place): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: place.id,
    type: place.type,
  };

  if (place.description) {
    base.description = place.description;
  }

  if (place.tokenCapacity) {
    base.token_capacity = place.tokenCapacity;
  }

  if (place.requiredActors && place.requiredActors.length > 0) {
    base.required_actors = place.requiredActors;
  }

  // Export type-specific params with snake_case conversion
  if (place.params && Object.keys(place.params).length > 0) {
    const exportedParams: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(place.params)) {
      if (value !== undefined && value !== null) {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        exportedParams[snakeKey] = value;
      }
    }

    if (Object.keys(exportedParams).length > 0) {
      base.params = exportedParams;
    }
  }

  return base;
}

function exportTransition(transition: Transition): Record<string, unknown> {
  const result: Record<string, unknown> = {
    from: transition.from,
    to: transition.to.map((output) => {
      if (output.tokenFilter) {
        return { to: output.to, token_filter: output.tokenFilter };
      }
      return output.to;
    }),
  };

  if (transition.priority && transition.priority !== 1) {
    result.priority = transition.priority;
  }

  return result;
}

export function downloadJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
