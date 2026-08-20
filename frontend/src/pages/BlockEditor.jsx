import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu, ToggleLeft, Gauge, RotateCcw, Radio, Monitor,
  Palette, GitBranch, Wifi, Play, AlertTriangle,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const blockCategories = [
  {
    name: 'Connection',
    color: 'emerald',
    icon: Cpu,
    blocks: ['connect to WiFi', 'disconnect', 'ping 192.168.1.1'],
  },
  {
    name: 'Digital I/O',
    color: 'blue',
    icon: ToggleLeft,
    blocks: ['digital write pin [13] HIGH', 'digital read pin [12]', 'pin mode [13] OUTPUT'],
  },
  {
    name: 'Analog I/O',
    color: 'violet',
    icon: Gauge,
    blocks: ['analog write pin [9] 128', 'analog read pin [A0]', 'PWM set freq 1000'],
  },
  {
    name: 'Servo',
    color: 'orange',
    icon: RotateCcw,
    blocks: ['servo write pin [9] 90\u00b0', 'servo attach pin [9]', 'servo detach'],
  },
  {
    name: 'Sensors',
    color: 'amber',
    icon: Radio,
    blocks: ['ultrasonic distance', 'temperature read', 'humidity read'],
  },
  {
    name: 'Display',
    color: 'cyan',
    icon: Monitor,
    blocks: ['OLED print "Hello"', 'LCD clear', 'LCD set cursor col 0 row 0'],
  },
  {
    name: 'NeoPixel',
    color: 'rose',
    icon: Palette,
    blocks: ['neopixel set all R G B', 'neopixel set pixel 0 R G B', 'neopixel show'],
  },
  {
    name: 'Communication',
    color: 'red',
    icon: GitBranch,
    blocks: ['I2C begin', 'SPI transfer 0xFF', 'send serial data'],
  },
  {
    name: 'ESP32',
    color: 'teal',
    icon: Wifi,
    blocks: ['WiFi connect SSID PASS', 'BLE begin', 'WebSocket send'],
  },
];

const colorMap = {
  emerald: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500 text-emerald-400',
  blue: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500 text-blue-400',
  violet: 'bg-violet-500/10 border-violet-500/30 hover:border-violet-500 text-violet-400',
  orange: 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500 text-orange-400',
  amber: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500 text-amber-400',
  cyan: 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500 text-cyan-400',
  rose: 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500 text-rose-400',
  red: 'bg-red-500/10 border-red-500/30 hover:border-red-500 text-red-400',
  teal: 'bg-teal-500/10 border-teal-500/30 hover:border-teal-500 text-teal-400',
};

function BlockEditor() {
  const navigate = useNavigate();
  const { devices } = useSocket();
  const deviceCount = Object.keys(devices).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Hardware Block Editor</h1>
          <p className="text-sm text-slate-400 mt-1">Drag-and-drop hardware programming</p>
        </div>
      </div>

      {/* No device banner */}
      {deviceCount === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <AlertTriangle size={18} className="shrink-0" />
          <p className="text-sm">
            Connect a device to start programming.{' '}
            <button
              onClick={() => navigate('/devices')}
              className="underline font-medium hover:text-amber-200"
            >
              Go to Devices
            </button>
          </p>
        </div>
      )}

      {/* Block categories grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {blockCategories.map((cat) => (
          <div
            key={cat.name}
            className={`rounded-lg border p-4 transition-colors cursor-pointer ${colorMap[cat.color]}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <cat.icon size={22} />
              <h3 className="text-base font-semibold text-white">{cat.name}</h3>
            </div>
            <ul className="space-y-1 mb-4">
              {cat.blocks.map((block) => (
                <li key={block} className="text-xs text-slate-300 font-mono bg-slate-800/50 rounded px-2 py-1">
                  {block}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate(`/blocks/${cat.name.toLowerCase().replace(/\s+/g, '-')}`)}
              className="w-full text-xs font-medium py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
            >
              View Blocks
            </button>
          </div>
        ))}
      </div>

      {/* Launch TurboWarp */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => alert('TurboWarp integration coming soon! This would launch the full Scratch GUI with hardware blocks.')}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
        >
          <Play size={18} />
          Launch TurboWarp
        </button>
      </div>
    </div>
  );
}

export default BlockEditor;
