(function (Scratch) {
    'use strict';

    class MyHardwareExtension {
        constructor() {
            this.port = null;
            this.writer = null;
            this.reader = null;
            this.lastReceived = '';
        }

        getInfo() {
            return {
                id: 'myhardware',
                name: 'My Hardware',
                color1: '#4C97FF',
                color2: '#3373CC',
                blocks: [
                    {
                        opcode: 'connect',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'Connect to hardware (baud [BAUD])',
                        arguments: {
                            BAUD: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 9600
                            }
                        }
                    },
                    {
                        opcode: 'disconnect',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'Disconnect from hardware'
                    },
                    {
                        opcode: 'isConnected',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'hardware connected?'
                    },
                    '---',
                    {
                        opcode: 'sendData',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'Send [DATA] to hardware',
                        arguments: {
                            DATA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'hello'
                            }
                        }
                    },
                    {
                        opcode: 'sendLine',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'Send line [DATA] to hardware',
                        arguments: {
                            DATA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'hello'
                            }
                        }
                    },
                    '---',
                    {
                        opcode: 'getLastReceived',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last received data'
                    },
                    {
                        opcode: 'startReading',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'Start reading from hardware'
                    }
                ]
            };
        }

        async connect({ BAUD }) {
            try {
                if (!('serial' in navigator)) {
                    alert('Web Serial is not supported. Please use Chrome or Edge.');
                    return;
                }
                this.port = await navigator.serial.requestPort();
                await this.port.open({ baudRate: Number(BAUD) || 9600 });
                this.writer = this.port.writable.getWriter();
                console.log('[MyHardware] Connected at baud', BAUD);
            } catch (err) {
                console.error('[MyHardware] connect error:', err);
            }
        }

        async disconnect() {
            try {
                if (this.writer) { this.writer.releaseLock(); this.writer = null; }
                if (this.reader) { this.reader.cancel(); this.reader = null; }
                if (this.port) { await this.port.close(); this.port = null; }
                console.log('[MyHardware] Disconnected');
            } catch (err) {
                console.error('[MyHardware] disconnect error:', err);
            }
        }

        isConnected() {
            return this.port !== null && this.writer !== null;
        }

        async sendData({ DATA }) {
            if (!this.writer) { console.warn('[MyHardware] Not connected'); return; }
            try {
                const encoder = new TextEncoder();
                await this.writer.write(encoder.encode(String(DATA)));
            } catch (err) {
                console.error('[MyHardware] sendData error:', err);
            }
        }

        async sendLine({ DATA }) {
            await this.sendData({ DATA: String(DATA) + '\n' });
        }

        getLastReceived() {
            return this.lastReceived;
        }

        async startReading() {
            if (!this.port) { console.warn('[MyHardware] Not connected'); return; }
            try {
                const decoder = new TextDecoderStream();
                this.port.readable.pipeTo(decoder.writable);
                this.reader = decoder.readable.getReader();
                (async () => {
                    while (true) {
                        const { value, done } = await this.reader.read();
                        if (done) break;
                        this.lastReceived = value;
                    }
                })();
            } catch (err) {
                console.error('[MyHardware] startReading error:', err);
            }
        }
    }

    Scratch.extensions.register(new MyHardwareExtension());
})(Scratch);