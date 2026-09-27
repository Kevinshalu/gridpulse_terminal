import React from 'react';
import { MarketScenario } from '../types/market';
import { MARKET_SCENARIOS } from '../data/isoRegions';
import { X, Play, Zap, Check, BookOpen, AlertTriangle } from 'lucide-react';

interface ScenarioSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  currentScenario: MarketScenario;
  onSelectScenario: (scenarioId: string) => void;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  isOpen,
  onClose,
  currentScenario,
  onSelectScenario,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Interactive Grid Stress Tests & Market Scenarios
              </h2>
              <p className="text-xs text-slate-400">
                Simulate historical power grid extremes and learn wholesale electricity dynamics hands-on
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

        {/* Scenarios List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {MARKET_SCENARIOS.map((scenario) => {
            const isActive = currentScenario.id === scenario.id;

            return (
              <div
                key={scenario.id}
                className={`p-4 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-slate-950 border-emerald-500/60 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">{scenario.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                        {scenario.targetISO}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> ACTIVE SCENARIO
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-amber-400/90 font-medium block mt-0.5">
                      {scenario.subtitle}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectScenario(scenario.id);
                      onClose();
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    <span>{isActive ? 'Currently Active' : 'Inject Scenario'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  {scenario.description}
                </p>

                <div className="mt-3 p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 mb-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Commodity Power Trader Mechanics & Arbitrage:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {scenario.traderTakeaway}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
