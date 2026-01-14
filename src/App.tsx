import { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import NetCanvas from './components/Canvas/NetCanvas';
import SimCanvas from './components/Canvas/SimCanvas';
import Sidebar from './components/Sidebar/Sidebar';
import Inspector from './components/Inspector/Inspector';
import Toolbar from './components/Toolbar/Toolbar';
import ActorRegistry from './components/Sidebar/ActorRegistry';
import SimControls from './components/Simulation/SimControls';
import LogPanel from './components/Simulation/LogPanel';
import { loadAppConfig, type AppConfig } from './store/placeConfig';
import { useSimStore } from './store/simStore';
import type { AppMode } from './store/types';

export default function App() {
  const [showRegistry, setShowRegistry] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AppMode>('editor');

  const resetSimulation = useSimStore((s) => s.reset);

  useEffect(() => {
    loadAppConfig()
      .then((config) => {
        setAppConfig(config);
        document.title = config.toolConfig.toolName;
      })
      .finally(() => setLoading(false));
  }, []);

  // Reset simulation when switching modes
  const handleModeChange = (newMode: AppMode) => {
    if (newMode !== mode) {
      resetSimulation();
      setMode(newMode);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  if (!appConfig) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-red-600">Failed to load configuration</div>
      </div>
    );
  }

  const { toolConfig, placeConfig } = appConfig;

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col">
        <Toolbar
          toolName={toolConfig.toolName}
          showActorsButton={toolConfig.enableActorsFeature}
          onShowRegistry={() => setShowRegistry(true)}
          mode={mode}
          onModeChange={handleModeChange}
        />

        {mode === 'editor' ? (
          // Editor mode layout
          <div className="flex-1 flex overflow-hidden">
            <Sidebar placeConfig={placeConfig} />
            <NetCanvas placeConfig={placeConfig} />
            <Inspector placeConfig={placeConfig} enableActorsFeature={toolConfig.enableActorsFeature} />
          </div>
        ) : (
          // Simulator mode layout
          <div className="flex-1 flex flex-col overflow-hidden">
            <SimControls placeConfig={placeConfig} />
            <div className="flex-1 overflow-hidden">
              <SimCanvas placeConfig={placeConfig} />
            </div>
            <LogPanel />
          </div>
        )}

        <footer className="h-8 bg-gray-100 border-t border-gray-200 flex items-center justify-center px-4 text-xs text-gray-500">
          <span>
            © {new Date().getFullYear()}{' '}
            <a href="https://capybot.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              CapyBot
            </a>
            {' · '}
            <a href="https://github.com/CapyRobot/BehaviorNetViz" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Source Code
            </a>
          </span>
        </footer>
        {showRegistry && toolConfig.enableActorsFeature && mode === 'editor' && (
          <ActorRegistry onClose={() => setShowRegistry(false)} />
        )}
      </div>
    </ReactFlowProvider>
  );
}
