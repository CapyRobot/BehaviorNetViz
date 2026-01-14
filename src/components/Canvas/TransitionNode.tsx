import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Transition } from '../../store/types';
import { useNetStore } from '../../store/netStore';

interface TransitionNodeProps {
  id: string;
  data: {
    transition: Transition;
    simulationMode?: boolean;
    isEnabled?: boolean;
    onFire?: (transitionId: string) => void;
  };
  selected?: boolean;
}

function TransitionNode({ id, data, selected }: TransitionNodeProps) {
  const { transition, simulationMode, isEnabled, onFire } = data;
  const setSelection = useNetStore((s) => s.setSelection);

  const handleClick = () => {
    if (!simulationMode) {
      setSelection(id, 'transition');
    }
  };

  const handleFire = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFire?.(id);
  };

  const priority = transition.priority || 1;
  const showPriority = priority !== 1; // Only show if not default

  return (
    <div
      className={`transition-node ${selected ? 'selected' : ''} ${simulationMode ? 'simulation-mode' : ''} ${isEnabled ? 'enabled' : ''}`}
      onClick={handleClick}
      title={`${transition.id} (Priority: ${priority})`}
    >
      {/* Priority label in center */}
      {showPriority && (
        <span className="transition-priority">p{priority}</span>
      )}

      {/* Fire button for enabled transitions in simulation mode */}
      {simulationMode && isEnabled && (
        <button
          className="fire-button nodrag nopan"
          onClick={handleFire}
          onMouseDown={(e) => e.stopPropagation()}
          title="Fire transition"
        >
          ▶
        </button>
      )}

      {/* All handles are "source" type for consistent drag behavior */}
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />
    </div>
  );
}

export default memo(TransitionNode);
