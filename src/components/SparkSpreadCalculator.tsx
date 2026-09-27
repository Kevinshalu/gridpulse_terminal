import React, { useState } from 'react';
import { ISOCode, ISORegionData } from '../types/market';
import { Flame, Calculator, TrendingUp, HelpCircle } from 'lucide-react';

interface SparkSpreadCalculatorProps {
  isoData: Record<ISOCode, ISORegionData>;
  henryHubPrice: number;
  onUpdateHenryHub: (price: number) => void;
  selectedISO: ISOCode;
}

export const SparkSpreadCalculator: React.FC<SparkSpreadCalculatorProps> = ({
  isoData,
  henryHubPrice,
  onUpdateHenryHub,
  selectedISO,
}) => {
  const [ccgtHeatRate, setCcgtHeatRate] = useState<number>(7100); // Btu/kWh
  const [peakerHeatRate, setPeakerHeatRate] = useState<number>(10200); // Btu/kWh
  const [vomCost, setVomCost] = useState<number>(3.50); // $/MWh
  const [co2Cost, setCo2Cost] = useState<number>(0); // $/ton CO2 (Clean spark spread)

  const activeRegion = isoData[selectedISO];
  const powerPrice = activeRegion.avgLmp;

  // CCGT Calculations
  // Fuel Cost = (HeatRate Btu/kWh / 1000) * GasPrice $/MMBtu
  const ccgtFuelCost = (ccgtHeatRate / 1000) * henryHubPrice;
  const ccgtCarbonCost = (ccgtHeatRate / 1000) * 0.053 * co2Cost; // ~0.053 tons CO2 per MMBtu gas
  const ccgtTotalCost = ccgtFuelCost + vomCost + ccgtCarbonCost;
  const ccgtMargin = powerPrice - ccgtTotalCost;

  // Peaker Calculations
  const peakerFuelCost = (peakerHeatRate / 1000) * henryHubPrice;
  const peakerCarbonCost = (peakerHeatRate / 1000) * 0.053 * co2Cost;
  const peakerTotalCost = peakerFuelCost + (vomCost * 1.5) + peakerCarbonCost;
  const peakerMargin = powerPrice - peakerTotalCost;

  // Breakeven Heat Rate
  const breakevenHeatRate = ((powerPrice - vomCost) / henryHubPrice) * 1000;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Spark Spread & Heat Rate Valuation Model</span>
            </h2>
            <span className="text-xs font-mono text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
              Commodity Trading Desk
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time spark spread arbitrage comparing Natural Gas fuel feedstock against wholesale Power LMP
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Henry Hub Gas Benchmark:</span>
          <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
            ${henryHubPrice.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">/MMBtu</span>
        </div>
      </div>

      {/* Interactive Controls & Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
        <div>
          <label className="text-[11px] text-slate-400 font-medium block mb-1">
            Henry Hub Spot Gas ($/MMBtu)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1.50"
              max="15.00"
              step="0.10"
              value={henryHubPrice}
              onChange={(e) => onUpdateHenryHub(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-200 tabular-nums w-12 text-right">
              ${henryHubPrice.toFixed(2)}
            </span>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 font-medium block mb-1">
            CCGT Heat Rate (Btu/kWh)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="6200"
              max="8200"
              step="50"
              value={ccgtHeatRate}
              onChange={(e) => setCcgtHeatRate(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-200 tabular-nums w-14 text-right">
              {ccgtHeatRate}
            </span>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 font-medium block mb-1">
            Simple Peaker CT Heat Rate
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="9000"
              max="13000"
              step="100"
              value={peakerHeatRate}
              onChange={(e) => setPeakerHeatRate(parseInt(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-200 tabular-nums w-14 text-right">
              {peakerHeatRate}
            </span>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 font-medium block mb-1">
            Variable O&M + CO2 ($/MWh)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1.00"
              max="12.00"
              step="0.50"
              value={vomCost}
              onChange={(e) => setVomCost(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-200 tabular-nums w-12 text-right">
              ${vomCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Comparative Cards: CCGT vs Peaker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Combined Cycle (CCGT) */}
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">Combined Cycle (CCGT)</span>
            <span className="text-[10px] font-mono text-slate-400">Efficiency ~50%</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${ccgtMargin > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {ccgtMargin > 0 ? `+$${ccgtMargin.toFixed(2)}` : `-$${Math.abs(ccgtMargin).toFixed(2)}`}
            </span>
            <span className="text-xs font-mono text-slate-400">/MWh Net Margin</span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
            <div className="flex justify-between">
              <span>Wholesale LMP:</span>
              <span className="font-mono text-slate-200">${powerPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Fuel Cost:</span>
              <span className="font-mono text-slate-200">-${ccgtFuelCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>VOM Cost:</span>
              <span className="font-mono text-slate-200">-${vomCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2">
            <span className={`inline-block w-full text-center text-xs font-mono py-1 rounded ${
              ccgtMargin > 5 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {ccgtMargin > 5 ? 'IN THE MONEY (DISPATCH)' : 'MARGINAL / OUT OF THE MONEY'}
            </span>
          </div>
        </div>

        {/* Card 2: Open Cycle Peaker (CT) */}
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400">Open Cycle Peaker (CT)</span>
            <span className="text-[10px] font-mono text-slate-400">Quick-start ~35%</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${peakerMargin > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {peakerMargin > 0 ? `+$${peakerMargin.toFixed(2)}` : `-$${Math.abs(peakerMargin).toFixed(2)}`}
            </span>
            <span className="text-xs font-mono text-slate-400">/MWh Net Margin</span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
            <div className="flex justify-between">
              <span>Wholesale LMP:</span>
              <span className="font-mono text-slate-200">${powerPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Fuel Cost:</span>
              <span className="font-mono text-slate-200">-${peakerFuelCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>VOM Cost:</span>
              <span className="font-mono text-slate-200">-${(vomCost * 1.5).toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2">
            <span className={`inline-block w-full text-center text-xs font-mono py-1 rounded ${
              peakerMargin > 0 ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}>
              {peakerMargin > 0 ? 'SCARCITY HOURS (IN THE MONEY)' : 'OFFLINE (RESERVE STANDBY)'}
            </span>
          </div>
        </div>

        {/* Card 3: Trader Heat Rate Matrix */}
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400">Market Implied Heat Rate</span>
            <Calculator className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          <div>
            <span className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              {Math.max(0, Math.round(breakevenHeatRate)).toLocaleString()}
            </span>
            <span className="text-xs font-mono text-slate-400 ml-1.5">Btu/kWh Implied</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed pt-1">
            Any generator with a heat rate below <strong className="text-cyan-300">{Math.max(0, Math.round(breakevenHeatRate)).toLocaleString()} Btu/kWh</strong> clears profitably at current {selectedISO} wholesale LMP of ${powerPrice.toFixed(2)}/MWh.
          </p>

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
            <span>Trading Formula:</span>
            <code className="block font-mono text-[10px] text-slate-300 bg-slate-900 p-1.5 rounded mt-1">
              SparkSpread = LMP - (HeatRate × Gas) - VOM
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
