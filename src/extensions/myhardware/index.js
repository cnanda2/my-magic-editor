/**
 * My Hardware Extension - Module export for TurboWarp
 * This registers the extension when loaded via the scratch-gui extension system
 * The full extension logic lives in static/myhardware.js (loaded as unsandboxed)
 */

class MyHardware {
  getInfo() {
    return {
      id: 'myhardware',
      name: 'My Hardware',
      color1: '#00979D',
      color2: '#007A7D',
      color3: '#005C5E',
      blocks: [
        {
          opcode: 'hello',
          blockType: Scratch.BlockType.COMMAND,
          text: 'The STEM Educator loaded! Open the extension library'
        },
        {
          opcode: 'connectUSB',
          blockType: Scratch.BlockType.COMMAND,
          text: 'connect USB'
        },
        {
          opcode: 'connectWiFi',
          blockType: Scratch.BlockType.COMMAND,
          text: 'connect WiFi [IP]',
          arguments: {
            IP: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: 'ws://192.168.1.10:81'
            }
          }
        }
      ]
    };
  }

  hello() {
    console.log('[MyHardware] Extension ready - load full extension from static/myhardware.js');
  }

  async connectUSB() {
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      console.log('[MyHardware] USB Connected');
    } catch (err) {
      console.error('[MyHardware] USB error:', err);
    }
  }

  connectWiFi(args) {
    try {
      const ws = new WebSocket(args.IP);
      ws.onopen = () => console.log('[MyHardware] WiFi Connected');
      ws.onmessage = (e) => console.log('[MyHardware] WiFi msg:', e.data);
      ws.onerror = (e) => console.error('[MyHardware] WiFi error:', e);
    } catch (err) {
      console.error('[MyHardware] WiFi error:', err);
    }
  }
}

if (typeof Scratch !== "undefined") {
  Scratch.extensions.register(new MyHardware());
} else {
  console.error("Scratch not found - extension not registered");
}
