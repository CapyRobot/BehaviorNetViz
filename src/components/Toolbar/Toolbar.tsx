import { useRef } from 'react';
import { useNetStore } from '../../store/netStore';
import { useSimStore } from '../../store/simStore';
import { exportToJson, downloadJson } from '../../utils/configExport';
import { importFromJson } from '../../utils/configImport';
import type { AppMode } from '../../store/types';

interface Props {
  toolName: string;
  showActorsButton: boolean;
  onShowRegistry: () => void;
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export default function Toolbar({ toolName, showActorsButton, onShowRegistry, mode, onModeChange }: Props) {
  const exportConfig = useNetStore((s) => s.exportConfig);
  const importConfig = useNetStore((s) => s.importConfig);
  const clearAll = useNetStore((s) => s.clearAll);
  const places = useNetStore((s) => s.places);
  const transitions = useNetStore((s) => s.transitions);

  const actionProbabilities = useSimStore((s) => s.actionProbabilities);
  const setActionProbabilities = useSimStore((s) => s.setActionProbabilities);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // Include simulation config with action probabilities
    const simulationConfig = Object.keys(actionProbabilities).length > 0
      ? { actionProbabilities }
      : undefined;
    const config = exportConfig(simulationConfig);
    const json = exportToJson(config);
    downloadJson(json, 'petri-net-config.json');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config = importFromJson(text);
      importConfig(config);
      // Load simulation config if present
      if (config.simulation?.actionProbabilities) {
        setActionProbabilities(config.simulation.actionProbabilities);
      }
    } catch (err) {
      alert(`Failed to import: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleClear = () => {
    if (places.length === 0 && transitions.length === 0) {
      return;
    }
    if (confirm('Clear the entire net? This cannot be undone.')) {
      clearAll();
    }
  };

  const handleSaveLocal = () => {
    const config = exportConfig();
    const json = exportToJson(config);
    localStorage.setItem('petri-net-autosave', json);
    alert('Saved to browser storage');
  };

  const handleLoadLocal = () => {
    const saved = localStorage.getItem('petri-net-autosave');
    if (!saved) {
      alert('No saved data found');
      return;
    }
    try {
      const config = importFromJson(saved);
      importConfig(config);
    } catch (err) {
      alert(`Failed to load: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="h-14 bg-gray-800 text-white flex items-center px-4 justify-between">
      <div className="flex items-center space-x-2">
        <a href="https://capybot.com" target="_blank" rel="noopener noreferrer" className="flex items-center">
          <img src="/capybot-logo.jpeg" alt="CapyBot" className="w-8 h-8 rounded" />
        </a>
        <h1 className="text-lg font-bold mr-4">{toolName}</h1>

        <button
          onClick={handleSaveLocal}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          Save
        </button>
        <button
          onClick={handleLoadLocal}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          Load
        </button>
        <div className="w-px h-6 bg-gray-600 mx-2" />
        <button
          onClick={handleImport}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
        >
          Import JSON
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm"
        >
          Export JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="flex items-center space-x-2">
        {/* Mode selector */}
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as AppMode)}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white border-none outline-none cursor-pointer"
        >
          <option value="editor">Editor</option>
          <option value="simulator">Simulator</option>
        </select>

        <div className="w-px h-6 bg-gray-600 mx-2" />

        {showActorsButton && mode === 'editor' && (
          <button
            onClick={onShowRegistry}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm"
          >
            Actors & Actions
          </button>
        )}
        {mode === 'editor' && (
          <button
            onClick={handleClear}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="text-sm text-gray-400">
        {places.length} places, {transitions.length} transitions
      </div>
    </div>
  );
}
