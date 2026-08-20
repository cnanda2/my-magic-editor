import React from 'react';
import PropTypes from 'prop-types';

const CM_VERSION = '5.65.16';
const CM_BASE = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/${CM_VERSION}`;

function loadScript (src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
    });
}
function loadCSS (href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
}

const CODE_SNIPPETS = {
    'GPIO': [
        {label: 'Digital Write HIGH', code: 'digitalWrite(13, HIGH)'},
        {label: 'Digital Write LOW', code: 'digitalWrite(13, LOW)'},
        {label: 'Digital Read', code: 'val = digitalRead(2)'},
        {label: 'Analog Write (PWM)', code: 'analogWrite(9, 128)'},
        {label: 'Analog Read', code: 'val = analogRead(A0)'},
        {label: 'Pin Mode Output', code: 'pinMode(13, OUTPUT)'},
        {label: 'Pin Mode Input', code: 'pinMode(2, INPUT_PULLUP)'},
    ],
    'Servo': [
        {label: 'Servo Write', code: 'servoWrite(9, 90)'},
        {label: 'Servo Sweep', code: 'for angle in range(0, 180, 5):\n    servoWrite(9, angle)\n    delay(20)'},
    ],
    'Sensors': [
        {label: 'Read Temperature', code: 'temp = readTemperature()'},
        {label: 'Read Ultrasonic', code: 'dist = ultrasonic(7, 8)'},
        {label: 'Read Light', code: 'light = analogRead(A0)'},
    ],
    'Display': [
        {label: 'Print', code: 'print("Hello!")'},
        {label: 'LCD Print', code: 'lcd.print(0, 0, "Hello!")'},
    ],
    'Timing': [
        {label: 'Delay 1s', code: 'delay(1000)'},
        {label: 'Delay 500ms', code: 'delay(500)'},
    ],
    'Control': [
        {label: 'While Loop', code: 'while True:\n    pass'},
        {label: 'For Loop', code: 'for i in range(10):\n    pass'},
        {label: 'If/Else', code: 'if val > 100:\n    pass\nelse:\n    pass'},
        {label: 'Function', code: 'def my_func():\n    pass'},
    ],
};

const EXAMPLES = {
    'Blink LED': 'from board import *\n\npinMode(13, OUTPUT)\n\nwhile True:\n    digitalWrite(13, HIGH)\n    delay(1000)\n    digitalWrite(13, LOW)\n    delay(1000)\n',
    'Button LED': 'from board import *\n\npinMode(13, OUTPUT)\npinMode(2, INPUT_PULLUP)\n\nwhile True:\n    if digitalRead(2) == LOW:\n        digitalWrite(13, HIGH)\n    else:\n        digitalWrite(13, LOW)\n',
    'Servo Sweep': 'from board import *\n\nwhile True:\n    for angle in range(0, 180, 2):\n        servoWrite(9, angle)\n        delay(15)\n    for angle in range(180, 0, -2):\n        servoWrite(9, angle)\n        delay(15)\n',
    'Fade LED': 'from board import *\n\nLED = 9\nwhile True:\n    for b in range(0, 256, 5):\n        analogWrite(LED, b)\n        delay(20)\n    for b in range(255, -1, -5):\n        analogWrite(LED, b)\n        delay(20)\n',
    'Traffic Light': 'from board import *\n\nRED, YEL, GRN = 13, 12, 11\nfor p in [RED, YEL, GRN]:\n    pinMode(p, OUTPUT)\n\nwhile True:\n    digitalWrite(RED, HIGH)\n    delay(3000)\n    digitalWrite(RED, LOW)\n    digitalWrite(GRN, HIGH)\n    delay(3000)\n    digitalWrite(GRN, LOW)\n    digitalWrite(YEL, HIGH)\n    delay(1000)\n    digitalWrite(YEL, LOW)\n',
    'Ultrasonic': 'from board import *\n\nwhile True:\n    dist = ultrasonic(7, 8)\n    print("Distance:", dist, "cm")\n    delay(500)\n',
    'RGB LED': 'from board import *\n\n# RGB LED: R=9, G=10, B=11 (use PWM pins with 220ohm resistors)\npinMode(9, OUTPUT)\npinMode(10, OUTPUT)\npinMode(11, OUTPUT)\n\nwhile True:\n    analogWrite(9, 255)\n    analogWrite(10, 0)\n    analogWrite(11, 0)\n    delay(1000)\n    analogWrite(9, 0)\n    analogWrite(10, 255)\n    analogWrite(11, 0)\n    delay(1000)\n    analogWrite(9, 0)\n    analogWrite(10, 0)\n    analogWrite(11, 255)\n    delay(1000)\n',
    'Mega DC Jack Blink': 'from board import *\n\n# Arduino Mega 2560 powered by DC Jack\n# External LED on pin 9 with 220ohm resistor to GND\n\npinMode(9, OUTPUT)\n\nwhile True:\n    digitalWrite(9, HIGH)\n    delay(1000)\n    digitalWrite(9, LOW)\n    delay(1000)\n',
};

const AUTOCOMPLETE = [
    'digitalWrite','digitalRead','analogWrite','analogRead','pinMode',
    'servoWrite','delay','millis','print','ultrasonic','readTemperature',
    'serialWrite','OUTPUT','INPUT','INPUT_PULLUP','HIGH','LOW',
    'True','False','None','import','from','def','class','if','elif',
    'else','while','for','in','range','return','break','continue','pass',
];

class PythonTab extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            output: '', running: false, cmLoaded: false, connected: false, showTips: true, cppCode: '', showCpp: false,
            mode: 'upload', showSnippets: true, showExamples: false,
            serialInput: '', showPlotter: false, plotData: [],
        };
        this.editorRef = React.createRef();
        this.cmInstance = null;
        this._running = false;
        this.defaultCode = EXAMPLES['Blink LED'];
    }

    async componentDidMount () {
        loadCSS(`${CM_BASE}/codemirror.min.css`);
        loadCSS(`${CM_BASE}/theme/monokai.min.css`);
        loadCSS(`${CM_BASE}/addon/hint/show-hint.min.css`);
        // Fix CodeMirror line number overlap
        const style = document.createElement('style');
        style.textContent = '.CodeMirror { height: 100%; box-sizing: border-box; } .CodeMirror-gutter { min-width: 44px; width: 44px !important; } .CodeMirror-linenumber { padding: 0 6px 0 2px; text-align: right; width: 38px !important; min-width: 38px; } .CodeMirror-lines { padding: 4px 0 0 4px; } .CodeMirror-sizer { margin-left: 44px !important; }';
        document.head.appendChild(style);
        await loadScript(`${CM_BASE}/codemirror.min.js`);
        await loadScript(`${CM_BASE}/mode/python/python.min.js`);
        await loadScript(`${CM_BASE}/addon/edit/matchbrackets.min.js`);
        await loadScript(`${CM_BASE}/addon/edit/closebrackets.min.js`);
        await loadScript(`${CM_BASE}/addon/selection/active-line.min.js`);
        await loadScript(`${CM_BASE}/addon/hint/show-hint.min.js`);
        await loadScript(`${CM_BASE}/addon/comment/comment.min.js`);
        this.initEditor();
        this._connCheck = setInterval(() => {
            const c = !!(window.__hardwareConnection || window.__bleCharacteristic || window.__serialPort);
            if (c !== this.state.connected) this.setState({connected: c});
        }, 1500);
    }

    componentWillUnmount () {
        if (this._connCheck) clearInterval(this._connCheck);
    }

    initEditor () {
        if (!this.editorRef.current || !window.CodeMirror) return;
        window.CodeMirror.registerHelper('hint', 'python', cm => {
            const cur = cm.getCursor();
            const tok = cm.getTokenAt(cur);
            const word = tok.string;
            const list = AUTOCOMPLETE.filter(k => k.toLowerCase().startsWith(word.toLowerCase()) && k !== word);
            return {list, from: {line: cur.line, ch: tok.start}, to: {line: cur.line, ch: cur.ch}};
        });
        this.cmInstance = window.CodeMirror(this.editorRef.current, {
            value: this.defaultCode, mode: 'python', theme: 'monokai',
            lineNumbers: true, fixedGutter: true,
            gutters: ['CodeMirror-linenumbers'],
            matchBrackets: true, autoCloseBrackets: true,
            indentUnit: 4, tabSize: 4, indentWithTabs: false, electricChars: true, styleActiveLine: true,
            extraKeys: {
                'Ctrl-Enter': () => this.handleRun(),
                'Ctrl-U': () => this.handleUpload(),
                'Ctrl-Space': 'autocomplete',
                'Ctrl-/': 'toggleComment',
                'Shift-Enter': () => this.handleLiveExec(),
                'Shift-Tab': cm => cm.indentSelection('subtract'),
                Tab: cm => {
                    if (cm.somethingSelected()) return cm.indentSelection('add');
                    const cur = cm.getCursor();
                    const line = cm.getLine(cur.line);
                    const nonSpace = line.search(/\S/);
                    if (nonSpace === -1 || cur.ch <= nonSpace) {
                        const indent = Math.floor(cur.ch / 4) * 4 + 4;
                        const spaces = indent - cur.ch;
                        cm.replaceSelection(' '.repeat(spaces), 'end');
                    } else {
                        cm.replaceSelection('    ', 'end');
                    }
                },
            }
        });
        this.cmInstance.setSize('100%', '100%');
        this.cmInstance.on('inputRead', (cm, ch) => {
            if (ch.text[0] && /\w/.test(ch.text[0])) cm.showHint({completeSingle: false});
        });
        this.setState({cmLoaded: true});
    }

    getCode () { return this.cmInstance ? this.cmInstance.getValue() : this.defaultCode; }

    async sendToDevice (data) {
        const msg = typeof data === 'string' ? data : JSON.stringify(data);
        if (window.__serialWriter) { try { await window.__serialWriter.write(msg + '\n'); return true; } catch (e) {/**/} }
        if (window.__bleCharacteristic) { try { const enc = new TextEncoder(); await window.__bleCharacteristic.writeValue(enc.encode(msg + '\n')); return true; } catch (e) {/**/} }
        if (window.__hardwareConnection && window.__hardwareConnection.sendCommand) { await window.__hardwareConnection.sendCommand(msg); return true; }
        return false;
    }

    appendOutput (t) { this.setState(p => ({output: p.output + t})); }

    handleLiveExec () {
        const cm = this.cmInstance; if (!cm) return;
        let code = cm.somethingSelected() ? cm.getSelection() : cm.getLine(cm.getCursor().line);
        if (!cm.somethingSelected()) cm.setCursor({line: cm.getCursor().line + 1, ch: 0});
        if (!code.trim()) return;
        this.appendOutput('>>> ' + code.trim() + '\n');
        this.sendToDevice({cmd: 'exec', code: code.trim()}).then(ok => {
            if (!ok) this.appendOutput('  [No device connected]\n');
        });
    }

    handleRun () {
        this._running = true;
        this.setState({running: true, output: '', showTips: false});
        const code = this.getCode();
        if (this.state.mode === 'live') {
            this.appendOutput('▶ Running (Live Mode)...\n');
            this.sendToDevice({cmd: 'exec', code}).then(ok => {
                this.appendOutput(ok ? '✓ Sent to Arduino!\n' : '⚠ No Arduino connected!\n');
                this.setState({running: false});
            });
            return;
        }
        // Parse all commands into a queue with delays (parse BEFORE connection check)
        const commands = [];
        for (const line of code.split('\n')) {
            const t = line.trim(); let m;
            if (!t || /^(#|import |from |def |while |for |if |elif |else|class |try|except)/.test(t)) continue;
            if ((m = t.match(/pinMode\((\d+),\s*(OUTPUT|INPUT|INPUT_PULLUP)\)/i))) {
                const mv = {OUTPUT:1,INPUT:0,INPUT_PULLUP:2};
                commands.push({type:'cmd', data:{cmd:'pin_mode',pin:+m[1],value:mv[m[2].toUpperCase()]||1}, text:t});
            } else if ((m = t.match(/digitalWrite\((\d+),\s*(HIGH|LOW|1|0)\)/i))) {
                commands.push({type:'cmd', data:{cmd:'digital_write',pin:+m[1],value:(m[2]==='HIGH'||m[2]==='1')?1:0}, text:t});
            } else if ((m = t.match(/analogWrite\((\d+),\s*(\d+)\)/i))) {
                commands.push({type:'cmd', data:{cmd:'analog_write',pin:+m[1],value:+m[2]}, text:t});
            } else if ((m = t.match(/servo[Ww]rite\((\d+),\s*(\d+)\)/i))) {
                commands.push({type:'cmd', data:{cmd:'servo_write',pin:+m[1],angle:+m[2]}, text:t});
            } else if ((m = t.match(/delay\((\d+)\)/i))) {
                commands.push({type:'delay', ms:+m[1], text:t});
            } else if ((m = t.match(/print\(["'](.+?)["']\)/))) {
                commands.push({type:'print', text:m[1]});
            } else if ((m = t.match(/print\((["'].+?["']\s*,\s*.+?)\)/))) {
                commands.push({type:'print', text:m[1]});
            } else if (t.match(/print\(\s*\)/)) {
                commands.push({type:'print', text:''});
            } else if ((m = t.match(/print\((.+?)\)/))) {
                commands.push({type:'print', text:m[1]});
            }
        }

        if (commands.length === 0) {
            this.setState({output: '🤔 Hmm, no commands found!\nTry: print(), delay(), pinMode(), digitalWrite()\n', running: false, showTips: false});
            return;
        }

        // Only check device connection if there are hardware commands
        const needsDevice = commands.some(c => c.type === 'cmd');
        if (needsDevice) {
            const hasDevice = !!(window.__serialWriter || window.__bleCharacteristic || (window.__hardwareConnection && window.__hardwareConnection.sendCommand));
            if (!hasDevice) {
                this.setState({output: '⚠ No Arduino connected!\nClick the USB button in the menu bar to connect first.\n🔌 (print() and delay() work without a device)\n', running: false, showTips: false});
                return;
            }
        }

        // Execute commands sequentially with real delays
        this.appendOutput('▶ Running...\n');
        this._executeQueue(commands, 0);
    }

    _executeQueue (commands, index) {
        if (index >= commands.length || !this._running) {
            const total = commands.filter(c => c.type !== 'info').length;
            this.appendOutput('\n✓ Finished! Ran ' + total + ' command' + (total !== 1 ? 's' : '') + '\n');
            this._running = false;
            this.setState({running: false});
            return;
        }

        const cmd = commands[index];
        if (cmd.type === 'cmd') {
            this.sendToDevice(cmd.data);
            this.appendOutput('  → ' + cmd.text + '\n');
            this._executeQueue(commands, index + 1);
        } else if (cmd.type === 'delay') {
            const sec = cmd.ms >= 1000 ? (cmd.ms / 1000) + 's' : cmd.ms + 'ms';
            this.appendOutput('  ⏳ Waiting ' + sec + '...\n');
            setTimeout(() => this._executeQueue(commands, index + 1), cmd.ms);
        } else if (cmd.type === 'print') {
            let display = cmd.text;
            if (/^[\d\s+\-*/().]+$/.test(display)) {
                try { display = eval(display); } catch (e) {}
            }
            this.appendOutput('  ' + display + '\n');
            this._executeQueue(commands, index + 1);
        }
    }

    handleStop () { this._running = false; this.setState({running: false}); this.appendOutput('⏹ Stopped.\n'); }
    handleClear () { this.setState({output: '', showTips: false}); }
    handleClearScreen () { if (this.cmInstance) this.cmInstance.setValue(''); this.setState({output: '', showTips: false}); }

    handleClearBoard () {
        const port = this._getConnectedPort();
        this.setState({output: '', showTips: false});
        const BACKEND_PORT = 3001;
        const API = window.location.protocol + '//' + window.location.hostname + ':' + BACKEND_PORT + '/api';
        const normalizePort = (p) => (p || '').toUpperCase().replace(/^COM(\d+)$/, 'COM$1');
        const doClear = (resolvedPort) => {
            if (!resolvedPort) {
                resolvedPort = prompt('Enter COM port (e.g. COM5):');
                if (!resolvedPort) return;
            }
            resolvedPort = normalizePort(resolvedPort);
            this.appendOutput('>>> Clearing board on ' + resolvedPort + '...\n');
            fetch(API + '/compiler/clear-board', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ port: resolvedPort })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    this.appendOutput('>>> Board cleared! Empty sketch uploaded.\n');
                } else {
                    this.appendOutput('>>> ERROR: ' + (data.error || 'Unknown error') + '\n');
                }
            })
            .catch(err => {
                this.appendOutput('>>> ERROR: ' + err.message + '\n');
                this.appendOutput('>>> Make sure backend server is running on port 3001\n');
            });
        };
        // Disconnect Web Serial first so avrdude can access the port
        const doClearAfterDisconnect = () => {
            if (!port || port === 'auto' || port === 'web-serial') {
                fetch(API + '/driver/find', { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.found && data.port) {
                        doClear(data.port);
                    } else {
                        this.appendOutput('>>> Could not detect Arduino.\n');
                        doClear(null);
                    }
                })
                .catch(() => doClear(null));
            } else {
                doClear(port);
            }
        };
        if (window.__hardwareConnection && window.__hardwareConnection.disconnect) {
            this.appendOutput('>>> Disconnecting Web Serial...\n');
            window.__hardwareConnection.disconnect().then(doClearAfterDisconnect);
        } else {
            doClearAfterDisconnect();
        }
    }

    handleUpload () {
        const code = this.getCode();
        this.setState({output: '>>> Compiling and uploading to Arduino...\n', showTips: false});

        // First disconnect Web Serial so arduino-cli can access the port
        const port = this._getConnectedPort();

        if (window.__hardwareConnection && window.__hardwareConnection.disconnect) {
            window.__hardwareConnection.disconnect().then(() => {
                this._doCompileUpload(code, port);
            });
        } else {
            this._doCompileUpload(code, port);
        }
    }

    _getConnectedPort () {
        if (window.__hardwareConnection && window.__hardwareConnection.port) {
            return window.__hardwareConnection.port;
        }
        if (window.__serialPort) {
            try {
                const info = window.__serialPort.getInfo();
                if (info && info.usbVendorId) return 'auto';
            } catch (_) {}
        }
        return 'auto';
    }

    _doCompileUpload (code, port) {
        const BACKEND_PORT = 3001;
        const API = window.location.protocol + '//' + window.location.hostname + ':' + BACKEND_PORT + '/api';

        const BOARD_FQBN = {
            arduino_uno: 'arduino:avr:uno',
            arduino_nano: 'arduino:avr:nano',
            arduino_mega: 'arduino:avr:mega:cpu=atmega2560',
            esp32: 'esp32:esp32:esp32'
        };
        const selectedBoard = window._selectedBoard || 'arduino_uno';
        const fqbn = BOARD_FQBN[selectedBoard] || 'arduino:avr:uno';

        const normalizePort = (p) => (p || '').toUpperCase().replace(/^COM(\d+)$/, 'COM$1');
        const doUpload = (resolvedPort) => {
            if (!resolvedPort) {
                resolvedPort = prompt('Enter your Arduino COM port (e.g. COM5):');
                if (!resolvedPort) {
                    this.appendOutput('>>> Upload cancelled.\n');
                    return;
                }
            }
            resolvedPort = normalizePort(resolvedPort);

            this.appendOutput('>>> Step 1: Converting Python to C++...\n');

            fetch(API + '/compiler/compile-upload', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ code, port: resolvedPort, board: fqbn })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    this.appendOutput('>>> Step 2: Compiled successfully!\n');
                    this.appendOutput('>>> Step 3: Uploaded to Arduino!\n');
                    this.appendOutput('>>> DONE! Program is now running on your Arduino.\n');
                } else {
                    this.appendOutput('>>> ERROR: ' + (data.error || 'Unknown error') + '\n');
                }
            })
            .catch(err => {
                this.appendOutput('>>> ERROR: ' + err.message + '\n');
                this.appendOutput('>>> Make sure the backend server is running (cd backend && node src/index.js)\n');
            });
        };

        if (!port || port === 'auto' || port === 'web-serial') {
            this.appendOutput('>>> Auto-detecting Arduino port...\n');
            fetch(API + '/driver/find', { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.found && data.port) {
                        this.appendOutput('>>> Found Arduino on ' + data.port + '\n');
                        doUpload(data.port);
                    } else {
                        this.appendOutput('>>> Could not auto-detect port.\n');
                        doUpload(null);
                    }
                })
                .catch(() => {
                    this.appendOutput('>>> Auto-detect failed.\n');
                    doUpload(null);
                });
        } else {
            doUpload(port);
        }
    }

    handleSerialSend () {
        const msg = this.state.serialInput.trim();
        if (!msg) return;
        this.sendToDevice(msg);
        this.appendOutput('> ' + msg + '\n');
        this.setState({serialInput: ''});
    }

    transpileCode () {
        const code = this.getCode();
        if (!code.trim()) {
            this.appendOutput('⚠ No code to transpile!\n');
            return;
        }
        this.setState({showCpp: !this.state.showCpp}, () => {
            if (!this.state.showCpp) return;
            const BACKEND_PORT = 3001;
            const API = window.location.protocol + '//' + window.location.hostname + ':' + BACKEND_PORT + '/api';
            this.appendOutput('⏳ Transpiling to C++...\n');
            fetch(API + '/compiler/transpile', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ code })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success && data.cppCode) {
                    this.setState({cppCode: data.cppCode});
                    this.appendOutput('✓ C++ code generated!\n');
                } else {
                    this.setState({cppCode: '// Error: ' + (data.error || 'Unknown error') + '\n'});
                }
            })
            .catch(err => {
                this.setState({cppCode: '// Error: ' + err.message + '\n'});
            });
        });
    }

    handleNewFile () {
        if (this.cmInstance) this.cmInstance.setValue('from board import *\n\n');
        this.setState({output: ''});
    }

    insertSnippet (code) {
        if (!this.cmInstance) return;
        const cm = this.cmInstance;
        const cur = cm.getCursor();
        cm.replaceRange(code + '\n', cur);
        cm.focus();
    }

    loadExample (name) {
        if (!this.cmInstance || !EXAMPLES[name]) return;
        this.cmInstance.setValue(EXAMPLES[name]);
        this.setState({output: '', showExamples: false});
    }

    handleSaveFile () {
        const code = this.getCode();
        const blob = new Blob([code], {type: 'text/plain'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'main.py';
        a.click();
        this.appendOutput('>>> File saved.\n');
    }

    handleOpenFile () {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.py,.txt';
        input.onchange = e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => { if (this.cmInstance) this.cmInstance.setValue(ev.target.result); };
            reader.readAsText(file);
        };
        input.click();
    }

    render () {
        const S = styles;
        return (
            <div style={S.root}>
                {/* Top Toolbar */}
                <div style={S.toolbar}>
                    <div style={S.toolGroup}>
                        <button onClick={() => this.handleNewFile()} style={S.btn} title="New File">New</button>
                        <button onClick={() => this.handleOpenFile()} style={S.btn} title="Open File">Open</button>
                        <button onClick={() => this.handleSaveFile()} style={S.btn} title="Save (Ctrl+S)">Save</button>
                    </div>
                    <div style={S.sep} />
                    {/* Mode Toggle (mBlock-style) */}
                    <div style={S.modeToggle}>
                        <button
                            onClick={() => this.setState({mode: 'upload'})}
                            style={this.state.mode === 'upload' ? S.modeActive : S.modeBtn}
                        >Offline</button>
                        <button
                            onClick={() => this.setState({mode: 'live'})}
                            style={this.state.mode === 'live' ? S.modeActive : S.modeBtn}
                        >Live</button>
                    </div>
                    <div style={S.sep} />
                    <div style={S.toolGroup}>
                        <button onClick={() => this.handleRun()} disabled={this.state.running}
                            style={{...S.btn, background:'#4caf50', color:'#fff', fontWeight:700}}>
                            {this.state.mode === 'live' ? '\u25B6 Run' : '\u25B6 Run'}
                        </button>
                        <button onClick={() => this.handleStop()} style={{...S.btn, background:'#f44336', color:'#fff'}}>Stop</button>
                        <button onClick={() => this.handleUpload()} style={{...S.btn, background:'#ff9800', color:'#fff'}}>Upload</button>
                        <button onClick={() => this.handleClearBoard()} style={{...S.btn, background:'#f44336', color:'#fff'}}>Clear Board</button>
                        <button onClick={() => this.handleClearScreen()} style={S.btn}>Clear Screen</button>
                    </div>
                    <div style={S.sep} />
                    <span style={{fontSize:'10px',color:'#888'}}>Ctrl+Enter: Run | Shift+Enter: Live Exec | Ctrl+Space: Autocomplete</span>
                    <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
                        <button onClick={() => this.setState(p => ({showSnippets: !p.showSnippets}))}
                            style={this.state.showSnippets ? S.toggleOn : S.btn}>Snippets</button>
                        <button onClick={() => this.setState(p => ({showExamples: !p.showExamples}))}
                            style={this.state.showExamples ? S.toggleOn : S.btn}>Examples</button>
                        <button onClick={() => this.setState(p => ({showPlotter: !p.showPlotter}))}
                            style={this.state.showPlotter ? S.toggleOn : S.btn}>Plotter</button>
                        <button onClick={() => this.transpileCode()}
                            style={this.state.showCpp ? S.toggleOn : S.btn}>C++</button>
                        <div style={S.sep} />
                        <span style={{width:'8px',height:'8px',borderRadius:'50%',background:this.state.connected?'#4caf50':'#f44336',display:'inline-block'}} />
                        <span style={{fontSize:'11px',color:this.state.connected?'#a6e22e':'#f92672'}}>
                            {this.state.connected ? 'Connected' : 'No Device'}
                        </span>
                    </div>
                </div>

                {/* Main Body */}
                <div style={S.body}>
                    {/* Snippets Panel (left sidebar, mBlock-style) */}
                    {this.state.showSnippets && (
                        <div style={S.snippetPanel}>
                            <div style={S.snippetTitle}>Code Snippets</div>
                            <div style={S.snippetScroll}>
                                {Object.entries(CODE_SNIPPETS).map(([cat, items]) => (
                                    <div key={cat}>
                                        <div style={S.snippetCat}>{cat}</div>
                                        {items.map((s, i) => (
                                            <button key={i} style={S.snippetBtn}
                                                onClick={() => this.insertSnippet(s.code)}
                                                title={s.code}>{s.label}</button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Editor Area */}
                    <div style={S.editorArea}>
                        <div style={S.fileTab}>
                            <span style={S.fileTabActive}>main.py</span>
                            <span style={{fontSize:'10px',color:'#666',marginLeft:'auto'}}>
                                {this.state.mode === 'live' ? 'Live Mode (REPL)' : 'Upload Mode'}
                            </span>
                        </div>
                        <div ref={this.editorRef} style={S.editorContainer} />
                        {!this.state.cmLoaded && <div style={S.loading}>Loading editor...</div>}
                    </div>

                    {/* Right Panel: Terminal + Plotter */}
                    <div style={S.rightPanel}>
                        {/* Examples dropdown */}
                        {this.state.showExamples && (
                            <div style={S.examplesPanel}>
                                <div style={S.snippetTitle}>Examples</div>
                                {Object.keys(EXAMPLES).map(name => (
                                    <button key={name} style={S.snippetBtn}
                                        onClick={() => this.loadExample(name)}>{name}</button>
                                ))}
                            </div>
                        )}
                        {/* Serial Monitor / Terminal */}
                        <div style={S.terminalWrap}>
                            <div style={S.terminalHeader}>
                                <span>🖥 Output</span>
                                <button onClick={() => this.handleClear()} style={S.smallBtn}>Clear</button>
                            </div>
                            <pre style={S.terminal}>
                                {this.state.output || (this.state.showTips ? '▶ Press Run to see your output here!\n💡 Try: print("Hello!"), print(1+2), delay(1000)' : '')}
                            </pre>
                            <div style={S.serialInputRow}>
                                <input style={S.serialInput}
                                    value={this.state.serialInput}
                                    onChange={e => this.setState({serialInput: e.target.value})}
                                    onKeyDown={e => e.key === 'Enter' && this.handleSerialSend()}
                                    placeholder="Type a message to send..." />
                                <button onClick={() => this.handleSerialSend()} style={S.smallBtn}>Send</button>
                            </div>
                        </div>

                        {/* Plotter (mBlock-style data visualization) */}
                        {this.state.showPlotter && (
                            <div style={S.plotterWrap}>
                                <div style={S.terminalHeader}><span>Data Plotter</span></div>
                                <div style={S.plotter}>
                                    {this.state.plotData.length === 0
                                        ? <span style={{color:'#666',fontSize:'11px'}}>Waiting for numeric data...</span>
                                        : <canvas ref={el => this._drawPlot(el)} width={280} height={100} style={{width:'100%',height:'100%'}} />
                                    }
                                </div>
                            </div>
                        )}

                        {/* C++ Code View */}
                        {this.state.showCpp && (
                            <div style={{display:'flex',flexDirection:'column',borderTop:'2px solid #e67e22',flex:1}}>
                                <div style={S.terminalHeader}>
                                    <span>Generated C++ Code</span>
                                    <button onClick={() => this.setState({showCpp: false})} style={S.smallBtn}>Close</button>
                                </div>
                                <pre style={{...S.terminal,fontSize:'12px',background:'#1e1e2e',color:'#d4d4d4',flex:1,overflow:'auto'}}>
                                    {this.state.cppCode || 'Press "C++" button to transpile...'}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Bar */}
                <div style={S.statusBar}>
                    <span>Python 3 (MicroPython)</span>
                    <span>UTF-8</span>
                    <span>Spaces: 4</span>
                    <span>{this.state.mode === 'live' ? 'Live Mode' : 'Upload Mode'}</span>
                    <span style={{marginLeft:'auto'}}>The STEM Educator</span>
                </div>
            </div>
        );
    }

    _drawPlot (canvas) {
        if (!canvas || this.state.plotData.length < 2) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const data = this.state.plotData;
        const allVals = data.flatMap(d => d.values);
        const min = Math.min(...allVals), max = Math.max(...allVals);
        const range = max - min || 1;
        ctx.strokeStyle = '#a6e22e'; ctx.lineWidth = 1.5; ctx.beginPath();
        data.forEach((d, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - ((d.values[0] - min) / range) * h;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
}

// ===== STYLES =====
const styles = {
    root: {display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'#1e1f1c',fontFamily:'Arial,sans-serif'},
    toolbar: {display:'flex',alignItems:'center',gap:'6px',padding:'5px 10px',background:'#161714',borderBottom:'1px solid #3e3d32',flexShrink:0,flexWrap:'wrap'},
    toolGroup: {display:'flex',gap:'4px'},
    sep: {width:'1px',height:'20px',background:'#3e3d32',margin:'0 4px'},
    btn: {padding:'4px 10px',border:'none',borderRadius:'3px',fontSize:'11px',cursor:'pointer',color:'#ccc',background:'#3e3d32'},
    toggleOn: {padding:'4px 10px',border:'1px solid #a6e22e',borderRadius:'3px',fontSize:'11px',cursor:'pointer',color:'#a6e22e',background:'#2a2b26'},
    modeToggle: {display:'flex',borderRadius:'4px',overflow:'hidden',border:'1px solid #555'},
    modeBtn: {padding:'3px 12px',border:'none',fontSize:'11px',cursor:'pointer',color:'#aaa',background:'#2a2b26'},
    modeActive: {padding:'3px 12px',border:'none',fontSize:'11px',cursor:'pointer',color:'#fff',background:'#00979D',fontWeight:700},
    body: {display:'flex',flex:1,overflow:'hidden'},
    snippetPanel: {width:'180px',background:'#1a1b17',borderRight:'1px solid #3e3d32',display:'flex',flexDirection:'column',overflow:'hidden'},
    snippetTitle: {padding:'6px 10px',fontSize:'11px',fontWeight:700,color:'#a6e22e',borderBottom:'1px solid #3e3d32'},
    snippetScroll: {flex:1,overflowY:'auto',padding:'4px'},
    snippetCat: {padding:'4px 6px',fontSize:'10px',color:'#f92672',fontWeight:700,marginTop:'6px'},
    snippetBtn: {display:'block',width:'100%',textAlign:'left',padding:'4px 8px',margin:'1px 0',border:'none',borderRadius:'3px',fontSize:'10px',cursor:'pointer',color:'#ccc',background:'transparent'},
    editorArea: {flex:1,display:'flex',flexDirection:'column',minWidth:0},
    fileTab: {display:'flex',alignItems:'center',padding:'3px 12px',background:'#272822',borderBottom:'1px solid #3e3d32',fontSize:'11px',color:'#ccc'},
    fileTabActive: {padding:'2px 10px',background:'#1e1f1c',borderRadius:'3px 3px 0 0',color:'#fff',fontWeight:600},
    editorContainer: {flex:1,overflow:'hidden',position:'relative'},
    loading: {flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#666'},
    rightPanel: {width:'280px',minWidth:'200px',display:'flex',flexDirection:'column',borderLeft:'1px solid #3e3d32'},
    examplesPanel: {borderBottom:'1px solid #3e3d32',padding:'4px',maxHeight:'200px',overflowY:'auto',background:'#1a1b17'},
    terminalWrap: {flex:1,display:'flex',flexDirection:'column'},
    terminalHeader: {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 12px',background:'#161714',borderBottom:'1px solid #3e3d32',fontSize:'12px',color:'#ccc'},
    terminal: {flex:1,margin:0,padding:'12px',overflow:'auto',background:'#1a1b2e',color:'#e0e0e0',fontFamily:'Consolas,Monaco,monospace',fontSize:'14px',lineHeight:'1.8',whiteSpace:'pre-wrap',wordWrap:'break-word'},
    serialInputRow: {display:'flex',borderTop:'1px solid #3e3d32'},
    serialInput: {flex:1,padding:'5px 8px',border:'none',background:'#1a1b17',color:'#ccc',fontSize:'11px',fontFamily:'Consolas,monospace',outline:'none'},
    smallBtn: {padding:'4px 8px',border:'none',background:'#3e3d32',color:'#ccc',fontSize:'10px',cursor:'pointer'},
    plotterWrap: {height:'120px',borderTop:'1px solid #3e3d32',display:'flex',flexDirection:'column'},
    plotter: {flex:1,padding:'6px',background:'#0d0d0d',display:'flex',alignItems:'center',justifyContent:'center'},
    statusBar: {display:'flex',alignItems:'center',padding:'2px 10px',background:'#161714',borderTop:'1px solid #3e3d32',fontSize:'10px',color:'#666',gap:'12px',flexShrink:0},
};

PythonTab.propTypes = {
    vm: PropTypes.object
};

export default PythonTab;
