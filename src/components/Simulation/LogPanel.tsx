import { useEffect, useRef } from 'react';
import { useSimStore } from '../../store/simStore';

export default function LogPanel() {
  const logs = useSimStore((s) => s.logs);
  const clearLogs = useSimStore((s) => s.clearLogs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const base = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${base}.${ms}`;
  };

  return (
    <div className="flex flex-col border-t border-gray-300">
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1">
        <span className="text-xs text-gray-300 font-medium">Simulation Log</span>
        <button
          onClick={clearLogs}
          className="text-xs text-gray-400 hover:text-white"
          title="Clear logs"
        >
          Clear
        </button>
      </div>
      <div ref={scrollRef} className="log-panel">
        {logs.length === 0 ? (
          <div className="px-3 py-2 text-gray-500 italic">
            No log entries yet. Inject tokens and fire transitions to see activity.
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`log-entry ${log.type}`}>
              <span className="timestamp">{formatTimestamp(log.timestamp)}</span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
