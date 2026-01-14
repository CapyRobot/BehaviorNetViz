import { useSimStore } from '../../store/simStore';
import { useNetStore } from '../../store/netStore';
import { executeStep, getEnabledTransitions } from '../../store/simEngine';
import type { PlaceConfigSchema } from '../../store/placeConfig';

interface Props {
  placeConfig: PlaceConfigSchema;
}

export default function SimControls({ placeConfig }: Props) {
  const isRunning = useSimStore((s) => s.isRunning);
  const stepIntervalMs = useSimStore((s) => s.stepIntervalMs);
  const tokens = useSimStore((s) => s.tokens);
  const lastFiredTime = useSimStore((s) => s.lastFiredTime);
  const start = useSimStore((s) => s.start);
  const stop = useSimStore((s) => s.stop);
  const reset = useSimStore((s) => s.reset);
  const setStepInterval = useSimStore((s) => s.setStepInterval);

  const places = useNetStore((s) => s.places);
  const transitions = useNetStore((s) => s.transitions);

  const enabledTransitions = getEnabledTransitions(transitions, tokens, places, lastFiredTime);

  const handleStep = () => {
    if (enabledTransitions.length === 0) {
      useSimStore.getState().addLog({
        type: 'transition_fire',
        message: 'No enabled transitions',
      });
      return;
    }
    executeStep(transitions, places, placeConfig, useSimStore.getState());
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStepInterval(parseInt(e.target.value, 10));
  };

  // Calculate total tokens
  const totalTokens = Object.values(tokens).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="sim-controls">
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <button
            onClick={start}
            className="play-btn"
            disabled={enabledTransitions.length === 0}
            title="Start automatic execution"
          >
            ▶ Play
          </button>
        ) : (
          <button onClick={stop} className="pause-btn" title="Pause execution">
            ⏸ Pause
          </button>
        )}

        <button
          onClick={handleStep}
          className="step-btn"
          disabled={isRunning || enabledTransitions.length === 0}
          title="Execute one step"
        >
          ⏭ Step
        </button>

        <button onClick={reset} className="reset-btn" title="Reset simulation">
          ↺ Reset
        </button>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <label className="text-sm text-gray-600">Speed:</label>
        <input
          type="range"
          min="100"
          max="3000"
          step="100"
          value={stepIntervalMs}
          onChange={handleSpeedChange}
          className="w-24"
          title={`${stepIntervalMs}ms per step`}
        />
        <span className="text-xs text-gray-500 w-16">{stepIntervalMs}ms</span>
      </div>

      <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
        <span>Tokens: {totalTokens}</span>
        <span>Enabled: {enabledTransitions.length}</span>
        {isRunning && (
          <span className="text-green-600 font-medium animate-pulse">Running...</span>
        )}
      </div>
    </div>
  );
}
