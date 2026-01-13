import { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import NetCanvas from './components/Canvas/NetCanvas';
import Sidebar from './components/Sidebar/Sidebar';
import Inspector from './components/Inspector/Inspector';
import Toolbar from './components/Toolbar/Toolbar';
import ActorRegistry from './components/Sidebar/ActorRegistry';
import { loadAppConfig, type AppConfig } from './store/placeConfig';

export default function App() {
  const [showRegistry, setShowRegistry] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppConfig()
      .then(setAppConfig)
      .finally(() => setLoading(false));
  }, []);

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
        />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar placeConfig={placeConfig} />
          <NetCanvas placeConfig={placeConfig} />
          <Inspector placeConfig={placeConfig} enableActorsFeature={toolConfig.enableActorsFeature} />
        </div>
        {showRegistry && toolConfig.enableActorsFeature && (
          <ActorRegistry onClose={() => setShowRegistry(false)} />
        )}
      </div>
    </ReactFlowProvider>
  );
}
