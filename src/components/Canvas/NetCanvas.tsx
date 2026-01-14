import { useCallback, useMemo, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Connection,
  NodeChange,
  BackgroundVariant,
  MarkerType,
  ConnectionMode,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PlaceNode from './PlaceNode';
import ActionPlaceNode from './ActionPlaceNode';
import TransitionNode from './TransitionNode';
import DraggableEdge from './DraggableEdge';
import {
  useNetStore,
  placesToNodes,
  transitionsToNodes,
} from '../../store/netStore';
import type { Place, Transition } from '../../store/types';
import type { PlaceConfigSchema } from '../../store/placeConfig';

const nodeTypes = {
  place: PlaceNode,
  action: ActionPlaceNode,
  transition: TransitionNode,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes: Record<string, any> = {
  draggable: DraggableEdge,
};

// Default edge options with arrow - classical Petri net style
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
  type: 'draggable',
};

interface Props {
  placeConfig: PlaceConfigSchema;
  isRuntimeMode?: boolean;
}

// Calculate best handles based on relative positions
// sourceType/targetType: 'place' | 'action' | 'transition'
function getBestHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  sourceType?: string,
  targetType?: string
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let sourceHandle: string;
  let targetHandle: string;

  if (absDx > absDy) {
    if (dx > 0) {
      sourceHandle = 'right';
      targetHandle = 'left';
    } else {
      sourceHandle = 'left';
      targetHandle = 'right';
    }
  } else {
    if (dy > 0) {
      sourceHandle = 'bottom';
      targetHandle = 'top';
    } else {
      sourceHandle = 'top';
      targetHandle = 'bottom';
    }
  }

  // Action places only have 'top', 'left', 'bottom' handles for incoming arcs
  // They don't have a 'right' handle on In Progress
  if (targetType === 'action' && targetHandle === 'right') {
    // Pick the best alternative based on position
    if (Math.abs(dy) < 20) {
      targetHandle = 'left'; // Horizontal - wrap around
    } else if (dy > 0) {
      targetHandle = 'top';
    } else {
      targetHandle = 'bottom';
    }
  }

  // For action places as source (non-subplace), they have limited handles
  if (sourceType === 'action' && sourceHandle === 'right') {
    // In Progress section doesn't have right handle
    if (Math.abs(dy) < 20) {
      sourceHandle = 'left';
    } else if (dy > 0) {
      sourceHandle = 'bottom';
    } else {
      sourceHandle = 'top';
    }
  }

  return { sourceHandle, targetHandle };
}

// Convert transitions to edges with smart handle selection
function connectionsToEdges(
  transitions: Transition[],
  places: Place[],
  edgeOffsets: Record<string, { x: number; y: number }>,
  onControlPointChange: (edgeId: string, offset: { x: number; y: number }) => void
): Edge[] {
  const edges: Edge[] = [];
  const placeMap = new Map(places.map((p) => [p.id, p]));

  transitions.forEach((transition) => {
    // Input arcs: place -> transition
    transition.from.forEach((fromPlaceId) => {
      let sourceId = fromPlaceId;
      let sourceHandle: string | undefined;

      // Handle subplace IDs like "place_1::success"
      if (fromPlaceId.includes('::')) {
        const [placeId, subplace] = fromPlaceId.split('::');
        sourceId = placeId;
        sourceHandle = subplace;
      }

      const sourcePlace = placeMap.get(sourceId);
      if (sourcePlace) {
        // Determine source type for handle selection
        const sourceNodeType = sourcePlace.type === 'action' ? 'action' : 'place';

        const handles = getBestHandles(
          sourcePlace.position,
          transition.position,
          sourceNodeType,
          'transition'
        );

        const edgeId = `${fromPlaceId}->${transition.id}`;
        edges.push({
          id: edgeId,
          source: sourceId,
          sourceHandle: sourceHandle || handles.sourceHandle,
          target: transition.id,
          targetHandle: handles.targetHandle,
          type: 'draggable',
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#000000' },
          data: {
            controlOffset: edgeOffsets[edgeId],
            onControlPointChange,
          },
        });
      }
    });

    // Output arcs: transition -> place
    transition.to.forEach((output) => {
      const targetPlace = placeMap.get(output.to);
      if (targetPlace) {
        // Determine target type for handle selection
        const targetNodeType = targetPlace.type === 'action' ? 'action' : 'place';

        const handles = getBestHandles(
          transition.position,
          targetPlace.position,
          'transition',
          targetNodeType
        );

        const edgeId = `${transition.id}->${output.to}`;
        edges.push({
          id: edgeId,
          source: transition.id,
          sourceHandle: handles.sourceHandle,
          target: output.to,
          targetHandle: handles.targetHandle,
          type: 'draggable',
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#000000' },
          data: {
            label: output.tokenFilter || undefined,
            controlOffset: edgeOffsets[edgeId],
            onControlPointChange,
          },
        });
      }
    });
  });

  return edges;
}

