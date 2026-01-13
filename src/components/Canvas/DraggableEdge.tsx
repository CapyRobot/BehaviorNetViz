import { useState, useCallback, CSSProperties } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
} from '@xyflow/react';

export interface DraggableEdgeData {
  label?: string;
  controlOffset?: { x: number; y: number };
  onControlPointChange?: (edgeId: string, offset: { x: number; y: number }) => void;
}

interface DraggableEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  style?: CSSProperties;
  markerEnd?: string;
  data?: DraggableEdgeData;
}

// Get a quadratic bezier path through a control point
function getQuadraticBezierPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  controlX: number,
  controlY: number
): string {
  return `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;
}

export default function DraggableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
}: DraggableEdgeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localOffset, setLocalOffset] = useState(data?.controlOffset || { x: 0, y: 0 });

  // Use either persisted offset from data or local offset
  const offset = data?.controlOffset || localOffset;

  // Calculate the base midpoint
  const baseMidX = (sourceX + targetX) / 2;
  const baseMidY = (sourceY + targetY) / 2;

  // Apply user offset to control point
  const controlX = baseMidX + offset.x;
  const controlY = baseMidY + offset.y;

  // Simple quadratic path for cleaner look
  const simplePath = getQuadraticBezierPath(
    sourceX, sourceY,
    targetX, targetY,
    controlX, controlY
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startOffset = { ...offset };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const newOffset = {
        x: startOffset.x + dx,
        y: startOffset.y + dy,
      };
      setLocalOffset(newOffset);
      // Notify parent of change if callback provided
      data?.onControlPointChange?.(id, newOffset);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [offset, id, data]);

  // Black stroke style for classical Petri net look
  const edgeStyle = {
    ...style,
    stroke: '#000000',
    strokeWidth: 1.5,
  };

  return (
    <>
      <BaseEdge path={simplePath} markerEnd={markerEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        {/* Control point handle - visible on hover */}
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${controlX}px, ${controlY}px)`,
            pointerEvents: 'all',
            zIndex: 1000,
          }}
        >
          <div
            onMouseDown={handleMouseDown}
            className={`w-2.5 h-2.5 rounded-full cursor-move border transition-all ${
              isDragging
                ? 'bg-blue-500 border-blue-600 scale-125'
                : 'bg-white border-gray-400 hover:border-blue-500 hover:bg-blue-100'
            }`}
            title="Drag to adjust edge curve"
          />
        </div>
        {/* Label */}
        {data?.label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${controlX}px, ${controlY - 10}px)`,
              fontSize: 10,
              pointerEvents: 'all',
            }}
            className="nodrag nopan bg-white px-1 rounded text-gray-600 shadow-sm"
          >
            {data.label}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
