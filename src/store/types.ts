// Place in the Petri net - uses generic params based on type
export interface Place {
  id: string;
  type: string; // Place type from supported_places.json
  params: Record<string, unknown>; // Type-specific parameters
  position: { x: number; y: number };
  tokenCapacity?: number;
  requiredActors?: string[];
  description?: string;
}

// Transition output with optional token filter
export interface TransitionOutput {
  to: string; // Place ID
  tokenFilter?: string; // Actor type to filter for this output
}

// Transition in the Petri net
export interface Transition {
  id: string;
  from: string[]; // Place IDs (including subplaces like "action::success")
  to: TransitionOutput[];
  priority?: number;
  position: { x: number; y: number };
}

// Actor definition - describes an actor type that can be used in tokens
export interface ActorDefinition {
  id: string; // e.g., "user::Vehicle"
  requiredInitParams: Record<string, { type: string }>;
  optionalInitParams?: Record<string, { type: string }>;
  // For HTTP actors
  httpConfig?: {
    services: HttpService[];
  };
}

export interface HttpService {
  id: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: Record<string, unknown>;
  responsePath?: string;
}

// Action definition - describes an action that can be invoked on actors
export interface ActionDefinition {
  id: string; // e.g., "user::move_to_location"
  requiredActors: string[]; // Actor IDs required for this action
  // For HTTP-based actions
  httpConfig?: {
    actorId: string;
    serviceId: string;
    serviceParams?: Record<string, unknown>;
  };
}

// Error handler mapping
export interface ErrorMapping {
  errorIdFilter: string; // Error type filter, "*" for all
  actorFilter?: string; // Actor type filter
  destination: string; // Place ID to route to
}

// Global error handler configuration
export interface GlobalErrorHandler {
  places: Place[];
  mapping: ErrorMapping[];
}

// Simulation configuration for action places
export interface SimulationConfig {
  actionProbabilities?: Record<string, ActionOutcomeProbability>;
}

// Complete net configuration (for export/import)
export interface BNetConfig {
  actors: ActorDefinition[];
  actions: ActionDefinition[];
  places: Place[];
  transitions: Transition[];
  globalErrorHandler?: GlobalErrorHandler;
  // GUI metadata - saved for visual state restoration
  edgeOffsets?: Record<string, { x: number; y: number }>;
  // Simulation settings
  simulation?: SimulationConfig;
}

// Application modes
export type AppMode = 'editor' | 'simulator' | 'runtime';

// Runtime connection state
export type RuntimeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Runtime stats from server
export interface RuntimeStats {
  epoch: number;
  transitionsFired: number;
  tokensProcessed: number;
  activeTokens: number;
}

// Runtime token info (simplified for display)
export interface RuntimeTokenInfo {
  id: number;
  data: Record<string, unknown>;
}

// Runtime place state
export interface RuntimePlaceState {
  tokens: RuntimeTokenInfo[];
}

// Token in simulation - contains actors
export interface Token {
  id: string;
  actors: TokenActor[];
}

// Actor instance within a token
export interface TokenActor {
  type: string; // Actor type ID (e.g., "user::Vehicle")
  id: string;   // Instance ID (e.g., "vehicle_1")
  params: Record<string, unknown>;
}

// Simulation log entry
export interface SimLogEntry {
  timestamp: number;
  type: 'token_inject' | 'transition_fire' | 'action_start' | 'action_complete' | 'token_move';
  message: string;
  details?: Record<string, unknown>;
}

// Action outcome probabilities
export interface ActionOutcomeProbability {
  success: number;  // 0-100
  failure: number;  // 0-100
  error: number;    // 0-100
}
