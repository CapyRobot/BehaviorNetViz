// Place and tool configuration loaded from JSON files

export interface ParamDefinition {
  type: 'string' | 'integer' | 'boolean' | 'enum' | 'array' | 'actorRef' | 'actionRef';
  required?: boolean;
  default?: unknown;
  description?: string;
  min?: number;
  max?: number;
  options?: string[];
  items?: { type: string };
  editable?: boolean;
  requiresActorsFeatureEnabled?: boolean;
}

export interface PlaceTypeDefinition {
  label: string;
  description: string;
  color: string;
  hasSubplaces?: boolean;
  subplaces?: string[];
  hideTypeLabel?: boolean;
  params: Record<string, ParamDefinition>;
}

export interface PlaceConfigSchema {
  commonParams: Record<string, ParamDefinition>;
  placeTypes: Record<string, PlaceTypeDefinition>;
  transitionParams: Record<string, ParamDefinition>;
  arcParams: Record<string, ParamDefinition>;
}

export interface ToolConfig {
  toolName: string;
  enabledPlaceTypes: string[];
  enableActorsFeature: boolean;
}

export interface AppConfig {
  toolConfig: ToolConfig;
  placeConfig: PlaceConfigSchema;
}

let cachedConfig: AppConfig | null = null;

export async function loadAppConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  // Get config file from environment variable, default to BN editor
  const toolConfigFile = import.meta.env.VITE_TOOL_CONFIG || 'tool_config_BN_editor.json';

  try {
    // Load both config files in parallel
    const [toolConfigResponse, placesResponse] = await Promise.all([
      fetch(`/${toolConfigFile}`),
      fetch('/supported_places.json'),
    ]);

    if (!toolConfigResponse.ok) {
      throw new Error(`Failed to load ${toolConfigFile}: ${toolConfigResponse.status}`);
    }
    if (!placesResponse.ok) {
      throw new Error(`Failed to load supported_places.json: ${placesResponse.status}`);
    }

    const toolConfig: ToolConfig = await toolConfigResponse.json();
    const fullPlaceConfig = await placesResponse.json();

    // Filter place types based on enabled list
    const enabledPlaceTypes: Record<string, PlaceTypeDefinition> = {};
    for (const placeType of toolConfig.enabledPlaceTypes) {
      if (fullPlaceConfig.placeTypes[placeType]) {
        enabledPlaceTypes[placeType] = fullPlaceConfig.placeTypes[placeType];
      }
    }

    // Filter out params that require actors feature when disabled
    const filterActorParams = (params: Record<string, ParamDefinition>): Record<string, ParamDefinition> => {
      if (toolConfig.enableActorsFeature) {
        return params;
      }
      const filtered: Record<string, ParamDefinition> = {};
      for (const [key, value] of Object.entries(params)) {
        if (!value.requiresActorsFeatureEnabled) {
          filtered[key] = value;
        }
      }
      return filtered;
    };

    // Apply actor feature filtering to all param definitions
    const filteredPlaceTypes: Record<string, PlaceTypeDefinition> = {};
    for (const [type, def] of Object.entries(enabledPlaceTypes)) {
      filteredPlaceTypes[type] = {
        ...def,
        params: filterActorParams(def.params),
      };
    }

    const placeConfig: PlaceConfigSchema = {
      commonParams: filterActorParams(fullPlaceConfig.commonParams),
      placeTypes: filteredPlaceTypes,
      transitionParams: fullPlaceConfig.transitionParams,
      arcParams: filterActorParams(fullPlaceConfig.arcParams),
    };

    cachedConfig = { toolConfig, placeConfig };
    return cachedConfig;
  } catch (error) {
    console.error('Failed to load config, using defaults:', error);
    return getDefaultConfig();
  }
}

export function getAppConfig(): AppConfig | null {
  return cachedConfig;
}

// Default config in case files fail to load
function getDefaultConfig(): AppConfig {
  return {
    toolConfig: {
      toolName: 'Petri Net Editor',
      enabledPlaceTypes: ['entrypoint', 'resource_pool', 'action', 'wait_with_timeout', 'exit_logger', 'plain'],
      enableActorsFeature: true,
    },
    placeConfig: {
      commonParams: {
        id: { type: 'string', required: true, editable: true, description: 'Unique identifier' },
        tokenCapacity: { type: 'integer', required: false, min: 1, description: 'Max tokens' },
      },
      placeTypes: {
        entrypoint: {
          label: 'Entrypoint',
          description: 'Entry point for new tokens',
          color: 'green',
          params: {
            newActors: { type: 'array', items: { type: 'actorRef' }, default: [] },
          },
        },
        resource_pool: {
          label: 'Resource Pool',
          description: 'Pool of available resources',
          color: 'blue',
          params: {
            resourceId: { type: 'actorRef', required: true },
          },
        },
        action: {
          label: 'Action',
          description: 'Executes an action on the token',
          color: 'orange',
          hasSubplaces: true,
          subplaces: ['success', 'failure', 'error'],
          params: {
            actionId: { type: 'actionRef', required: true },
            retries: { type: 'integer', min: 0, default: 0 },
            timeoutPerTryS: { type: 'integer', min: 1 },
            failureAsError: { type: 'boolean', default: false },
            errorToGlobalHandler: { type: 'boolean', default: true },
          },
        },
        wait_with_timeout: {
          label: 'Wait with Timeout',
          description: 'Waits for a condition with timeout',
          color: 'yellow',
          params: {
            timeoutMin: { type: 'integer', min: 1, default: 5, required: true },
            onTimeout: { type: 'string', default: 'error::timeout', required: true },
          },
        },
        exit_logger: {
          label: 'Exit Logger',
          description: 'Logs token and destroys it',
          color: 'red',
          params: {},
        },
        plain: {
          label: 'Plain',
          description: 'Simple place for flow control',
          color: 'gray',
          params: {},
        },
      },
      transitionParams: {
        priority: { type: 'integer', min: 1, default: 1 },
      },
      arcParams: {
        tokenFilter: { type: 'actorRef' },
      },
    },
  };
}

// Helper to get default values for a place type's params
export function getDefaultParamsForType(
  config: PlaceConfigSchema,
  placeType: string
): Record<string, unknown> {
  const typeDef = config.placeTypes[placeType];
  if (!typeDef) return {};

  const params: Record<string, unknown> = {};
  for (const [key, paramDef] of Object.entries(typeDef.params)) {
    if (paramDef.default !== undefined) {
      params[key] = paramDef.default;
    }
  }
  return params;
}
