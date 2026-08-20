import { useState, useCallback, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';

export function useSerial() {
  const {
    socket,
    serialPorts,
    devices,
    connectSerial: ctxConnectSerial,
    disconnectSerial: ctxDisconnectSerial,
    sendCommand: ctxSendCommand,
    deviceData,
  } = useSocket();

  const [loading, setLoading] = useState(false);

  const refreshPorts = useCallback(() => {
    setLoading(true);
    socket?.emit('list_serial_ports');
    setTimeout(() => setLoading(false), 2000);
  }, [socket]);

  const connect = useCallback(
    (path, boardType) => {
      ctxConnectSerial(path, boardType);
    },
    [ctxConnectSerial],
  );

  const disconnect = useCallback(
    (deviceId) => {
      ctxDisconnectSerial(deviceId);
    },
    [ctxDisconnectSerial],
  );

  const sendCommand = useCallback(
    (deviceId, command) => {
      ctxSendCommand(deviceId, command);
    },
    [ctxSendCommand],
  );

  const lastData = useMemo(() => {
    return deviceData.length > 0 ? deviceData[deviceData.length - 1] : null;
  }, [deviceData]);

  return {
    ports: serialPorts,
    loading,
    refreshPorts,
    connect,
    disconnect,
    devices: Object.values(devices),
    sendCommand,
    lastData,
  };
}

export default useSerial;
