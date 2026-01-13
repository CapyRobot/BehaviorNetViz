import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Place } from '../../store/types';
import { useNetStore } from '../../store/netStore';
import type { PlaceConfigSchema } from '../../store/placeConfig';

interface PlaceNodeProps {
  id: string;
  data: { place: Place; placeConfig?: PlaceConfigSchema };
  selected?: boolean;
}

function PlaceNode({ id, data, selected }: PlaceNodeProps) {
  const { place, placeConfig } = data;
  const setSelection = useNetStore((s) => s.setSelection);

  const handleClick = () => {
    setSelection(id, 'place');
  };

  const typeDef = placeConfig?.placeTypes[place.type];
  const typeLabel = typeDef?.label || place.type;
  const hideTypeLabel = typeDef?.hideTypeLabel;

  return (
    <div
      className={`place-node ${selected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      {/* Label above the place: type : id (or just id if hideTypeLabel) */}
      <div className="place-label">
        {hideTypeLabel ? place.id : `${typeLabel} : ${place.id}`}
      </div>

      {/* The white circle */}
      <div className="place-circle">
        {/* All handles are "source" type for consistent drag behavior */}
        <Handle type="source" position={Position.Top} id="top" />
        <Handle type="source" position={Position.Right} id="right" />
        <Handle type="source" position={Position.Bottom} id="bottom" />
        <Handle type="source" position={Position.Left} id="left" />
      </div>
    </div>
  );
}

export default memo(PlaceNode);
