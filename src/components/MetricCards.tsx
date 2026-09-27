import React from 'react';
import { TrendingUp, Zap, Sun, ShieldAlert, AlertCircle } from 'lucide-react';
import { ISORegionData, ISOCode, MarketScenario } from '../types/market';

interface MetricCardsProps {
  isoData: Record<ISOCode, ISORegionData>;
  currentScenario: MarketScenario;
  onResetScenario: () => void;
  selectedISO: ISOCode;
  onSelectISO: (iso: ISOCode) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  isoData,
  currentScenario,
  onResetScenario,
  selectedISO,
  onSelectISO,
}) => {
  const regions = Object.values(isoData);

  const totalDemandMW = regions.reduce((acc, r) => acc + r.currentLoadMW, 0);
  const totalCapacityMW = regions.reduce((acc, r) => acc + r.capacityMW, 0);
  const avgUSLmp = regions.reduce((acc, r) => acc + r.avgLmp * r.currentLoadMW, 0) / totalDemandMW;

  const totalRenewablesMW = regions.reduce((acc, r) => {
    return acc + r.fuelMix.wind + r.fuelMix.solar + r.fuelMix.hydro;
  }, 0);
  const renewablePct = (totalRenewablesMW / totalDemandMW) * 100;

  const minReserveMargin = Math.min(...regions.map(r => r.reserveMarginPct));

  return (
    <div className="space-y-3">
      {/* Active Stress Test Scenario Banner */}
      {currentScenario.id !== 'normal' && (
        <div className="bg-amber-950/40 border border-amber-500/40 px-4 py-2.5 rounded-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">{currentScenario.title} Active:</span>{' '}
              <span className="text-amber-300/80">{currentScenario.description}</span>
            </div>
          </div>
          <button
            onClick={onResetScenario}
            className="text-xs px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 rounded font-medium border border-amber-700/50 cursor-pointer whitespace-nowrap"
          >
            Reset to Baseline
          </button>
        </div>
      )}

      {/* 4 National Grid Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: National Demand */}
        <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total US Grid Demand</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-slate-100 tabular-nums">
              {(totalDemandMW / 1000).toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">GW</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Capacity: {(totalCapacityMW / 1000).toFixed(0)} GW</span>
            <span aria-hidden="true">·</span>
            <span>7 ISOs</span>
          </div>
        </div>

        {/* Metric 2: Average Wholesale LMP */}
        <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Load-Weighted LMP</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${avgUSLmp > 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ${avgUSLmp.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">/MWh</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Spread to DAM: +$3.20</span>
            <span aria-hidden="true">·</span>
            <span>Real-time</span>
          </div>
        </div>

        {/* Metric 3: Total Renewable Generation */}
        <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Renewable Share (Wind+Solar+Hydro)</span>
            <Sun className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-400 tabular-nums">
              {renewablePct.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-400">{(totalRenewablesMW / 1000).toFixed(1)} GW</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Clean dispatch active</span>
            <span aria-hidden="true">·</span>
            <span>Zero marginal cost</span>
          </div>
        </div>

        {/* Metric 4: Grid Reliability & Reserve Margin */}
        <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Tightest Reserve Margin</span>
            <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${minReserveMargin < 8 ? 'text-rose-400' : minReserveMargin < 14 ? 'text-amber-400' : 'text-slate-100'}`}>
              {minReserveMargin.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-400">Operating Reserve</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Nominal target: &gt;15.0%</span>
            <span aria-hidden="true">·</span>
            <span>60.00 Hz avg</span>
          </div>
        </div>
      </div>

      {/* ISO Selector Strip (clean functional tabs) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs text-slate-400 mr-2 shrink-0 font-medium">Select Regional Market:</span>
        {(['PJM', 'ERCOT', 'CAISO', 'MISO', 'NYISO', 'ISONE', 'SPP'] as ISOCode[]).map((iso) => {
          const isSelected = selectedISO === iso;
          const reg = isoData[iso];
          return (
            <button
              key={iso}
              onClick={() => onSelectISO(iso)}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors cursor-pointer shrink-0 flex items-center gap-2 ${
                isSelected
                  ? 'bg-slate-800 text-emerald-400 border-emerald-500/50 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className="font-semibold">{iso}</span>
              <span className="text-[11px] text-slate-400 tabular-nums">${reg.avgLmp.toFixed(1)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
