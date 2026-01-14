import { WebSocketServer, WebSocket } from 'ws';

interface TokenInfo {
  id: number;
  data: Record<string, unknown>;
}

interface PlaceState {
  tokens: TokenInfo[];
}

interface NetConfig {
  places: Array<{
    id: string;
    type: string;
    name?: string;
    position?: { x: number; y: number };
  }>;
  transitions: Array<{
    id: string;
    from: string[];
    to: string[];
    position?: { x: number; y: number };
  }>;
}

interface ReceivedMessage {
  type: string;
  payload?: unknown;
  timestamp: number;
}

export class MockRuntimeServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private config: NetConfig | null = null;
  private placeTokens: Map<string, PlaceState> = new Map();
  private stats = {
    epoch: 0,
    transitionsFired: 0,
    tokensProcessed: 0,
    activeTokens: 0,
  };
  private receivedMessages: ReceivedMessage[] = [];
  private tokenIdCounter = 1;

  constructor(private port: number = 8080) {}

  setConfig(config: NetConfig): void {
    this.config = config;
    // Initialize empty token state for each place
    for (const place of config.places) {
      this.placeTokens.set(place.id, { tokens: [] });
    }
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('connection', (ws) => {
          this.clients.add(ws);

          // Send config on connect
          if (this.config) {
            ws.send(JSON.stringify({ type: 'config', payload: this.config }));
          }

          // Send initial state snapshot
          this.sendStateSnapshot(ws);

          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              this.receivedMessages.push({
                ...message,
                timestamp: Date.now(),
              });
              this.handleMessage(ws, message);
            } catch (e) {
              console.error('Failed to parse message:', e);
            }
          });

          ws.on('close', () => {
            this.clients.delete(ws);
          });
        });

        this.wss.on('listening', () => {
          resolve();
        });

        this.wss.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        for (const client of this.clients) {
          client.close();
        }
        this.wss.close(() => {
          this.wss = null;
          this.clients.clear();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private handleMessage(ws: WebSocket, message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case 'inject_token': {
        const payload = message.payload as { entrypointId: string; data?: Record<string, unknown> };
        this.injectToken(payload.entrypointId, payload.data);
        break;
      }
      case 'query_place': {
        const payload = message.payload as { placeId: string };
        const placeState = this.placeTokens.get(payload.placeId);
        if (placeState) {
          ws.send(JSON.stringify({
            type: 'place_tokens',
            payload: { placeId: payload.placeId, tokens: placeState.tokens },
          }));
        }
        break;
      }
      case 'request_state':
        this.sendStateSnapshot(ws);
        break;
    }
  }

  private sendStateSnapshot(ws: WebSocket): void {
    const places: Record<string, PlaceState> = {};
    for (const [placeId, state] of this.placeTokens) {
      places[placeId] = state;
    }

    ws.send(JSON.stringify({
      type: 'state_snapshot',
      payload: { places, stats: this.stats },
    }));
  }

  // Methods for tests to simulate events

  simulateTokenEnter(placeId: string, data: Record<string, unknown> = {}): void {
    const token: TokenInfo = {
      id: this.tokenIdCounter++,
      data,
    };

    const placeState = this.placeTokens.get(placeId);
    if (placeState) {
      placeState.tokens.push(token);
    } else {
      this.placeTokens.set(placeId, { tokens: [token] });
    }

    this.stats.activeTokens++;

    this.broadcast({
      type: 'token_entered',
      payload: { placeId, token },
    });
  }

  simulateTokenExit(placeId: string, tokenId: number): void {
    const placeState = this.placeTokens.get(placeId);
    if (placeState) {
      const idx = placeState.tokens.findIndex(t => t.id === tokenId);
      if (idx !== -1) {
        placeState.tokens.splice(idx, 1);
        this.stats.activeTokens = Math.max(0, this.stats.activeTokens - 1);

        this.broadcast({
          type: 'token_exited',
          payload: { placeId, tokenId },
        });
      }
    }
  }

  simulateTransitionFire(transitionId: string): void {
    this.stats.epoch++;
    this.stats.transitionsFired++;

    this.broadcast({
      type: 'transition_fired',
      payload: { transitionId, epoch: this.stats.epoch },
    });
  }

  setStats(stats: Partial<typeof this.stats>): void {
    this.stats = { ...this.stats, ...stats };
    this.broadcastStateSnapshot();
  }

  broadcastStateSnapshot(): void {
    const places: Record<string, PlaceState> = {};
    for (const [placeId, state] of this.placeTokens) {
      places[placeId] = state;
    }

    this.broadcast({
      type: 'state_snapshot',
      payload: { places, stats: this.stats },
    });
  }

  private broadcast(message: unknown): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private injectToken(entrypointId: string, data?: Record<string, unknown>): void {
    // Simulate token injection at entrypoint
    this.simulateTokenEnter(entrypointId, data || {});
  }

  getReceivedMessages(): ReceivedMessage[] {
    return [...this.receivedMessages];
  }

  clearReceivedMessages(): void {
    this.receivedMessages = [];
  }

  clientCount(): number {
    return this.clients.size;
  }
}
