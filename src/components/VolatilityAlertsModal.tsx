import React, { useState } from 'react';
import { MarketAlertRule, TriggeredAlert, ISOCode } from '../types/market';
import { marketEngine } from '../services/marketSimulator';
import { X, Bell, Plus, Trash2, CheckCircle2, AlertTriangle, Volume2, VolumeX } from 'lucide-react';

interface VolatilityAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertRules: MarketAlertRule[];
  triggeredAlerts: TriggeredAlert[];
}

export const VolatilityAlertsModal: React.FC<VolatilityAlertsModalProps> = ({
  isOpen,
  onClose,
  alertRules,
  triggeredAlerts,
}) => {
  const [activeTab, setActiveTab] = useState<'triggered' | 'rules' | 'create'>('triggered');

  // Form State for new rule
  const [name, setName] = useState('');
  const [iso, setIso] = useState<ISOCode | 'ALL'>('ALL');
  const [metric, setMetric] = useState<MarketAlertRule['metric']>('rtmLmp');
  const [operator, setOperator] = useState<'>' | '<'>('>');
  const [threshold, setThreshold] = useState<number>(100);
  const [severity, setSeverity] = useState<'warning' | 'critical'>('warning');
  const [soundEnabled, setSoundEnabled] = useState(true);

  if (!isOpen) return null;

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    marketEngine.addAlertRule({
      name: name.trim(),
      iso,
      metric,
      operator,
      threshold,
      severity,
      enabled: true,
      soundEnabled,
    });

    setName('');
    setActiveTab('rules');
  };

  const handleTestAudio = () => {
    // Play test audio beep
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      // Audio might be blocked
    }
  };

  const unacknowledgedCount = triggeredAlerts.filter(a => !a.acknowledged).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Price Volatility & Real-Time Grid Alerts
              </h2>
              <p className="text-xs text-slate-400">
                Configure automated volatility detection thresholds for wholesale power markets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('triggered')}
              className={`pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'triggered'
                  ? 'border-emerald-500 text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Live Alert Feed</span>
              {unacknowledgedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold">
                  {unacknowledgedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'rules'
                  ? 'border-emerald-500 text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Configured Rules ({alertRules.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'border-emerald-500 text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Rule</span>
            </button>
          </div>

          <button
            onClick={handleTestAudio}
            title="Test alert notification sound"
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 pb-2 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Sound</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Triggered Live Alerts */}
          {activeTab === 'triggered' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recent Market Volatility Events</span>
                {triggeredAlerts.length > 0 && (
                  <button
                    onClick={() => marketEngine.clearAllAlerts()}
                    className="text-slate-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                  >
                    Clear Feed History
                  </button>
                )}
              </div>

              {triggeredAlerts.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-slate-800 rounded-lg">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-300">All Nodes Within Nominal Volatility Thresholds</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No active price spikes, congestion blowouts, or operating reserve breaches detected in the last scan.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {triggeredAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                        alert.acknowledged
                          ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                          : alert.severity === 'critical'
                          ? 'bg-rose-950/30 border-rose-600/50'
                          : 'bg-amber-950/30 border-amber-600/50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-100">{alert.ruleName}</span>
                            <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-300">{alert.iso}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Triggered at <strong className="font-mono text-slate-200">{alert.value}</strong> (Threshold: {alert.threshold})
                          </p>
                          <span className="text-[10px] font-mono text-slate-500">{alert.timestamp}</span>
                        </div>
                      </div>

                      {!alert.acknowledged && (
                        <button
                          onClick={() => marketEngine.acknowledgeAlert(alert.id)}
                          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors shrink-0 cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Configured Alert Rules */}
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Active Automated Monitoring Rules</span>
                <button
                  onClick={() => setActiveTab('create')}
                  className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Rule
                </button>
              </div>

              <div className="space-y-2">
                {alertRules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 truncate">{rule.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {rule.iso}
                        </span>
                        <span className={`text-[10px] uppercase font-mono px-1 rounded ${
                          rule.severity === 'critical' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'
                        }`}>
                          {rule.severity}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400 mt-1">
                        Condition: {rule.metric} {rule.operator} {rule.threshold}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => marketEngine.updateAlertRule(rule.id, { soundEnabled: !rule.soundEnabled })}
                        title={rule.soundEnabled ? 'Mute sound' : 'Enable audio tone'}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {rule.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-600" />}
                      </button>

                      <button
                        onClick={() => marketEngine.updateAlertRule(rule.id, { enabled: !rule.enabled })}
                        className={`text-xs px-2 py-0.5 rounded font-mono cursor-pointer ${
                          rule.enabled ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {rule.enabled ? 'Active' : 'Muted'}
                      </button>

                      <button
                        onClick={() => marketEngine.deleteAlertRule(rule.id)}
                        className="p-1.5 rounded hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Create Alert Rule Form */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Rule Name / Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., PJM Western Hub Congestion Breach"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Target ISO</label>
                  <select
                    value={iso}
                    onChange={(e) => setIso(e.target.value as ISOCode | 'ALL')}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="ALL">All ISOs</option>
                    <option value="PJM">PJM</option>
                    <option value="ERCOT">ERCOT</option>
                    <option value="CAISO">CAISO</option>
                    <option value="MISO">MISO</option>
                    <option value="NYISO">NYISO</option>
                    <option value="ISONE">ISONE</option>
                    <option value="SPP">SPP</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Metric</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as MarketAlertRule['metric'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="rtmLmp">Real-Time LMP ($/MWh)</option>
                    <option value="spread">DART Spread ($/MWh)</option>
                    <option value="reserveMarginPct">Reserve Margin (%)</option>
                    <option value="volatilityZScore">Volatility Z-Score (σ)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Operator</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as '>' | '<')}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value=">">Greater than (&gt;)</option>
                    <option value="<">Less than (&lt;)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Threshold Value
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as 'warning' | 'critical')}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="warning">Warning (Amber)</option>
                    <option value="critical">Critical (Red)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="soundCheck"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="rounded border-slate-800 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="soundCheck" className="text-xs text-slate-300 cursor-pointer">
                  Play audio synthesizer alert tone when triggered
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded transition-colors cursor-pointer"
                >
                  Save Monitoring Rule
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
