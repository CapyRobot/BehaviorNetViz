import { useState } from 'react';
import { useNetStore } from '../../store/netStore';
import type { Transition } from '../../store/types';

interface Props {
  transition: Transition;
  enableActorsFeature: boolean;
}

export default function TransitionInspector({ transition, enableActorsFeature }: Props) {
  const updateTransition = useNetStore((s) => s.updateTransition);
  const deleteTransition = useNetStore((s) => s.deleteTransition);
  const transitions = useNetStore((s) => s.transitions);
  const places = useNetStore((s) => s.places);
  const actors = useNetStore((s) => s.actors);

  const [editingId, setEditingId] = useState(false);
  const [newId, setNewId] = useState(transition.id);
  const [idError, setIdError] = useState<string | null>(null);

  const handleIdChange = (value: string) => {
    setNewId(value);
    // Validate: no spaces, no special characters except underscore
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      setIdError('ID must start with a letter and contain only letters, numbers, and underscores');
    } else if (value !== transition.id && transitions.some(t => t.id === value)) {
      setIdError('ID already exists');
    } else if (value !== transition.id && places.some(p => p.id === value)) {
      setIdError('ID already used by a place');
    } else {
      setIdError(null);
    }
  };

  const handleIdSave = () => {
    if (idError || newId === transition.id) {
      setEditingId(false);
      setNewId(transition.id);
      return;
    }

    // Update the transition ID
    updateTransition(transition.id, { id: newId });
    setEditingId(false);
  };

  const handlePriorityChange = (priority: string) => {
    const value = priority ? parseInt(priority, 10) : 1;
    updateTransition(transition.id, { priority: value });
  };

  const handleDelete = () => {
    if (confirm('Delete this transition?')) {
      deleteTransition(transition.id);
    }
  };

  const updateTokenFilter = (index: number, filter: string) => {
    const newTo = [...transition.to];
    newTo[index] = { ...newTo[index], tokenFilter: filter || undefined };
    updateTransition(transition.id, { to: newTo });
  };

  const removeOutput = (index: number) => {
    const newTo = transition.to.filter((_, i) => i !== index);
    updateTransition(transition.id, { to: newTo });
  };

  const removeInput = (placeId: string) => {
    const newFrom = transition.from.filter((f) => f !== placeId);
    updateTransition(transition.id, { from: newFrom });
  };

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
                    setNewId(transition.id);
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
            {transition.id}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Priority
        </label>
        <input
          type="number"
          min="1"
          value={transition.priority || 1}
          onChange={(e) => handlePriorityChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Higher priority transitions fire first
        </p>
      </div>

      {/* Input places (from) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Input Places ({transition.from.length})
        </label>
        {transition.from.length === 0 ? (
          <p className="text-xs text-gray-500 italic">
            Connect places to this transition
          </p>
        ) : (
          <div className="space-y-1">
            {transition.from.map((placeId) => (
              <div
                key={placeId}
                className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-sm"
              >
                <span className="truncate">{placeId}</span>
                <button
                  onClick={() => removeInput(placeId)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output places (to) with token filters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Output Places ({transition.to.length})
        </label>
        {transition.to.length === 0 ? (
          <p className="text-xs text-gray-500 italic">
            Connect this transition to places
          </p>
        ) : (
          <div className="space-y-2">
            {transition.to.map((output, index) => (
              <div
                key={`${output.to}-${index}`}
                className="bg-gray-50 p-2 rounded"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate">{output.to}</span>
                  <button
                    onClick={() => removeOutput(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    x
                  </button>
                </div>
                {enableActorsFeature && (
                  <div className="mt-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      Token Filter (actor type)
                    </label>
                    <input
                      type="text"
                      value={output.tokenFilter || ''}
                      onChange={(e) => updateTokenFilter(index, e.target.value)}
                      placeholder="e.g., user::Vehicle"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {enableActorsFeature && actors.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Available actors: {actors.map((a) => a.id).join(', ')}
          </p>
        )}
      </div>

      <div className="pt-4 border-t">
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          Delete Transition
        </button>
      </div>
    </div>
  );
}
