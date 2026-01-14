import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Place, Token } from '../../store/types';
import { useNetStore } from '../../store/netStore';
import type { PlaceConfigSchema } from '../../store/placeConfig';

interface PlaceNodeProps {
  id: string;
  data: {
    place: Place;
    placeConfig?: PlaceConfigSchema;
    simulationMode?: boolean;
    tokens?: Token[];
    onInjectToken?: (placeId: string) => void;
    onRemoveToken?: (placeId: string) => void;
  };
  selected?: boolean;
}

function PlaceNode({ id, data, selected }: PlaceNodeProps) {
  const { place, placeConfig, simulationMode, tokens = [], onInjectToken, onRemoveToken } = data;
  const setSelection = useNetStore((s) => s.setSelection);

  const handleClick = () => {
    if (!simulationMode) {
      setSelection(id, 'place');
    }
  };

  const typeDef = placeConfig?.placeTypes[place.type];
  const typeLabel = typeDef?.label || place.type;
  const hideTypeLabel = typeDef?.hideTypeLabel;

  const handleInject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInjectToken?.(id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveToken?.(id);
  };

  return (
    <div
      className={`place-node ${selected ? 'selected' : ''} ${simulationMode ? 'simulation-mode' : ''}`}
      onClick={handleClick}
    >
      {/* Label above the place: type : id (or just id if hideTypeLabel) */}
      <div className="place-label">
        {hideTypeLabel ? place.id : `${typeLabel} : ${place.id}`}
      </div>

      {/* The white circle */}
      <div className="place-circle">
        {/* Token count display */}
        {simulationMode && tokens.length > 0 && (
          <div className="token-count">{tokens.length}</div>
        )}

        {/* Token control buttons in simulation mode */}
        {simulationMode && (
          <>
            <button
              className="inject-button nodrag nopan"
              onClick={handleInject}
              onMouseDown={(e) => e.stopPropagation()}
              title="Inject token"
            >
              +
            </button>
            {tokens.length > 0 && (
              <button
                className="remove-button nodrag nopan"
                onClick={handleRemove}
                onMouseDown={(e) => e.stopPropagation()}
                title="Remove token"
              >
                −
              </button>
            )}
          </>
        )}

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
