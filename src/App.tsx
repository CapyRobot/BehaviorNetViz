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
import { ConnectionDialog } from './components/Runtime';
import { loadAppConfig, type AppConfig } from './store/placeConfig';
import { useSimStore } from './store/simStore';
import { useRuntimeStore } from './store/runtimeStore';
import { useNetStore } from './store/netStore';
import type { AppMode } from './store/types';

export default function App() {
  const [showRegistry, setShowRegistry] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AppMode>('editor');
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);

  const resetSimulation = useSimStore((s) => s.reset);
  const disconnectRuntime = useRuntimeStore((s) => s.disconnect);
  const runtimeConnectionState = useRuntimeStore((s) => s.connectionState);
  const places = useNetStore((s) => s.places);
  const transitions = useNetStore((s) => s.transitions);

  useEffect(() => {
    loadAppConfig()
      .then((config) => {
        setAppConfig(config);
        document.title = config.toolConfig.toolName;
      })
      .finally(() => setLoading(false));
  }, []);

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return places.length > 0 || transitions.length > 0;
  };

  // Handle mode switching
  const handleModeChange = (newMode: AppMode) => {
    if (newMode === mode) return;

    // Switching TO runtime mode
    if (newMode === 'runtime') {
      // Warn about unsaved changes - runtime will load config from server
      if (hasUnsavedChanges()) {
        const proceed = confirm(
          'Switching to Runtime mode will load the configuration from the server. ' +
          'Any unsaved changes in the editor will be replaced. Continue?'
        );
        if (!proceed) return;
      }
      // Show connection dialog
      setPendingMode('runtime');
      setShowConnectionDialog(true);
      return;
    }

    // Switching FROM runtime mode
    if (mode === 'runtime') {
      // Disconnect from server but keep the config for editing
      disconnectRuntime();
    }

    resetSimulation();
    setMode(newMode);
  };

  // Called when connection succeeds
  const handleConnectionSuccess = () => {
    setShowConnectionDialog(false);
    if (pendingMode) {
      setMode(pendingMode);
      setPendingMode(null);
    }
  };

  // Called when connection dialog is closed without connecting
  const handleConnectionDialogClose = () => {
    setShowConnectionDialog(false);
    setPendingMode(null);
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

        {mode === 'editor' && (
          // Editor mode layout
          <div className="flex-1 flex overflow-hidden">
            <Sidebar placeConfig={placeConfig} />
            <NetCanvas placeConfig={placeConfig} />
            <Inspector placeConfig={placeConfig} enableActorsFeature={toolConfig.enableActorsFeature} />
          </div>
        )}

        {mode === 'simulator' && (
          // Simulator mode layout
          <div className="flex-1 flex flex-col overflow-hidden">
            <SimControls placeConfig={placeConfig} />
            <div className="flex-1 overflow-hidden">
              <SimCanvas placeConfig={placeConfig} />
            </div>
            <LogPanel />
          </div>
        )}

        {mode === 'runtime' && (
          // Runtime mode layout - shows live net state
          <div className="flex-1 flex flex-col overflow-hidden">
            {runtimeConnectionState === 'connected' ? (
              <div className="px-4 py-2 bg-green-100 border-b border-green-300 text-green-800 text-sm flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Connected to runtime server
              </div>
            ) : (
              <div className="px-4 py-2 bg-yellow-100 border-b border-yellow-300 text-yellow-800 text-sm flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                Disconnected - switch mode or reconnect
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <NetCanvas placeConfig={placeConfig} isRuntimeMode={runtimeConnectionState === 'connected'} />
            </div>
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

        {/* Runtime connection dialog */}
        <ConnectionDialog
          isOpen={showConnectionDialog}
          onClose={handleConnectionDialogClose}
          onConnect={handleConnectionSuccess}
        />
      </div>
    </ReactFlowProvider>
  );
}
