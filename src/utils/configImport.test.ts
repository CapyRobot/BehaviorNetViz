import { describe, it, expect } from 'vitest';
import { importFromJson } from './configImport';

describe('importFromJson', () => {
  it('imports empty config correctly', () => {
    const json = JSON.stringify({
      actors: [],
      actions: [],
      places: [],
      transitions: [],
    });

    const result = importFromJson(json);

    expect(result.actors).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.places).toEqual([]);
    expect(result.transitions).toEqual([]);
  });

  it('imports places with positions from GUI metadata', () => {
    const json = JSON.stringify({
      places: [
        { id: 'place_1', type: 'plain' },
        { id: 'place_2', type: 'action', params: { action_id: 'test' } },
      ],
      transitions: [],
      _gui_metadata: {
        places: {
          place_1: { position: { x: 100, y: 200 } },
          place_2: { position: { x: 300, y: 400 } },
        },
        transitions: {},
      },
    });

    const result = importFromJson(json);

    expect(result.places).toHaveLength(2);
    expect(result.places[0].id).toBe('place_1');
    expect(result.places[0].position).toEqual({ x: 100, y: 200 });
    expect(result.places[1].id).toBe('place_2');
    expect(result.places[1].params.actionId).toBe('test');
  });

  it('generates default positions when GUI metadata is missing', () => {
    const json = JSON.stringify({
      places: [
        { id: 'place_1', type: 'plain' },
      ],
      transitions: [],
    });

    const result = importFromJson(json);

    expect(result.places[0].position).toBeDefined();
    expect(result.places[0].position.x).toBeGreaterThanOrEqual(0);
    expect(result.places[0].position.y).toBeGreaterThanOrEqual(0);
  });

  it('imports transitions correctly', () => {
    const json = JSON.stringify({
      places: [],
      transitions: [
        { from: ['place_1'], to: ['place_2'], priority: 2 },
        { from: ['place_2'], to: [{ to: 'place_3', token_filter: 'Vehicle' }] },
      ],
      _gui_metadata: {
        places: {},
        transitions: {
          transition_1: { position: { x: 150, y: 150 } },
          transition_2: { position: { x: 350, y: 150 } },
        },
      },
    });

    const result = importFromJson(json);

    expect(result.transitions).toHaveLength(2);
    expect(result.transitions[0].from).toEqual(['place_1']);
    expect(result.transitions[0].to).toEqual([{ to: 'place_2' }]);
    expect(result.transitions[0].priority).toBe(2);
    expect(result.transitions[1].to).toEqual([{ to: 'place_3', tokenFilter: 'Vehicle' }]);
  });

  it('imports edge offsets from GUI metadata', () => {
    const json = JSON.stringify({
      places: [],
      transitions: [],
      _gui_metadata: {
        places: {},
        transitions: {},
        edgeOffsets: {
          'place_1->transition_1': { x: 10, y: 20 },
        },
      },
    });

    const result = importFromJson(json);

    expect(result.edgeOffsets).toEqual({
      'place_1->transition_1': { x: 10, y: 20 },
    });
  });

  it('converts snake_case params to camelCase', () => {
    const json = JSON.stringify({
      places: [
        {
          id: 'place_1',
          type: 'action',
          params: {
            action_id: 'test',
            timeout_per_try_s: 30,
            failure_as_error: true,
          },
        },
      ],
      transitions: [],
    });

    const result = importFromJson(json);

    expect(result.places[0].params).toEqual({
      actionId: 'test',
      timeoutPerTryS: 30,
      failureAsError: true,
    });
  });

  it('imports actors correctly', () => {
    const json = JSON.stringify({
      actors: [
        {
          id: 'Vehicle',
          required_init_params: { plate: { type: 'string' } },
        },
      ],
      actions: [],
      places: [],
      transitions: [],
    });

    const result = importFromJson(json);

    expect(result.actors).toHaveLength(1);
    expect(result.actors[0].id).toBe('Vehicle');
    expect(result.actors[0].requiredInitParams).toEqual({ plate: { type: 'string' } });
  });

  it('imports actions correctly', () => {
    const json = JSON.stringify({
      actors: [],
      actions: [
        {
          id: 'move_to_location',
          required_actors: ['Vehicle'],
        },
      ],
      places: [],
      transitions: [],
    });

    const result = importFromJson(json);

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].id).toBe('move_to_location');
    expect(result.actions[0].requiredActors).toEqual(['Vehicle']);
  });
});
