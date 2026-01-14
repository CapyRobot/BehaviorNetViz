import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  ConnectionMode,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PlaceNode from './PlaceNode';
import ActionPlaceNode from './ActionPlaceNode';
import TransitionNode from './TransitionNode';
import { useNetStore, placesToNodes, transitionsToNodes } from '../../store/netStore';
import { useSimStore, getActionProbability } from '../../store/simStore';
import { isTransitionEnabled, executeStep } from '../../store/simEngine';
import type { Place, Transition, Token, ActionOutcomeProbability } from '../../store/types';
import type { PlaceConfigSchema } from '../../store/placeConfig';
import ActionProbabilityModal from '../Simulation/ActionProbabilityModal';

const nodeTypes = {
  place: PlaceNode,
  action: ActionPlaceNode,
  transition: TransitionNode,
};

// Default edge options - same as editor
const defaultEdgeOptions = {
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
    color: '#000000',
  },
  style: {
    strokeWidth: 1.5,
    stroke: '#000000',
  },
};

interface Props {
  placeConfig: PlaceConfigSchema;
}

// Calculate best handles (simplified from NetCanvas)
function getBestHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy) {
    return dx > 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' };
  }
  return dy > 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' };
}

// Convert transitions to edges (simplified, no draggable)
function connectionsToEdges(
  transitions: Transition[],
  places: Place[]
): Edge[] {
  const edges: Edge[] = [];
  const placeMap = new Map(places.map((p) => [p.id, p]));

  transitions.forEach((transition) => {
    // Input arcs
    transition.from.forEach((fromPlaceId) => {
      let sourceId = fromPlaceId;
      let sourceHandle: string | undefined;

      if (fromPlaceId.includes('::')) {
        const [placeId, subplace] = fromPlaceId.split('::');
        sourceId = placeId;
        sourceHandle = subplace;
      }

      const sourcePlace = placeMap.get(sourceId);
      if (sourcePlace) {
        const handles = getBestHandles(sourcePlace.position, transition.position);
        edges.push({
          id: `${fromPlaceId}->${transition.id}`,
          source: sourceId,
          sourceHandle: sourceHandle || handles.sourceHandle,
          target: transition.id,
          targetHandle: handles.targetHandle,
          type: 'default',
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#000000' },
          style: { strokeWidth: 1.5, stroke: '#000000' },
        });
      }
    });

    // Output arcs
    transition.to.forEach((output) => {
      const targetPlace = placeMap.get(output.to);
      if (targetPlace) {
        const handles = getBestHandles(transition.position, targetPlace.position);
        edges.push({
          id: `${transition.id}->${output.to}`,
          source: transition.id,
          sourceHandle: handles.sourceHandle,
          target: output.to,
          targetHandle: handles.targetHandle,
          type: 'default',
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#000000' },
          style: { strokeWidth: 1.5, stroke: '#000000' },
          label: output.tokenFilter || undefined,
        });
      }
    });
  });

  return edges;
}