export default function NetCanvas({ placeConfig, isRuntimeMode = false }: Props) {
  const places = useNetStore((s) => s.places);
  const transitions = useNetStore((s) => s.transitions);
  const addPlace = useNetStore((s) => s.addPlace);
  const addTransition = useNetStore((s) => s.addTransition);
  const addConnection = useNetStore((s) => s.addConnection);
  const updateNodePosition = useNetStore((s) => s.updateNodePosition);
  const updateEdgeOffset = useNetStore((s) => s.updateEdgeOffset);
  const edgeOffsets = useNetStore((s) => s.edgeOffsets);
  const setSelection = useNetStore((s) => s.setSelection);
  const selectedId = useNetStore((s) => s.selectedId);

  const { screenToFlowPosition } = useReactFlow();

  // Callback for edge control point changes
  const onControlPointChange = useCallback(
    (edgeId: string, offset: { x: number; y: number }) => {
      updateEdgeOffset(edgeId, offset);
    },
    [updateEdgeOffset]
  );

  // Convert store data to React Flow format
  const nodes = useMemo(() => {
    const placeNodes = placesToNodes(places).map((node) => {
      const place = node.data.place as Place;
      // Use 'action' type for action places, 'place' for all others
      const nodeType = place.type === 'action' ? 'action' : 'place';
      return {
        ...node,
        type: nodeType,
        data: { ...node.data, placeConfig, isRuntimeMode },
        selected: node.id === selectedId,
      };
    });
    const transitionNodes = transitionsToNodes(transitions).map((node) => ({
      ...node,
      selected: node.id === selectedId,
    }));
    return [...placeNodes, ...transitionNodes];
  }, [places, transitions, selectedId, placeConfig, isRuntimeMode]);

  const edges = useMemo(
    () => connectionsToEdges(transitions, places, edgeOffsets, onControlPointChange),
    [transitions, places, edgeOffsets, onControlPointChange]
  );

  // Handle node position changes (drag)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && 'position' in change && change.position) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [updateNodePosition]
  );

  // Handle new connections - determine direction based on node types
  // All handles are now "source" type, so connection.source = where drag started
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // With all source handles, connection.source is always where the drag started
      const fromNodeId = connection.source;
      const toNodeId = connection.target;
      const fromHandle = connection.sourceHandle;

      const fromNode = nodes.find((n) => n.id === fromNodeId);
      const toNode = nodes.find((n) => n.id === toNodeId);

      if (!fromNode || !toNode) return;

      const fromIsPlace = fromNode.type === 'place' || fromNode.type === 'action';
      const toIsPlace = toNode.type === 'place' || toNode.type === 'action';

      // If both are places, create a transition between them
      if (fromIsPlace && toIsPlace) {
        const fromPos = places.find(p => p.id === fromNodeId)?.position || { x: 0, y: 0 };
        const toPos = places.find(p => p.id === toNodeId)?.position || { x: 0, y: 0 };
        const midPosition = {
          x: (fromPos.x + toPos.x) / 2,
          y: (fromPos.y + toPos.y) / 2,
        };

        const transitionId = addTransition(midPosition);

        // Handle subplace for from node (e.g., 'success', 'failure', 'error')
        let actualFromId = fromNodeId;
        const standardHandles = ['top', 'right', 'bottom', 'left'];
        // Check if it's a subplace handle (success, failure, error, or their variants)
        if (fromHandle && !standardHandles.includes(fromHandle)) {
          // Extract base subplace name (e.g., 'success-top' -> 'success')
          const baseHandle = fromHandle.split('-')[0];
          if (['success', 'failure', 'error'].includes(baseHandle)) {
            actualFromId = `${fromNodeId}::${baseHandle}`;
          }
        }

        // Check if from is an action place being dragged from a non-subplace handle
        // Action places' In Progress circle should only RECEIVE arcs, not emit them
        const fromIsAction = fromNode.type === 'action';
        const isFromSubplace = actualFromId.includes('::');

        if (fromIsAction && !isFromSubplace) {
          // Dragging from action's In Progress to another place:
          // Swap direction: toNode -> transition -> action place (In Progress receives)
          addConnection(toNodeId, transitionId);
          addConnection(transitionId, fromNodeId);
        } else {
          addConnection(actualFromId, transitionId);
          addConnection(transitionId, toNodeId);
        }
        return;
      }

      if (!fromIsPlace && !toIsPlace) return; // Invalid: transition to transition

      // Handle subplace connections (from action places)
      const standardHandles = ['top', 'right', 'bottom', 'left'];
      const subplaceHandles = ['success', 'failure', 'error'];

      // Check if this is an action place with a non-subplace handle
      const fromIsAction = fromNode.type === 'action';
      const toIsAction = toNode.type === 'action';

      // Determine if the handle is a subplace handle
      let isSubplaceHandle = false;
      let baseHandle = '';
      if (fromHandle && !standardHandles.includes(fromHandle)) {
        baseHandle = fromHandle.split('-')[0];
        isSubplaceHandle = subplaceHandles.includes(baseHandle);
      }

      // Action places can only be sources via their subplace handles
      // If dragging from action place's In Progress handles to a transition,
      // swap the direction (treat as transition -> action place)
      if (fromIsAction && !isSubplaceHandle && !toIsPlace) {
        // User dragged from action place's In Progress to transition
        // Swap: make it transition -> action place (incoming arc)
        addConnection(toNodeId, fromNodeId);
        return;
      }

      // If dragging from transition to action place, that's valid (incoming arc)
      if (!fromIsPlace && toIsAction) {
        addConnection(fromNodeId, toNodeId);
        return;
      }

      // Build the actual source ID (with subplace if applicable)
      let actualFromId = fromNodeId;
      if (fromIsPlace && isSubplaceHandle) {
        actualFromId = `${fromNodeId}::${baseHandle}`;
      }

      addConnection(actualFromId, toNodeId);
    },
    [nodes, places, addConnection, addTransition]
  );

  // Handle drop from sidebar
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/bnet-type');
      const nodeType = event.dataTransfer.getData('application/bnet-node-type');

      if (!type) return;

      // Convert screen coordinates to flow coordinates (accounts for zoom/pan)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (nodeType === 'transition') {
        addTransition(position);
      } else {
        addPlace(type, position, placeConfig);
      }
    },
    [addPlace, addTransition, placeConfig, screenToFlowPosition]
  );

  const onPaneClick = useCallback(() => {
    setSelection(null, null);
  }, [setSelection]);

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        connectionMode={ConnectionMode.Loose}
      >
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node: Node) => {
            if (node.type === 'transition') return '#000000';
            return '#FFFFFF';
          }}
        />
      </ReactFlow>
    </div>
  );
}
