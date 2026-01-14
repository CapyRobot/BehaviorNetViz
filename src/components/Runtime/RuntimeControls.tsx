import React, { useState } from 'react';
import { useRuntimeStore } from '../../store/runtimeStore';
import { useNetStore } from '../../store/netStore';

export const RuntimeControls: React.FC = () => {
  const { stats, connectionState, disconnect, injectToken } = useRuntimeStore();
  const { places } = useNetStore();
  const [selectedEntrypoint, setSelectedEntrypoint] = useState<string>('');
  const [showInjectDialog, setShowInjectDialog] = useState(false);

  // Get entrypoint places
  const entrypoints = places.filter((p) => p.type === 'entrypoint');

  const handleInject = () => {
    if (selectedEntrypoint) {
      injectToken(selectedEntrypoint, {});
      setShowInjectDialog(false);
    }
  };

  if (connectionState !== 'connected') {
    return null;
  }

  return (
    <div className="runtime-controls">
      <div className="runtime-stats">
        <div className="stat-item">
          <span className="stat-label">Epoch</span>
          <span className="stat-value">{stats.epoch}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Transitions</span>
          <span className="stat-value">{stats.transitionsFired}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active Tokens</span>
          <span className="stat-value">{stats.activeTokens}</span>
        </div>
      </div>

      <div className="runtime-actions">
        {entrypoints.length > 0 && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowInjectDialog(true)}
          >
            Inject Token
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={disconnect}>
          Disconnect
        </button>
      </div>

      {showInjectDialog && (
        <div className="modal-overlay" onClick={() => setShowInjectDialog(false)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Inject Token</h3>
              <button className="modal-close" onClick={() => setShowInjectDialog(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Entrypoint</label>
                <select
                  value={selectedEntrypoint}
                  onChange={(e) => setSelectedEntrypoint(e.target.value)}
                >
                  <option value="">Select an entrypoint...</option>
                  {entrypoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowInjectDialog(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleInject}
                disabled={!selectedEntrypoint}
              >
                Inject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
