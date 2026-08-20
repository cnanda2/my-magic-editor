class PythonTranspiler {
  constructor() {
    this.indent = '    ';
  }

  isBlockOpener(trimmed) {
    return /^(for\s|while\s|if\s|elif\s|else:|def\s|class\s)/.test(trimmed);
  }

  getIndent(raw) {
    const m = raw.match(/^(\s*)/);
    return m ? m[1].length : 0;
  }

  transpile(pythonCode) {
    const lines = pythonCode.split('\n');
    const servoPins = new Set();
    const globalVars = new Set();

    for (const line of lines) {
      const m = line.match(/servo[Ww]rite\((\d+)/i);
      if (m) servoPins.add(+m[1]);
      const vm = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (vm && !/^(for|while|if|elif|else|def|class|import|from|print|pinMode|digital|analog|servo|tone|noTone|delay)/.test(line)) {
        globalVars.add(vm[1]);
      }
    }

    const contentLines = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#') ||
          /^(import |from )/.test(trimmed)) continue;
      contentLines.push({ raw, trimmed, indent: this.getIndent(raw) });
    }

    // Routing logic:
    // - pinMode() at root level (indent 0) → setup (configuration)
    // - while True: splits: before → setup, indented children → loop
    // - Everything else → loop (actions run repeatedly)
    let setupContent, loopContent;
    const loopStart = contentLines.findIndex(cl => cl.trimmed === 'while True:');
    if (loopStart >= 0) {
      setupContent = contentLines.slice(0, loopStart);
      loopContent = [];
      const loopIndent = contentLines[loopStart].indent;
      for (let i = loopStart + 1; i < contentLines.length; i++) {
        if (contentLines[i].indent > loopIndent) {
          loopContent.push(contentLines[i]);
        }
      }
      // Also add any root-level pinMode that might be in the original code after while True:
      // (edge case: pinMode at indent 0 after while True: should still go to setup)
      for (let i = loopStart + 1; i < contentLines.length; i++) {
        if (contentLines[i].indent === 0 && /^pinMode\(/i.test(contentLines[i].trimmed)) {
          setupContent.push(contentLines[i]);
          const idx = loopContent.indexOf(contentLines[i]);
          if (idx >= 0) loopContent.splice(idx, 1);
        }
      }
    } else {
      // No while True: — route root-level pinMode to setup, rest to loop
      setupContent = [];
      loopContent = [];
      for (const cl of contentLines) {
        if (cl.indent === 0 && /^pinMode\(/i.test(cl.trimmed)) {
          setupContent.push(cl);
        } else {
          loopContent.push(cl);
        }
      }
    }

    const buildSection = (content) => {
      const out = [];
      const blocks = [];

      for (let ci = 0; ci < content.length; ci++) {
        const { raw, trimmed } = content[ci];
        const isElse = (trimmed === 'else:' || /^elif\s/.test(trimmed));
        const pyLevel = this.getIndent(raw) / 4;

        if (!isElse) {
          while (blocks.length > 0 && pyLevel < blocks.length) {
            const closeLevel = blocks.length;
            blocks.pop();
            out.push(this.indent.repeat(closeLevel) + '}');
          }
        }

        let cpp = this.transpileLine(trimmed, servoPins);
        if (!cpp) continue;

        const depth = isElse ? blocks.length : blocks.length + 1;
        const cppIndent = this.indent.repeat(depth);
        cpp = cppIndent + cpp.slice(this.indent.length);

        const varName = trimmed.split('=')[0].trim();
        if (globalVars.has(varName) && !/^(for|while|if|elif|else)/.test(trimmed)) {
          cpp = cpp.replace(/\bint\s+/, '');
        }

        out.push(cpp);

        if (this.isBlockOpener(trimmed)) {
          if (isElse) {
            blocks.pop();
            blocks.push({ indent: pyLevel });
          } else {
            blocks.push({ indent: pyLevel });
          }
        }
      }

      while (blocks.length > 0) {
        const closeLevel = blocks.length;
        blocks.pop();
        out.push(this.indent.repeat(closeLevel) + '}');
      }

      return out.join('\n');
    };

    const setupCode = buildSection(setupContent);
    const loopCode = buildSection(loopContent);
    const usesSerial = setupCode.includes('Serial.') || loopCode.includes('Serial.');

    let sketch = '#include <Arduino.h>\n';

    if (servoPins.size > 0) {
      sketch += '#include <Servo.h>\n';
    }

    if (globalVars.size > 0) {
      sketch += '\n';
      for (const v of globalVars) {
        sketch += 'int ' + v + ';\n';
      }
    }

    if (servoPins.size > 0) {
      for (const pin of servoPins) {
        sketch += 'Servo servo_pin' + pin + ';\n';
      }
    }

    sketch += '\nvoid setup() {\n';
    if (usesSerial) {
      sketch += this.indent + 'Serial.begin(115200);\n';
    }
    for (const pin of servoPins) {
      sketch += this.indent + 'servo_pin' + pin + '.attach(' + pin + ');\n';
    }
    if (setupCode) sketch += setupCode + '\n';
    sketch += '}\n';

    sketch += '\nvoid loop() {\n';
    if (loopCode) sketch += loopCode + '\n';
    sketch += '}\n';

    return sketch;
  }

  transpileLine(line, servoPins) {
    let m;

    m = line.match(/pinMode\((\d+),\s*(OUTPUT|INPUT|INPUT_PULLUP)\)/i);
    if (m) return '    pinMode(' + m[1] + ', ' + m[2].toUpperCase() + ');';

    m = line.match(/digitalWrite\((\d+),\s*(true|false|HIGH|LOW|1|0)\)/i);
    if (m) {
      const val = m[2].toLowerCase();
      const cpp = (val === '1' || val === 'high' || val === 'true') ? 'HIGH' : 'LOW';
      return '    digitalWrite(' + m[1] + ', ' + cpp + ');';
    }

    m = line.match(/(\w+)\s*=\s*digitalRead\((\d+)\)/i);
    if (m) return '    int ' + m[1] + ' = digitalRead(' + m[2] + ');';

    m = line.match(/analogWrite\((\d+),\s*(\d+)\)/i);
    if (m) return '    analogWrite(' + m[1] + ', ' + m[2] + ');';

    m = line.match(/(\w+)\s*=\s*analogRead\((\w+)\)/i);
    if (m) return '    int ' + m[1] + ' = analogRead(' + m[2] + ');';

    m = line.match(/servo[Ww]rite\((\d+),\s*(\d+)\)/i);
    if (m) return '    servo_pin' + m[1] + '.write(' + m[2] + ');';

    m = line.match(/tone\((\d+),\s*(\d+)(?:,\s*(\d+))?\)/i);
    if (m) {
      if (m[3]) return '    tone(' + m[1] + ', ' + m[2] + ', ' + m[3] + ');';
      return '    tone(' + m[1] + ', ' + m[2] + ');';
    }

    m = line.match(/noTone\((\d+)\)/i);
    if (m) return '    noTone(' + m[1] + ');';

    m = line.match(/delay\((\d+)\)/i);
    if (m) return '    delay(' + m[1] + ');';

    m = line.match(/print\(["'](.+?)["']\)/);
    if (m) return '    Serial.println("' + m[1] + '");';

    m = line.match(/print\((\w+)\)/);
    if (m) return '    Serial.println(' + m[1] + ');';

    if (/^print\(\s*\)$/.test(line)) return '    Serial.println();';

    m = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (m) return '    int ' + m[1] + ' = ' + m[2] + ';';

    m = line.match(/for\s+(\w+)\s+in\s+range\((\d+),\s*(\d+)(?:,\s*(-?\d+))?\)/);
    if (m) {
      const v = m[1], start = m[2], end = m[3], step = m[4] || '1';
      const op = +step > 0 ? '<' : '>';
      const inc = +step === 1 ? v + '++' : (+step === -1 ? v + '--' : v + '+=' + step);
      return '    for (int ' + v + ' = ' + start + '; ' + v + ' ' + op + ' ' + end + '; ' + inc + ') {';
    }

    m = line.match(/for\s+(\w+)\s+in\s+range\((\d+)\)/);
    if (m) return '    for (int ' + m[1] + ' = 0; ' + m[1] + ' < ' + m[2] + '; ' + m[1] + '++) {';

    m = line.match(/^if\s+(.+):$/);
    if (m) return '    if (' + this.transpileCondition(m[1]) + ') {';

    m = line.match(/^elif\s+(.+):$/);
    if (m) return '    } else if (' + this.transpileCondition(m[1]) + ') {';

    if (line === 'else:') return '    } else {';

    m = line.match(/^while\s+(.+):$/);
    if (m) return '    while (' + this.transpileCondition(m[1]) + ') {';

    if (line === 'pass') return '    // pass';

    return '    // ' + line;
  }

  transpileCondition(cond) {
    return cond
      .replace(/==/g, '==')
      .replace(/!=/g, '!=')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\b/g, '!')
      .replace(/True/g, 'true')
      .replace(/False/g, 'false');
  }
}

module.exports = PythonTranspiler;
