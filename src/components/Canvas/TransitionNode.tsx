import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Transition } from '../../store/types';
import { useNetStore } from '../../store/netStore';

interface TransitionNodeProps {
  id: string;
  data: { transition: Transition };
  selected?: boolean;
}

function TransitionNode({ id, data, selected }: TransitionNodeProps) {
  const { transition } = data;
  const setSelection = useNetStore((s) => s.setSelection);

  const handleClick = () => {
    setSelection(id, 'transition');
  };

  return (
    <div
      className={`transition-node ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      title={`${transition.id} (Priority: ${transition.priority || 1})`}
    >
      {/* All handles are "source" type for consistent drag behavior */}
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />
    </div>
  );
}

export default memo(TransitionNode);
