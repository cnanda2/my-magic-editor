import { useState, useCallback, useRef, useEffect } from 'react';

// Match the UUIDs from ScratchBridge_ESP32.ino firmware
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

/**
 * Web Bluetooth hook — scans for BLE devices and connects via GATT.
 * Shows the browser's Bluetooth device picker popup with actual device names.
 */
export function useBluetooth() {
  const [device, setDevice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [data, setData] = useState([]);

  const characteristicRef = useRef(null);
  const deviceRef = useRef(null);
  const serverRef = useRef(null);

  /**
   * Check if Web Bluetooth API is available
   */
  const isSupported = useCallback(() => {
    return !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
  }, []);

  /**
   * Scan and connect — triggers the browser's Bluetooth device picker popup.
   * The popup shows nearby BLE devices filtered by name/service.
   */
  const scanAndConnect = useCallback(async () => {
    if (!isSupported()) {
      setError('Web Bluetooth is not supported. Use Chrome or Edge.');
      return null;
    }

    setScanning(true);
    setError(null);

    try {
      // This opens the browser's Bluetooth scan popup showing device names
      const bleDevice = await navigator.bluetooth.requestDevice({
        // Accept devices that match ANY of these filters
        filters: [
          { namePrefix: 'ScratchBridge' },
          { namePrefix: 'Magicbit' },
          { namePrefix: 'MagicBit' },
          { namePrefix: 'ESP32' },
          { services: [SERVICE_UUID] },
        ],
        optionalServices: [SERVICE_UUID],
      });

      deviceRef.current = bleDevice;

      setDevice({
        id: bleDevice.id,
        name: bleDevice.name || 'Unknown Device',
      });

      // Listen for disconnection
      bleDevice.addEventListener('gattserverdisconnected', handleDisconnect);

      // Connect to GATT server
      const server = await bleDevice.gatt.connect();
      serverRef.current = server;

      // Get the service and characteristic
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      characteristicRef.current = characteristic;

      // Start listening for notifications (data from device)
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleDataReceived);

      setConnected(true);
      setScanning(false);
      return bleDevice;
    } catch (err) {
      setScanning(false);
      if (err.name === 'NotFoundError') {
        setError('No device selected. Try again and select your device from the popup.');
      } else if (err.name === 'SecurityError') {
        setError('Bluetooth access denied. Allow Bluetooth in browser settings.');
      } else if (err.name === 'NetworkError') {
        setError('Could not connect to device. Make sure it is powered on and in range.');
      } else {
        setError(err.message || 'Bluetooth connection failed.');
      }
      return null;
    }
  }, [isSupported]);

  /**
   * Scan with acceptAllDevices — shows ALL nearby BLE devices (no filter).
   * Use this if the device name doesn't match the preset filters.
   */
  const scanAll = useCallback(async () => {
    if (!isSupported()) {
      setError('Web Bluetooth is not supported. Use Chrome or Edge.');
      return null;
    }

    setScanning(true);
    setError(null);

    try {
      const bleDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID],
      });

      deviceRef.current = bleDevice;

      setDevice({
        id: bleDevice.id,
        name: bleDevice.name || 'Unknown Device',
      });

      bleDevice.addEventListener('gattserverdisconnected', handleDisconnect);

      const server = await bleDevice.gatt.connect();
      serverRef.current = server;

      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      characteristicRef.current = characteristic;

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleDataReceived);

      setConnected(true);
      setScanning(false);
      return bleDevice;
    } catch (err) {
      setScanning(false);
      if (err.name === 'NotFoundError') {
        setError(null); // User cancelled
      } else if (err.name === 'NetworkError') {
        setError('Could not connect. Ensure device is on and in range.');
      } else {
        setError(err.message || 'Bluetooth connection failed.');
      }
      return null;
    }
  }, [isSupported]);

  /**
   * Handle incoming data from the BLE characteristic
   */
  const handleDataReceived = useCallback((event) => {
    const decoder = new TextDecoder();
    const value = decoder.decode(event.target.value);
    try {
      const parsed = JSON.parse(value);
      setData((prev) => [...prev, { timestamp: Date.now(), ...parsed }].slice(-300));
    } catch {
      setData((prev) => [...prev, { timestamp: Date.now(), raw: value }].slice(-300));
    }
  }, []);

  /**
   * Handle device disconnection
   */
  const handleDisconnect = useCallback(() => {
    setConnected(false);
    characteristicRef.current = null;
    serverRef.current = null;
  }, []);

  /**
   * Disconnect from the device
   */
  const disconnect = useCallback(() => {
    if (deviceRef.current && deviceRef.current.gatt.connected) {
      deviceRef.current.gatt.disconnect();
    }
    setConnected(false);
    setDevice(null);
    characteristicRef.current = null;
    serverRef.current = null;
    deviceRef.current = null;
  }, []);

  /**
   * Reconnect to a previously paired device
   */
  const reconnect = useCallback(async () => {
    if (!deviceRef.current) {
      setError('No previously connected device.');
      return false;
    }

    setError(null);

    try {
      const server = await deviceRef.current.gatt.connect();
      serverRef.current = server;

      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      characteristicRef.current = characteristic;

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleDataReceived);

      setConnected(true);
      return true;
    } catch (err) {
      setError(`Reconnect failed: ${err.message}`);
      return false;
    }
  }, [handleDataReceived]);

  /**
   * Send a command to the connected BLE device
   */
  const sendCommand = useCallback(
    async (command) => {
      if (!characteristicRef.current || !connected) {
        setError('No device connected.');
        return false;
      }

      try {
        const encoder = new TextEncoder();
        const str = typeof command === 'string' ? command : JSON.stringify(command);
        const encoded = encoder.encode(str + '\n');

        // BLE characteristic write (max ~512 bytes per write)
        if (encoded.length <= 512) {
          await characteristicRef.current.writeValue(encoded);
        } else {
          for (let i = 0; i < encoded.length; i += 512) {
            const chunk = encoded.slice(i, i + 512);
            await characteristicRef.current.writeValue(chunk);
          }
        }
        return true;
      } catch (err) {
        setError(`Send failed: ${err.message}`);
        return false;
      }
    },
    [connected]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deviceRef.current && deviceRef.current.gatt.connected) {
        deviceRef.current.gatt.disconnect();
      }
    };
  }, []);

  return {
    isSupported,
    device,
    connected,
    error,
    scanning,
    data,
    scanAndConnect,
    scanAll,
    disconnect,
    reconnect,
    sendCommand,
    clearError: () => setError(null),
    clearData: () => setData([]),
  };
}
