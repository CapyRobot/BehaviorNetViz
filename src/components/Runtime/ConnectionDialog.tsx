import React, { useState } from 'react';
import { useRuntimeStore } from '../../store/runtimeStore';

interface ConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export const ConnectionDialog: React.FC<ConnectionDialogProps> = ({
  isOpen,
  onClose,
  onConnect,
}) => {
  const { serverUrl, connectionState, error, connect } = useRuntimeStore();
  const [url, setUrl] = useState(serverUrl);

  if (!isOpen) return null;

  const handleConnect = () => {
    connect(url);
    // Wait a bit for connection to establish
    setTimeout(() => {
      if (useRuntimeStore.getState().connectionState === 'connected') {
        onConnect();
      }
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Connect to Runtime Server</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="server-url">Server URL</label>
            <input
              id="server-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ws://localhost:8080"
              autoFocus
            />
            <small className="form-hint">
              Enter the WebSocket URL of the BehaviorNet runtime server
            </small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {connectionState === 'connecting' && (
            <div className="info-message">
              Connecting...
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={connectionState === 'connecting'}
          >
            {connectionState === 'connecting' ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
};
