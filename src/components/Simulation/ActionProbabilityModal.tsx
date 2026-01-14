import { useState, useEffect } from 'react';
import type { ActionOutcomeProbability } from '../../store/types';

interface Props {
  placeId: string;
  currentProbability: ActionOutcomeProbability;
  onSave: (placeId: string, probability: ActionOutcomeProbability) => void;
  onClose: () => void;
}

const DEFAULT_PROBABILITY: ActionOutcomeProbability = {
  success: 100,
  failure: 0,
  error: 0,
};

export default function ActionProbabilityModal({ placeId, currentProbability, onSave, onClose }: Props) {
  const [success, setSuccess] = useState(currentProbability.success);
  const [failure, setFailure] = useState(currentProbability.failure);
  const [error, setError] = useState(currentProbability.error);

  // Recalculate when props change
  useEffect(() => {
    setSuccess(currentProbability.success);
    setFailure(currentProbability.failure);
    setError(currentProbability.error);
  }, [currentProbability]);

  const total = success + failure + error;

  const handleSave = () => {
    // Normalize to 100%
    const normalized: ActionOutcomeProbability = total > 0 ? {
      success: Math.round((success / total) * 100),
      failure: Math.round((failure / total) * 100),
      error: Math.round((error / total) * 100),
    } : DEFAULT_PROBABILITY;

    onSave(placeId, normalized);
    onClose();
  };

  const handleReset = () => {
    setSuccess(100);
    setFailure(0);
    setError(0);
  };

  return (
    <div className="probability-modal-overlay" onClick={onClose}>
      <div className="probability-modal" onClick={(e) => e.stopPropagation()}>
        <div className="probability-modal-header">
          <h3>Action Probabilities: {placeId}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="probability-modal-content">
          <p className="text-sm text-gray-600 mb-4">
            Configure the probability of each outcome when a token enters this action place.
            Values will be normalized to sum to 100%.
          </p>

          <div className="probability-row">
            <label className="success-label">Success</label>
            <input
              type="range"
              min="0"
              max="100"
              value={success}
              onChange={(e) => setSuccess(Number(e.target.value))}
              className="probability-slider success"
            />
            <span className="probability-value">{success}%</span>
          </div>

          <div className="probability-row">
            <label className="failure-label">Failure</label>
            <input
              type="range"
              min="0"
              max="100"
              value={failure}
              onChange={(e) => setFailure(Number(e.target.value))}
              className="probability-slider failure"
            />
            <span className="probability-value">{failure}%</span>
          </div>

          <div className="probability-row">
            <label className="error-label">Error</label>
            <input
              type="range"
              min="0"
              max="100"
              value={error}
              onChange={(e) => setError(Number(e.target.value))}
              className="probability-slider error"
            />
            <span className="probability-value">{error}%</span>
          </div>

          {total !== 100 && (
            <p className="text-sm text-yellow-600 mt-2">
              Total: {total}% (will be normalized to 100%)
            </p>
          )}
        </div>

        <div className="probability-modal-footer">
          <button className="reset-btn" onClick={handleReset}>Reset to Default</button>
          <div className="space-x-2">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button className="save-btn" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
