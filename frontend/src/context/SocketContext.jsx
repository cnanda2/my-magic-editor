import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState({});
  const [serialPorts, setSerialPorts] = useState([]);
  const [deviceData, setDeviceData] = useState([]);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);

  useEffect(() => {
    const serverUrl =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : window.location.origin;

    const sock = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });

    sock.on('connect', () => setConnected(true));
    sock.on('disconnect', () => setConnected(false));
    sock.on('connect_error', (err) => setError(err.message));

    sock.on('serial_ports', (ports) => setSerialPorts(ports));
    sock.on('serial_connected', (device) => {
      setDevices((prev) => ({ ...prev, [device.id]: device }));
      setError(null);
    });
    sock.on('serial_disconnected', ({ deviceId }) => {
      setDevices((prev) => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    });
    sock.on('device_data', (data) => {
      setDeviceData((prev) => [...prev, data].slice(-500));
    });
    sock.on('serial_error', (msg) => setError(typeof msg === 'string' ? msg : msg.message));
    sock.on('upload_progress', () => {});
    sock.on('upload_complete', () => {});
    sock.on('upload_error', (msg) => setError(typeof msg === 'string' ? msg : msg.message));

    socketRef.current = sock;
    setSocket(sock);

    return () => {
      sock.off('connect');
      sock.off('disconnect');
      sock.off('connect_error');
      sock.off('serial_ports');
      sock.off('serial_connected');
      sock.off('serial_disconnected');
      sock.off('device_data');
      sock.off('serial_error');
      sock.off('upload_progress');
      sock.off('upload_complete');
      sock.off('upload_error');
      sock.disconnect();
    };
  }, []);

  const connectSerial = useCallback(
    (path, boardType) => {
      socket?.emit('connect_serial', { path, baudRate: 115200, boardType });
    },
    [socket],
  );

  const disconnectSerial = useCallback(
    (deviceId) => {
      socket?.emit('disconnect_serial', { deviceId });
    },
    [socket],
  );

  const sendCommand = useCallback(
    (deviceId, command) => {
      socket?.emit('send_serial_command', { deviceId, command });
    },
    [socket],
  );

  const listPorts = useCallback(() => {
    socket?.emit('list_serial_ports');
  }, [socket]);

  const uploadFirmware = useCallback(
    ({ boardType, port, firmwarePath }) => {
      socket?.emit('upload_firmware', { boardType, port, firmwarePath });
    },
    [socket],
  );

  const value = {
    socket,
    connected,
    devices,
    serialPorts,
    connectSerial,
    disconnectSerial,
    sendCommand,
    listPorts,
    uploadFirmware,
    deviceData,
    error,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
}

export default SocketContext;
