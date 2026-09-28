import React from 'react';
import { Bell, Play, Pause, Cpu, BookOpen, AlertTriangle } from 'lucide-react';
import { TriggeredAlert } from '../types/market';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  latencyMs: number;
  unacknowledgedAlerts: TriggeredAlert[];
  onOpenAlerts: () => void;
  onOpenScenarios: () => void;
  onOpenArchitecture: () => void;
  onOpenTraderGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isStreaming,
  onToggleStreaming,
  latencyMs,
  unacknowledgedAlerts,
  onOpenAlerts,
  onOpenScenarios,
  onOpenArchitecture,
  onOpenTraderGuide,
}) => {
  const [currentTime, setCurrentTime] = React.useState<string>('');

  React.useEffect(() => {
    const update = () => {
      const now = new Date();
      const utc = now.toUTCString().slice(17, 25);
      const est = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false });
      setCurrentTime(`${est} EST · ${utc} UTC`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const navItems = [
    { id: 'overview', label: '1) OVERVIEW' },
    { id: 'sentiment', label: '2) AI SENTIMENT' },
    { id: 'map', label: '3) LMP MAP' },
    { id: 'forecast', label: '4) FORECAST' },
    { id: 'hubs', label: '5) TRADE DESK' },
    { id: 'spark', label: '6) SPARK SPREAD' },
  ];

  const hasCritical = unacknowledgedAlerts.some(a => a.severity === 'critical');

  return (
    <header className="border-b border-[#1e2638] bg-[#070a0f] sticky top-0 z-40">
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 xl:px-8 h-12 flex items-center justify-between gap-4 font-mono">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setActiveTab('overview')} 
            className="text-left group cursor-pointer focus:outline-none flex items-center gap-1.5"
          >
            <span className="text-sm font-bold tracking-wider text-[#ff9900] group-hover:text-amber-300 transition-colors uppercase">
              GRIDPULSE<span className="text-white">&lt;GO&gt;</span>
            </span>
          </button>
          <span className="hidden lg:inline text-[11px] text-slate-400 font-mono tracking-tight">
            {currentTime}
          </span>
        </div>

        {/* Zone 2: Navigation Links in Bloomberg Monospace style */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xs transition-colors whitespace-nowrap cursor-pointer uppercase tracking-tight ${
                  isActive
                    ? 'bg-[#182338] text-[#ff9900] border-b-2 border-[#ff9900]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#111724]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions & Modal Triggers */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Stream status indicator button */}
          <button
            onClick={onToggleStreaming}
            title={isStreaming ? 'Pause live market feed' : 'Resume live market feed'}
            className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono rounded-xs border border-[#1e2638] bg-[#0d131f] hover:bg-[#182338] text-slate-300 transition-colors cursor-pointer"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-[#00ff66] animate-pulse' : 'bg-[#ff9900]'}`} />
            <span className="hidden sm:inline">{isStreaming ? `${latencyMs}ms` : 'PAUSED'}</span>
            {isStreaming ? <Pause className="w-3 h-3 text-slate-400" /> : <Play className="w-3 h-3 text-[#00ff66]" />}
          </button>

          {/* Scenarios / Stress Test Simulator */}
          <button
            onClick={onOpenScenarios}
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold text-amber-300 bg-[#0d131f] hover:bg-[#182338] border border-[#1e2638] rounded-xs transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3 h-3 text-[#ff9900]" />
            <span>&lt;STRESS&gt;</span>
          </button>

          {/* Trader Guide / Education button */}
          <button
            onClick={onOpenTraderGuide}
            title="Energy Markets Primer for Traders"
            className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold text-cyan-300 bg-[#0d131f] hover:bg-[#182338] border border-[#1e2638] rounded-xs transition-colors cursor-pointer"
          >
            <BookOpen className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">&lt;PRIMER&gt;</span>
          </button>

          {/* AWS Architecture Modal */}
          <button
            onClick={onOpenArchitecture}
            title="AWS Backend Architecture Specifications"
            className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold text-purple-300 bg-[#0d131f] hover:bg-[#182338] border border-[#1e2638] rounded-xs transition-colors cursor-pointer"
          >
            <Cpu className="w-3 h-3 text-purple-400" />
            <span>&lt;AWS&gt;</span>
          </button>

          {/* Custom Alerts Modal Trigger */}
          <button
            onClick={onOpenAlerts}
            className={`relative flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-xs transition-colors cursor-pointer ${
              unacknowledgedAlerts.length > 0
                ? hasCritical 
                  ? 'bg-rose-950/80 border border-rose-600/80 text-rose-200 animate-pulse'
                  : 'bg-amber-950/80 border border-amber-600/80 text-amber-200'
                : 'bg-[#0d131f] hover:bg-[#182338] border border-[#1e2638] text-slate-300'
            }`}
          >
            <Bell className={`w-3 h-3 ${unacknowledgedAlerts.length > 0 ? (hasCritical ? 'text-rose-400' : 'text-[#ff9900]') : 'text-slate-400'}`} />
            <span className="font-mono">{unacknowledgedAlerts.length}</span>
            <span className="hidden sm:inline">ALERTS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
