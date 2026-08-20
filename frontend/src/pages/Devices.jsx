import { useState, useEffect } from 'react';
import { Monitor, Terminal, Activity, RefreshCw } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useSerial } from '../hooks/useSerial';

const PIN_LAYOUT = [
  ...Array.from({ length: 14 }, (_, i) => ({ id: `D${i}`, label: `D${i}` })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `A${i}`, label: `A${i}` })),
];

const PIN_STATES_INIT = PIN_LAYOUT.reduce((acc, p) => {
  acc[p.id] = { mode: 'OUTPUT', value: 0 };
  return acc;
}, {});

function PinGrid() {
  const [pinStates, setPinStates] = useState(PIN_STATES_INIT);

  useEffect(() => {
    const id = setInterval(() => {
      setPinStates((prev) => {
        const next = { ...prev };
        PIN_LAYOUT.forEach((p) => {
          if (next[p.id]?.mode === 'INPUT') return;
          next[p.id] = { mode: 'OUTPUT', value: Math.random() > 0.7 ? 1 : 0 };
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-7 gap-2">
      {PIN_LAYOUT.map((pin) => {
        const state = pinStates[pin.id];
        const isInput = !state || state.mode === 'INPUT';
        const isHigh = state?.value === 1;
        return (
          <div
            key={pin.id}
            className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${
              isInput
                ? 'bg-slate-700 border-slate-500'
                : isHigh
                ? 'bg-green-900/50 border-green-500'
                : 'bg-red-900/50 border-red-500'
            }`}
          >
            <span className="text-xs font-bold text-slate-300">{pin.label}</span>
            <span className={`text-[10px] mt-0.5 ${isInput ? 'text-slate-400' : isHigh ? 'text-green-300' : 'text-red-300'}`}>
              {isInput ? 'IN' : isHigh ? 'HIGH' : 'LOW'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Devices() {
  const { socket, deviceData } = useSocket();
  const { devices, sendCommand, refreshPorts, loading } = useSerial();

  const [expandedDevice, setExpandedDevice] = useState(null);
  const [commandInputs, setCommandInputs] = useState({});

  const handleSend = (deviceId) => {
    const cmd = commandInputs[deviceId]?.trim();
    if (!cmd) return;
    sendCommand(deviceId, cmd);
    setCommandInputs((prev) => ({ ...prev, [deviceId]: '' }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={20} className="text-slate-400" />
          <h1 className="text-lg font-semibold text-white">Connected Devices</h1>
          {devices.length > 0 && (
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
              {devices.length}
            </span>
          )}
        </div>
        <button
          onClick={refreshPorts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm text-slate-200 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Device list */}
      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Monitor size={48} className="mb-4 opacity-40" />
          <p className="text-base font-medium">No devices detected</p>
          <p className="text-sm mt-1 opacity-70">Plug in a board and click Refresh</p>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
            >
              {/* Device header row */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-700/30">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {device.name || device.path || `Device ${device.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {device.boardType || 'Unknown board'}
                      {device.path ? ` — ${device.path}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedDevice((p) => (p === device.id ? null : device.id))}
                  className="px-3 py-1.5 rounded-md bg-slate-600 hover:bg-slate-500 text-xs text-slate-200 transition-colors"
                >
                  {expandedDevice === device.id ? 'Hide' : 'Details'}
                </button>
              </div>

              {/* Command row */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-700">
                <Activity size={14} className="text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={commandInputs[device.id] || ''}
                  onChange={(e) =>
                    setCommandInputs((prev) => ({ ...prev, [device.id]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(device.id)}
                  placeholder='Send command, e.g. {"cmd":"digital_write","pin":13,"value":1}'
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition-colors font-mono"
                />
                <button
                  onClick={() => handleSend(device.id)}
                  disabled={!commandInputs[device.id]?.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs text-white transition-colors"
                >
                  <Terminal size={13} />
                  Send
                </button>
              </div>

              {/* Pin visualiser */}
              {expandedDevice === device.id && (
                <div className="px-4 py-4 border-t border-slate-700">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                    Pin State Visualizer
                  </p>
                  <PinGrid />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Live data log */}
      {deviceData.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Live Data
          </p>
          <div className="bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
            {deviceData.slice(-30).map((entry, i) => (
              <p key={i} className="text-slate-300">
                <span className="text-slate-600">
                  {typeof entry.data?.ts === 'number'
                    ? new Date(entry.data.ts).toLocaleTimeString()
                    : '—'}
                  {'  '}
                </span>
                {JSON.stringify(entry.data)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Devices;
