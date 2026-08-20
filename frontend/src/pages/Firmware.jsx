import { useState, useCallback, useRef } from 'react';
import {
  HardDrive, Upload, CheckCircle, XCircle, Wifi, Usb,
  Cpu, ArrowUp, File, Download,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import useFirmware from '../hooks/useFirmware';

const boards = [
  { id: 'uno', name: 'Arduino Uno', chip: 'ATmega328P', flash: '32 KB', port: 'auto' },
  { id: 'nano', name: 'Arduino Nano', chip: 'ATmega328P', flash: '32 KB', port: 'auto' },
  { id: 'mega', name: 'Arduino Mega', chip: 'ATmega2560', flash: '256 KB', port: 'auto' },
  { id: 'esp32', name: 'ESP32', chip: 'Xtensa LX6', flash: '4 MB', port: 'auto' },
  { id: 'esp32cam', name: 'ESP32-CAM', chip: 'Xtensa LX6', flash: '4 MB', port: 'auto' },
];

const prebuiltFirmware = [
  { name: 'Blink', version: '1.0.0', size: '2.3 KB', date: '2026-05-15' },
  { name: 'Servo Sweep', version: '1.1.0', size: '4.1 KB', date: '2026-05-10' },
  { name: 'Sensor Read', version: '2.0.0', size: '6.8 KB', date: '2026-04-28' },
  { name: 'LED Matrix', version: '1.3.0', size: '8.2 KB', date: '2026-04-20' },
  { name: 'WiFi Scanner', version: '2.1.0', size: '12.5 KB', date: '2026-04-15' },
];

function Firmware() {
  const { serialPorts } = useSocket();
  const { boards: apiBoards, tools, uploading, progress, upload } = useFirmware();
  const fileInputRef = useRef(null);

  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedPort, setSelectedPort] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState(null);

  const toolsMap = useCallback(() => {
    const map = {};
    if (!tools || !tools.length) return { avrdude: false, esptool: false };
    tools.forEach((t) => { map[t.name] = t.available; });
    return map;
  }, [tools]);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped && /\.(ino|hex|bin)$/i.test(dropped.name)) {
      setFile(dropped);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }, []);

  const handleUpload = useCallback(() => {
    if (!selectedBoard || !selectedPort) {
      setStatus({ type: 'error', message: 'Select a board and port first.' });
      return;
    }
    upload({ boardType: selectedBoard, port: selectedPort, firmwarePath: file?.name || 'default' });
    setStatus(null);
  }, [selectedBoard, selectedPort, file, upload]);

  const handleFlashPrebuilt = useCallback((fw) => {
    if (!selectedBoard || !selectedPort) {
      setStatus({ type: 'error', message: 'Select a board and port first.' });
      return;
    }
    upload({ boardType: selectedBoard, port: selectedPort, firmwarePath: `prebuilt/${fw.name.toLowerCase().replace(/\s+/g, '-')}.bin` });
    setStatus({ type: 'info', message: `Flashing ${fw.name} v${fw.version}...` });
  }, [selectedBoard, selectedPort, upload]);

  const toolStatus = toolsMap();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Firmware Manager</h1>
        <p className="text-sm text-slate-400 mt-1">Upload firmware to your connected boards</p>
      </div>

      {/* Board Selection */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={18} className="text-slate-400" />
          <h2 className="text-base font-semibold text-white">Board Selection</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setSelectedBoard(board.id)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                selectedBoard === board.id
                  ? 'bg-blue-500/10 border-blue-500 text-blue-300'
                  : 'bg-slate-700/50 border-slate-600 hover:border-slate-500 text-slate-300'
              }`}
            >
              <p className="text-sm font-semibold text-white mb-1">{board.name}</p>
              <p className="text-xs text-slate-400">{board.chip}</p>
              <p className="text-xs text-slate-500">Flash: {board.flash}</p>
              <span
                className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded ${
                  selectedBoard === board.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-600 text-slate-300'
                }`}
              >
                {selectedBoard === board.id ? 'Selected' : 'Select'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Port Selection */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Usb size={18} className="text-slate-400" />
          <h2 className="text-base font-semibold text-white">Port Selection</h2>
        </div>
        <select
          value={selectedPort}
          onChange={(e) => setSelectedPort(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">-- Select a serial port --</option>
          {serialPorts.map((port) => (
            <option key={port.path} value={port.path}>
              {port.path} {port.manufacturer ? `(${port.manufacturer})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Firmware File Upload */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <File size={18} className="text-slate-400" />
          <h2 className="text-base font-semibold text-white">Firmware File</h2>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-500/10'
              : 'border-slate-600 hover:border-slate-500 bg-slate-700/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".ino,.hex,.bin"
            className="hidden"
            onChange={handleFileSelect}
          />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-200">
              <File size={16} />
              <span>{file.name}</span>
              <span className="text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          ) : (
            <div>
              <Upload size={28} className="mx-auto mb-2 text-slate-500" />
              <p className="text-sm text-slate-400">
                Drag & drop a firmware file here, or click to browse
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports .ino, .hex, .bin</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">Uploading firmware...</span>
            <span className="text-sm font-mono text-slate-100">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !selectedBoard || !selectedPort}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        <ArrowUp size={18} />
        {uploading ? 'Uploading...' : 'Upload Firmware'}
      </button>

      {/* Status Section */}
      {status && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${
            status.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : status.type === 'info'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {status.type === 'error' ? (
            <XCircle size={16} className="shrink-0" />
          ) : (
            <CheckCircle size={16} className="shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {progress === 100 && !uploading && status === null && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-sm">
          <CheckCircle size={16} className="shrink-0" />
          <span>Firmware uploaded successfully!</span>
        </div>
      )}

      {/* Pre-built Firmware */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Download size={18} className="text-slate-400" />
          <h2 className="text-base font-semibold text-white">Pre-built Firmware</h2>
        </div>
        <div className="space-y-2">
          {prebuiltFirmware.map((fw) => (
            <div
              key={fw.name}
              className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{fw.name}</p>
                <p className="text-xs text-slate-400">
                  v{fw.version} &middot; {fw.size} &middot; {fw.date}
                </p>
              </div>
              <button
                onClick={() => handleFlashPrebuilt(fw)}
                disabled={uploading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs text-white transition-colors"
              >
                <Download size={12} />
                Flash Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tools Status */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive size={18} className="text-slate-400" />
          <h2 className="text-base font-semibold text-white">Tools Status</h2>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">avrdude:</span>
            {toolStatus.avrdude ? (
              <CheckCircle size={16} className="text-emerald-400" />
            ) : (
              <XCircle size={16} className="text-red-400" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">esptool:</span>
            {toolStatus.esptool ? (
              <CheckCircle size={16} className="text-emerald-400" />
            ) : (
              <XCircle size={16} className="text-red-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Firmware;
