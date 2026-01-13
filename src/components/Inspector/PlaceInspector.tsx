import { useState } from 'react';
import { useNetStore } from '../../store/netStore';
import type { Place } from '../../store/types';
import type { PlaceConfigSchema, ParamDefinition } from '../../store/placeConfig';

interface Props {
  place: Place;
  placeConfig: PlaceConfigSchema;
}

export default function PlaceInspector({ place, placeConfig }: Props) {
  const updatePlace = useNetStore((s) => s.updatePlace);
  const deletePlace = useNetStore((s) => s.deletePlace);
  const places = useNetStore((s) => s.places);
  const transitions = useNetStore((s) => s.transitions);
  const updateTransition = useNetStore((s) => s.updateTransition);
  const actors = useNetStore((s) => s.actors);
  const actions = useNetStore((s) => s.actions);

  const [editingId, setEditingId] = useState(false);
  const [newId, setNewId] = useState(place.id);
  const [idError, setIdError] = useState<string | null>(null);

  const typeDef = placeConfig.placeTypes[place.type];

  const handleIdChange = (value: string) => {
    setNewId(value);
    // Validate: no spaces, no special characters except underscore
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      setIdError('ID must start with a letter and contain only letters, numbers, and underscores');
    } else if (value !== place.id && places.some(p => p.id === value)) {
      setIdError('ID already exists');
    } else {
      setIdError(null);
    }
  };

  const handleIdSave = () => {
    if (idError || newId === place.id) {
      setEditingId(false);
      setNewId(place.id);
      return;
    }

    const oldId = place.id;

    // Update all transitions that reference this place
    transitions.forEach(t => {
      let updated = false;
      const newFrom = t.from.map(f => {
        if (f === oldId || f.startsWith(`${oldId}::`)) {
          updated = true;
          return f.replace(oldId, newId);
        }
        return f;
      });
      const newTo = t.to.map(o => {
        if (o.to === oldId) {
          updated = true;
          return { ...o, to: newId };
        }
        return o;
      });
      if (updated) {
        updateTransition(t.id, { from: newFrom, to: newTo });
      }
    });

    // Update the place ID
    updatePlace(oldId, { id: newId });
    setEditingId(false);
  };

  const handleDescriptionChange = (description: string) => {
    updatePlace(place.id, { description: description || undefined });
  };

  const handleCapacityChange = (capacity: string) => {
    const value = capacity ? parseInt(capacity, 10) : undefined;
    updatePlace(place.id, { tokenCapacity: value });
  };

  const handleDelete = () => {
    if (confirm('Delete this place?')) {
      deletePlace(place.id);
    }
  };

  // Update a single parameter
  const updateParam = (key: string, value: unknown) => {
    updatePlace(place.id, {
      params: { ...place.params, [key]: value },
    });
  };

  // Get color classes based on place type
  const getColorClasses = () => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      green: { bg: 'bg-green-50', text: 'text-green-800' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-800' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-800' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-800' },
      red: { bg: 'bg-red-50', text: 'text-red-800' },
      gray: { bg: 'bg-gray-50', text: 'text-gray-800' },
    };
    return colorMap[typeDef?.color || 'gray'] || colorMap.gray;
  };

  const colors = getColorClasses();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ID
        </label>
        {editingId ? (
          <div className="space-y-1">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newId}
                onChange={(e) => handleIdChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleIdSave();
                  if (e.key === 'Escape') {
                    setEditingId(false);
                    setNewId(place.id);
                    setIdError(null);
                  }
                }}
                autoFocus
                className={`flex-1 px-3 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 ${
                  idError ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                onClick={handleIdSave}
                disabled={!!idError}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
            {idError && <p className="text-xs text-red-500">{idError}</p>}
          </div>
        ) : (
          <div
            onClick={() => setEditingId(true)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm cursor-pointer hover:border-blue-500"
          >
            {place.id}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type
        </label>
        <input
          type="text"
          value={typeDef?.label || place.type}
          disabled
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 text-sm capitalize"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          value={place.description || ''}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Add a description..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Token Capacity (optional)
        </label>
        <input
          type="number"
          min="1"
          value={place.tokenCapacity || ''}
          onChange={(e) => handleCapacityChange(e.target.value)}
          placeholder="Unlimited"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Type-specific parameters from config */}
      {typeDef && Object.keys(typeDef.params).length > 0 && (
        <div className={`space-y-3 p-3 ${colors.bg} rounded-md`}>
          <h4 className={`font-medium text-sm ${colors.text}`}>
            {typeDef.label} Config
          </h4>

          {Object.entries(typeDef.params).map(([key, paramDef]) => (
            <ParamField
              key={key}
              name={key}
              paramDef={paramDef}
              value={place.params[key]}
              onChange={(value) => updateParam(key, value)}
              actors={actors}
              actions={actions}
            />
          ))}
        </div>
      )}

      <div className="pt-4 border-t">
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          Delete Place
        </button>
      </div>
    </div>
  );
}

// Generic field component for rendering parameters based on type
function ParamField({
  name,
  paramDef,
  value,
  onChange,
  actors,
  actions,
}: {
  name: string;
  paramDef: ParamDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  actors: { id: string }[];
  actions: { id: string }[];
}) {
  const label = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase());

  switch (paramDef.type) {
    case 'string':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {label}
            {paramDef.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={paramDef.description}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      );

    case 'integer':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {label}
            {paramDef.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="number"
            min={paramDef.min}
            max={paramDef.max}
            value={(value as number) ?? paramDef.default ?? ''}
            onChange={(e) =>
              onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      );

    case 'boolean':
      return (
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={(value as boolean) || false}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-xs text-gray-700">{label}</span>
        </label>
      );

    case 'enum':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {label}
            {paramDef.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={(value as string) || (paramDef.default as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {paramDef.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case 'array':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {label} (comma-separated)
            {paramDef.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={((value as string[]) || []).join(', ')}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder={paramDef.description}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
          {paramDef.items?.type === 'actorRef' && actors.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Available actors: {actors.map((a) => a.id).join(', ')}
            </div>
          )}
        </div>
      );

    case 'actorRef':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {label}
            {paramDef.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g., user::ActorType"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
          {actors.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Available: {actors.map((a) => a.id).join(', ')}
            </div>
          )}
        </div>
      );

    case 'actionRef':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {label}
            {paramDef.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g., user::action_name"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
          {actions.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Available: {actions.map((a) => a.id).join(', ')}
            </div>
          )}
        </div>
      );

    default:
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {label}
          </label>
          <input
            type="text"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      );
  }
}
