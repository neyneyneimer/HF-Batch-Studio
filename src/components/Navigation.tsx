import React from 'react';
import {
  LayoutDashboard,
  Globe2,
  SlidersHorizontal,
  Layers,
  Image as ImageIcon,
  KeyRound,
  Settings as SettingsIcon,
  Smartphone,
  Monitor,
  Play,
  Pause,
  Plus,
} from 'lucide-react';

export type NavScreen =
  | 'dashboard'
  | 'spaces'
  | 'profiles'
  | 'queue'
  | 'results'
  | 'accounts'
  | 'settings';

interface NavigationProps {
  currentScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  isAndroidFrame: boolean;
  onToggleFrame: () => void;
  queueRunning: boolean;
  queuePaused: boolean;
  queuedCount: number;
  onNewBatchClick: () => void;
  onToggleQueue: () => void;
}

export const TopAppBar: React.FC<NavigationProps> = ({
  currentScreen,
  onNavigate,
  isAndroidFrame,
  onToggleFrame,
  queueRunning,
  queuePaused,
  queuedCount,
  onNewBatchClick,
  onToggleQueue,
}) => {
  const titles: Record<NavScreen, string> = {
    dashboard: 'HF Batch Studio',
    spaces: 'Gradio Spaces',
    profiles: 'Job Profiles',
    queue: 'Batch Queue',
    results: 'Results Gallery',
    accounts: 'Credentials & Keystore',
    settings: 'Settings & Android Core',
  };

  return (
    <header className="h-16 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md px-6 flex items-center justify-between gap-8 shrink-0 z-20">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm tracking-tighter">
          HF
        </div>
        <div>
          <span className="font-semibold text-neutral-100 text-base tracking-tight whitespace-nowrap">
            HF Batch Studio
          </span>
          <span className="hidden sm:inline-block text-xs text-neutral-400 ml-2">
            · {titles[currentScreen]}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links (Desktop) */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-400">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`whitespace-nowrap transition-colors ${
            currentScreen === 'dashboard' ? 'text-amber-400 font-semibold' : 'hover:text-neutral-200'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('spaces')}
          className={`whitespace-nowrap transition-colors ${
            currentScreen === 'spaces' ? 'text-amber-400 font-semibold' : 'hover:text-neutral-200'
          }`}
        >
          Spaces
        </button>
        <button
          onClick={() => onNavigate('profiles')}
          className={`whitespace-nowrap transition-colors ${
            currentScreen === 'profiles' ? 'text-amber-400 font-semibold' : 'hover:text-neutral-200'
          }`}
        >
          Profiles
        </button>
        <button
          onClick={() => onNavigate('queue')}
          className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            currentScreen === 'queue' ? 'text-amber-400 font-semibold' : 'hover:text-neutral-200'
          }`}
        >
          <span>Queue</span>
          {queuedCount > 0 && (
            <span className="text-xs bg-neutral-800 border border-neutral-700 px-1.5 py-0.2 rounded text-neutral-300 font-mono">
              {queuedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onNavigate('results')}
          className={`whitespace-nowrap transition-colors ${
            currentScreen === 'results' ? 'text-amber-400 font-semibold' : 'hover:text-neutral-200'
          }`}
        >
          Results
        </button>
        <button
          onClick={() => onNavigate('accounts')}
          className={`whitespace-nowrap transition-colors ${
            currentScreen === 'accounts' ? 'text-amber-400 font-semibold' : 'hover:text-neutral-200'
          }`}
        >
          Accounts
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className={`whitespace-nowrap transition-colors ${
            currentScreen === 'settings' ? 'text-amber-400 font-semibold' : 'hover:text-neutral-200'
          }`}
        >
          Settings
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Android Device Frame Toggle */}
        <button
          onClick={onToggleFrame}
          aria-label={isAndroidFrame ? 'Switch to Desktop Layout' : 'Switch to Android Frame'}
          title={isAndroidFrame ? 'Desktop Canvas View' : 'Android Material 3 View'}
          className="p-2 rounded-lg border border-neutral-700 hover:border-neutral-600 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          {isAndroidFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
        </button>

        {/* Queue Pause/Resume Toggle */}
        <button
          onClick={onToggleQueue}
          aria-label={queuePaused ? 'Resume Batch Queue' : 'Pause Batch Queue'}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            queuePaused
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'border-neutral-700 text-neutral-300 hover:border-neutral-600 bg-neutral-800'
          }`}
        >
          {queuePaused ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Queue</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Queue</span>
            </>
          )}
        </button>

        {/* Primary Action Button */}
        <button
          onClick={onNewBatchClick}
          className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Batch</span>
        </button>
      </div>
    </header>
  );
};

export const NavigationRail: React.FC<{
  currentScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  queuedCount: number;
}> = ({ currentScreen, onNavigate, queuedCount }) => {
  const items: Array<{ id: NavScreen; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'spaces', label: 'Spaces', icon: <Globe2 className="w-5 h-5" /> },
    { id: 'profiles', label: 'Profiles', icon: <SlidersHorizontal className="w-5 h-5" /> },
    { id: 'queue', label: 'Queue', icon: <Layers className="w-5 h-5" />, badge: queuedCount },
    { id: 'results', label: 'Results', icon: <ImageIcon className="w-5 h-5" /> },
    { id: 'accounts', label: 'Accounts', icon: <KeyRound className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-60 border-r border-neutral-800 bg-neutral-950 flex flex-col py-4 shrink-0">
      <div className="px-4 mb-3 text-xs font-semibold text-neutral-300 tracking-wider">
        NAVIGATION
      </div>
      <div className="space-y-1 px-2 flex-1">
        {items.map(item => {
          const active = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-neutral-800/80 text-amber-400 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export const MobileBottomBar: React.FC<{
  currentScreen: NavScreen;
  onNavigate: (screen: NavScreen) => void;
  queuedCount: number;
}> = ({ currentScreen, onNavigate, queuedCount }) => {
  const items: Array<{ id: NavScreen; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'spaces', label: 'Spaces', icon: <Globe2 className="w-4 h-4" /> },
    { id: 'queue', label: 'Queue', icon: <Layers className="w-4 h-4" />, badge: queuedCount },
    { id: 'results', label: 'Results', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <nav className="h-16 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-md flex items-center justify-around px-2 shrink-0 z-20">
      {items.map(item => {
        const active = currentScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg text-xs transition-colors relative ${
              active ? 'text-amber-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute top-0 right-1.5 w-4 h-4 bg-amber-500 text-neutral-950 font-mono text-[10px] font-bold rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
