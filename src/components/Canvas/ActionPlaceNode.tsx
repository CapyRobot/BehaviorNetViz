import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Place } from '../../store/types';
import { useNetStore } from '../../store/netStore';
import type { PlaceConfigSchema } from '../../store/placeConfig';

interface ActionPlaceNodeProps {
  id: string;
  data: { place: Place; placeConfig?: PlaceConfigSchema };
  selected?: boolean;
}

// Layout constants
const IN_PROGRESS_SIZE = 50;
const RESULT_SIZE = 24;
const GAP = 12;
const RESULT_GAP = 4;

function ActionPlaceNode({ id, data, selected }: ActionPlaceNodeProps) {
  const { place, placeConfig } = data;
  const setSelection = useNetStore((s) => s.setSelection);

  const handleClick = () => {
    setSelection(id, 'place');
  };

  const typeDef = placeConfig?.placeTypes[place.type];
  const typeLabel = typeDef?.label || place.type;

  // Calculate positions for handles
  const inProgressCenterX = IN_PROGRESS_SIZE / 2;
  const inProgressCenterY = IN_PROGRESS_SIZE / 2;

  const resultColumnX = IN_PROGRESS_SIZE + GAP;

  // Result Y positions (center of each result circle)
  const successY = RESULT_SIZE / 2;
  const failureY = RESULT_SIZE + RESULT_GAP + RESULT_SIZE / 2;
  const errorY = (RESULT_SIZE + RESULT_GAP) * 2 + RESULT_SIZE / 2;

  return (
    <div
      className={`action-place-node ${selected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      {/* Label above */}
      <div className="action-label">
        {typeLabel} : {place.id}
      </div>

      <div className="action-content">
        {/* In Progress place - receives incoming arcs */}
        <div className="in-progress-wrapper">
          <div className="place-circle in-progress" />
          <span className="place-sublabel">In Progress</span>
        </div>

        {/* Result places - outgoing arcs only */}
        <div className="result-column">
          <div className="result-row">
            <div className="place-circle result" />
            <span className="result-label success">S</span>
          </div>
          <div className="result-row">
            <div className="place-circle result" />
            <span className="result-label failure">F</span>
          </div>
          <div className="result-row">
            <div className="place-circle result" />
            <span className="result-label error">E</span>
          </div>
        </div>
      </div>

      {/* Handles positioned absolutely relative to node */}
      {/* In Progress handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ left: inProgressCenterX, top: 0 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ left: 0, top: inProgressCenterY }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ left: inProgressCenterX, top: IN_PROGRESS_SIZE }}
      />

      {/* Result handles - positioned on right side of each result circle */}
      <Handle
        type="source"
        position={Position.Right}
        id="success"
        style={{ left: resultColumnX + RESULT_SIZE, top: successY }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="failure"
        style={{ left: resultColumnX + RESULT_SIZE, top: failureY }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="error"
        style={{ left: resultColumnX + RESULT_SIZE, top: errorY }}
      />
    </div>
  );
}

export default memo(ActionPlaceNode);
