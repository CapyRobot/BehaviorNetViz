import { describe, it, expect } from 'vitest';
import { exportToJson } from './configExport';
import type { BNetConfig } from '../store/types';

describe('exportToJson', () => {
  it('exports empty config correctly', () => {
    const config: BNetConfig = {
      actors: [],
      actions: [],
      places: [],
      transitions: [],
    };

    const result = JSON.parse(exportToJson(config));

    expect(result.actors).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.places).toEqual([]);
    expect(result.transitions).toEqual([]);
    expect(result._gui_metadata).toBeDefined();
  });

  it('exports places with correct format', () => {
    const config: BNetConfig = {
      actors: [],
      actions: [],
      places: [
        {
          id: 'place_1',
          type: 'plain',
          params: {},
          position: { x: 100, y: 200 },
        },
        {
          id: 'place_2',
          type: 'action',
          params: { actionId: 'test_action', retries: 3 },
          position: { x: 300, y: 400 },
          tokenCapacity: 5,
        },
      ],
      transitions: [],
    };

    const result = JSON.parse(exportToJson(config));

    expect(result.places).toHaveLength(2);
    expect(result.places[0]).toEqual({ id: 'place_1', type: 'plain' });
    expect(result.places[1]).toEqual({
      id: 'place_2',
      type: 'action',
      token_capacity: 5,
      params: { action_id: 'test_action', retries: 3 },
    });
  });

  it('exports transitions with correct format', () => {
    const config: BNetConfig = {
      actors: [],
      actions: [],
      places: [],
      transitions: [
        {
          id: 'transition_1',
          from: ['place_1'],
          to: [{ to: 'place_2' }],
          position: { x: 200, y: 200 },
          priority: 1,
        },
        {
          id: 'transition_2',
          from: ['place_2'],
          to: [{ to: 'place_3', tokenFilter: 'Vehicle' }],
          position: { x: 400, y: 200 },
          priority: 2,
        },
      ],
    };

    const result = JSON.parse(exportToJson(config));

    expect(result.transitions).toHaveLength(2);
    expect(result.transitions[0]).toEqual({
      from: ['place_1'],
      to: ['place_2'],
    });
    expect(result.transitions[1]).toEqual({
      from: ['place_2'],
      to: [{ to: 'place_3', token_filter: 'Vehicle' }],
      priority: 2,
    });
  });

  it('saves GUI metadata with positions and edge offsets', () => {
    const config: BNetConfig = {
      actors: [],
      actions: [],
      places: [
        { id: 'p1', type: 'plain', params: {}, position: { x: 10, y: 20 } },
      ],
      transitions: [
        { id: 't1', from: [], to: [], position: { x: 30, y: 40 }, priority: 1 },
      ],
      edgeOffsets: {
        'p1->t1': { x: 5, y: 10 },
      },
    };

    const result = JSON.parse(exportToJson(config));

    expect(result._gui_metadata.places.p1.position).toEqual({ x: 10, y: 20 });
    expect(result._gui_metadata.transitions.t1.position).toEqual({ x: 30, y: 40 });
    expect(result._gui_metadata.edgeOffsets['p1->t1']).toEqual({ x: 5, y: 10 });
  });

  it('converts camelCase params to snake_case', () => {
    const config: BNetConfig = {
      actors: [],
      actions: [],
      places: [
        {
          id: 'place_1',
          type: 'action',
          params: {
            actionId: 'test',
            timeoutPerTryS: 30,
            failureAsError: true,
          },
          position: { x: 0, y: 0 },
        },
      ],
      transitions: [],
    };

    const result = JSON.parse(exportToJson(config));

    expect(result.places[0].params).toEqual({
      action_id: 'test',
      timeout_per_try_s: 30,
      failure_as_error: true,
    });
  });
});
