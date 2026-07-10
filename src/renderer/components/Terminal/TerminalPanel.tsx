import React, { useEffect, useRef } from 'react';

const TerminalPanel: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !terminalRef.current) return;
    initialized.current = true;

    const initTerminal = async () => {
      try {
        // Dynamic imports for xterm
        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        // Import xterm CSS
        const linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css';
        document.head.appendChild(linkEl);

        const term = new Terminal({
          theme: {
            background: '#0a0a0f',
            foreground: '#e4e4ed',
            cursor: '#6366f1',
            cursorAccent: '#0a0a0f',
            selectionBackground: 'rgba(99, 102, 241, 0.3)',
            black: '#1c1c28',
            red: '#ef4444',
            green: '#22c55e',
            yellow: '#f59e0b',
            blue: '#3b82f6',
            magenta: '#a855f7',
            cyan: '#06b6d4',
            white: '#e4e4ed',
            brightBlack: '#5c5f73',
            brightRed: '#f87171',
            brightGreen: '#4ade80',
            brightYellow: '#fbbf24',
            brightBlue: '#60a5fa',
            brightMagenta: '#c084fc',
            brightCyan: '#22d3ee',
            brightWhite: '#ffffff',
          },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          cursorBlink: true,
          cursorStyle: 'bar',
          scrollback: 5000,
          allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current!);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Resize observer
        const resizeObserver = new ResizeObserver(() => {
          try {
            fitAddon.fit();
          } catch {
            // Ignore resize errors
          }
        });
        resizeObserver.observe(terminalRef.current!);

        // Connect to backend terminal
        if (window.electronAPI) {
          const terminalId = 'main-terminal';

          await window.electronAPI.terminal.create(terminalId);

          term.onData((data: string) => {
            window.electronAPI.terminal.write(terminalId, data);
          });

          window.electronAPI.terminal.onData((id: string, data: string) => {
            if (id === terminalId) {
              term.write(data);
            }
          });

          term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
            window.electronAPI.terminal.resize(terminalId, cols, rows);
          });
        } else {
          // Development fallback
          term.writeln('\x1b[1;36m╔══════════════════════════════════════╗\x1b[0m');
          term.writeln('\x1b[1;36m║       \x1b[1;35mReagen AI Terminal\x1b[1;36m             ║\x1b[0m');
          term.writeln('\x1b[1;36m╚══════════════════════════════════════╝\x1b[0m');
          term.writeln('');
          term.writeln('\x1b[33m⚡ Terminal connected to AI-powered shell\x1b[0m');
          term.writeln('\x1b[90mType commands or let AI agents run them for you.\x1b[0m');
          term.writeln('');
          term.write('\x1b[1;32m❯ \x1b[0m');

          let currentLine = '';
          term.onData((data: string) => {
            if (data === '\r') {
              term.writeln('');
              if (currentLine.trim()) {
                term.writeln(`\x1b[90m$ ${currentLine}\x1b[0m`);
                term.writeln(`\x1b[33mCommand will execute when running as desktop app.\x1b[0m`);
              }
              currentLine = '';
              term.write('\x1b[1;32m❯ \x1b[0m');
            } else if (data === '\x7f') {
              if (currentLine.length > 0) {
                currentLine = currentLine.slice(0, -1);
                term.write('\b \b');
              }
            } else if (data >= ' ') {
              currentLine += data;
              term.write(data);
            }
          });
        }
      } catch (error) {
        console.error('Failed to initialize terminal:', error);
        if (terminalRef.current) {
          terminalRef.current.innerHTML = `
            <div style="padding: 16px; color: #8b8fa3; font-family: 'JetBrains Mono', monospace; font-size: 12px;">
              <p>⚠️ Terminal initialization failed.</p>
              <p style="color: #5c5f73; margin-top: 8px;">Install xterm: npm install @xterm/xterm @xterm/addon-fit</p>
            </div>
          `;
        }
      }
    };

    initTerminal();

    return () => {
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="terminal-container" ref={terminalRef} />
  );
};

export default TerminalPanel;