export default function SimCanvas({ placeConfig }: Props) {
  const places = useNetStore((s) => s.places);
  const transitions = useNetStore((s) => s.transitions);

  const tokens = useSimStore((s) => s.tokens);
  const isRunning = useSimStore((s) => s.isRunning);
  const stepIntervalMs = useSimStore((s) => s.stepIntervalMs);
  const injectToken = useSimStore((s) => s.injectToken);
  const removeOneToken = useSimStore((s) => s.removeOneToken);
  const generateTokenId = useSimStore((s) => s.generateTokenId);
  const addLog = useSimStore((s) => s.addLog);

  const intervalRef = useRef<number | null>(null);

  // Modal state for action probability configuration
  const [configuringPlaceId, setConfiguringPlaceId] = useState<string | null>(null);
  const actionProbabilities = useSimStore((s) => s.actionProbabilities);
  const setActionProbability = useSimStore((s) => s.setActionProbability);

  // Handle opening probability configuration modal
  const handleConfigureProbability = useCallback((placeId: string) => {
    setConfiguringPlaceId(placeId);
  }, []);

  // Handle saving probability configuration
  const handleSaveProbability = useCallback((placeId: string, probability: ActionOutcomeProbability) => {
    setActionProbability(placeId, probability);
  }, [setActionProbability]);

  // Handle token injection into any place (for initial marking)
  const handleInjectToken = useCallback(
    (placeId: string) => {
      const place = places.find((p) => p.id === placeId);
      if (!place) return;

      const tokenId = generateTokenId();

      // For entrypoints, create actors based on newActors config
      // For other places, create an empty token
      const newActors = place.type === 'entrypoint'
        ? (place.params?.newActors as string[]) || []
        : [];

      const tokenActors = newActors.map((actorType, index) => ({
        type: actorType,
        id: `${actorType.replace('::', '_')}_${tokenId}_${index}`,
        params: {},
      }));

      const token: Token = {
        id: tokenId,
        actors: tokenActors,
      };

      injectToken(placeId, token);
    },
    [places, generateTokenId, injectToken]
  );

  // Handle token removal from a place
  const handleRemoveToken = useCallback(
    (placeId: string) => {
      removeOneToken(placeId);
    },
    [removeOneToken]
  );

  // Handle manual transition firing - fires the specific transition clicked
  const handleFireTransition = useCallback(
    (transitionId: string) => {
      const transition = transitions.find((t) => t.id === transitionId);
      if (!transition) return;

      if (!isTransitionEnabled(transition, tokens, places)) {
        addLog({ type: 'transition_fire', message: `Transition ${transitionId} is not enabled` });
        return;
      }

      // Pass the specific transition ID to fire that exact transition
      executeStep(transitions, places, placeConfig, useSimStore.getState(), transitionId);
    },
    [transitions, places, tokens, placeConfig, addLog]
  );

  // Auto-step when running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        const stepped = executeStep(transitions, places, placeConfig, useSimStore.getState());
        if (!stepped) {
          // No enabled transitions, stop simulation
          useSimStore.getState().stop();
          useSimStore.getState().addLog({
            type: 'transition_fire',
            message: 'No enabled transitions - simulation stopped',
          });
        }
      }, stepIntervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, stepIntervalMs, transitions, places, placeConfig]);

  // Build nodes with simulation data
  const nodes = useMemo(() => {
    const placeNodes = placesToNodes(places).map((node) => {
      const place = node.data.place as Place;
      const nodeType = place.type === 'action' ? 'action' : 'place';

      // Get tokens for this place
      let nodeTokens: Token[] | Record<string, Token[]>;
      if (nodeType === 'action') {
        // For action places, collect subplace tokens
        nodeTokens = {
          in_progress: tokens[`${place.id}::in_progress`] || [],
          success: tokens[`${place.id}::success`] || [],
          failure: tokens[`${place.id}::failure`] || [],
          error: tokens[`${place.id}::error`] || [],
        };
      } else {
        nodeTokens = tokens[place.id] || [];
      }

      return {
        ...node,
        type: nodeType,
        draggable: false,
        data: {
          ...node.data,
          placeConfig,
          simulationMode: true,
          tokens: nodeTokens,
          onInjectToken: handleInjectToken,
          onRemoveToken: handleRemoveToken,
          // Only action places get the configure probability callback
          ...(nodeType === 'action' && { onConfigureProbability: handleConfigureProbability }),
        },
      };
    });

    const transitionNodes = transitionsToNodes(transitions).map((node) => {
      const transition = node.data.transition as Transition;
      const enabled = isTransitionEnabled(transition, tokens, places);

      return {
        ...node,
        draggable: false,
        data: {
          ...node.data,
          simulationMode: true,
          isEnabled: enabled,
          onFire: handleFireTransition,
        },
      };
    });

    return [...placeNodes, ...transitionNodes];
  }, [places, transitions, tokens, placeConfig, handleInjectToken, handleRemoveToken, handleFireTransition, handleConfigureProbability]);

  const edges = useMemo(
    () => connectionsToEdges(transitions, places),
    [transitions, places]
  );

  return (
    <>
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionMode={ConnectionMode.Loose}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
        >
          <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node: Node) => {
              if (node.type === 'transition') return '#000000';
              return '#FFFFFF';
            }}
          />
        </ReactFlow>
      </div>

      {/* Action probability configuration modal */}
      {configuringPlaceId && (
        <ActionProbabilityModal
          placeId={configuringPlaceId}
          currentProbability={getActionProbability(actionProbabilities, configuringPlaceId)}
          onSave={handleSaveProbability}
          onClose={() => setConfiguringPlaceId(null)}
        />
      )}
    </>
  );
}
