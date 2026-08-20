import { useState, Fragment } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { Sun, Moon, ChevronDown, Cpu, Circle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import logoImg from '../assets/logo/logo.png';

const BOARDS = [
  { id: 'arduino_uno',  label: 'Arduino Uno' },
  { id: 'arduino_nano', label: 'Arduino Nano' },
  { id: 'arduino_mega', label: 'Arduino Mega 2560' },
  { id: 'esp32',        label: 'ESP32' },
  { id: 'esp32cam',     label: 'ESP32-CAM' },
];

function DropdownMenu({ label, items, prefix }) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-1 px-3 h-10 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors rounded">
        {prefix}
        {label}
        <ChevronDown size={11} className="ml-0.5 opacity-50" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 top-full mt-0.5 w-52 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 py-1 outline-none">
          {items.map((item, i) =>
            item === null ? (
              <div key={`sep-${i}`} className="my-1 border-t border-slate-700" />
            ) : (
              <Menu.Item key={item.label}>
                {({ active }) => (
                  <button
                    onClick={item.action}
                    disabled={item.disabled}
                    className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                      item.disabled
                        ? 'text-slate-600 cursor-not-allowed'
                        : active
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                )}
              </Menu.Item>
            )
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

function MenuBar({ theme, setTheme, selectedBoard, setSelectedBoard }) {
  const navigate = useNavigate();
  const { connected, serialPorts } = useSocket();

  const connectedPort = serialPorts?.[0]?.path;

  const fileItems = [
    { label: 'New Project',  action: () => {} },
    { label: 'Open Project', action: () => {} },
    { label: 'Save Project', action: () => {} },
    null,
    { label: 'Dashboard',    action: () => navigate('/') },
    { label: 'Block Editor', action: () => window.location.href = '/editor.html' },
    { label: 'Firmware',     action: () => navigate('/firmware') },
    { label: 'Settings',     action: () => navigate('/settings') },
  ];

  const editItems = [
    { label: 'Undo', action: () => {}, disabled: true },
    { label: 'Redo', action: () => {}, disabled: true },
    null,
    { label: 'Select All', action: () => {} },
  ];

  const helpItems = [
    { label: 'Getting Started', action: () => window.open(window.location.origin, '_blank') },
    { label: 'Documentation',   action: () => window.open(window.location.origin, '_blank') },
    null,
    { label: 'About', action: () => navigate('/settings') },
  ];

  const boardItems = BOARDS.map((b) => ({
    label: b.label,
    action: () => setSelectedBoard(b),
  }));

  const accountItems = [
    { label: 'Account', action: () => {}, disabled: true },
  ];

  return (
    <header className="flex items-center h-10 bg-slate-900 border-b border-slate-700 px-2 shrink-0 gap-0.5">
      {/* Logo */}
      <a
        href={window.location.origin}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center pr-3 pl-1"
      >
        <img src={logoImg} alt="Logo" className="h-6 object-contain" />
      </a>

      {/* Menus */}
      <DropdownMenu label="File" items={fileItems} />
      <DropdownMenu label="Edit" items={editItems} />
      <DropdownMenu label="Help" items={helpItems} />
      <DropdownMenu label="Account" items={accountItems} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Board selector */}
      <DropdownMenu
        label={selectedBoard.label}
        items={boardItems}
        prefix={<Cpu size={13} className="mr-1.5 text-slate-400" />}
      />

      {/* Device status pill */}
      <div className="flex items-center gap-1.5 px-3 h-6 rounded bg-slate-800 border border-slate-700 text-xs text-slate-400 mx-1">
        <Circle
          size={7}
          className={connected ? 'fill-green-400 text-green-400' : 'fill-slate-600 text-slate-600'}
        />
        <span>{connected && connectedPort ? connectedPort : connected ? 'Connected' : 'No Device'}</span>
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white ml-0.5"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}

function Layout({ theme, setTheme }) {
  const [selectedBoard, setSelectedBoard] = useState(BOARDS[0]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 text-white">
      <MenuBar
        theme={theme}
        setTheme={setTheme}
        selectedBoard={selectedBoard}
        setSelectedBoard={setSelectedBoard}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
