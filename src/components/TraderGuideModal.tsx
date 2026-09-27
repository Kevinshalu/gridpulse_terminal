import React from 'react';
import { X, BookOpen, TrendingUp, Zap, HelpCircle, Layers, CheckCircle2 } from 'lucide-react';

interface TraderGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TraderGuideModal: React.FC<TraderGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Wholesale Power Trading & Energy Markets Primer
              </h2>
              <p className="text-xs text-slate-400">
                Core mechanics of North American ISO/RTO electricity grids and financial trading
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

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs text-slate-300">
          {/* Section 1 */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Zap className="w-4 h-4" />
              <span>1. Locational Marginal Pricing (LMP) Decomposition</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Wholesale electricity cannot be stored easily at scale, so generation must match demand every millisecond at 60.00 Hz. The clearing price at each transmission node is decomposed into three components:
            </p>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-emerald-300">
              LMP = MEC (Marginal Energy) + MCC (Congestion) + MLC (Marginal Loss)
            </div>
            <ul className="space-y-1 list-disc pl-5 text-slate-400">
              <li><strong>MEC (Energy):</strong> The cost to generate the next 1 MWh of power at the reference bus with no transmission constraints.</li>
              <li><strong>MCC (Congestion):</strong> The cost penalty or credit resulting from transmission line thermal limits. When a power line gets congested, cheap power cannot flow, so expensive local generation must fire up, causing MCC to spike positive at the sink and negative at the source!</li>
              <li><strong>MLC (Loss):</strong> Electrical resistance heat losses over high-voltage AC lines (usually 1-3% of total LMP).</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>2. Day-Ahead (DAM) vs Real-Time (RTM) DART Spread</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Every ISO operates a two-settlement market:
            </p>
            <ul className="space-y-1.5 list-disc pl-5 text-slate-400">
              <li><strong>Day-Ahead Market (DAM):</strong> Financially binding auction cleared by 1:30 PM the day before delivery. Based on forecasted load and generator bids.</li>
              <li><strong>Real-Time Market (RTM):</strong> Balances physical deviations every 5 minutes. Prices can fluctuate wildly based on cloud cover over solar farms, wind lulls, generator outages, or heatwaves.</li>
              <li><strong>DART Spread Arbitrage:</strong> Virtual traders take purely financial positions (INCs - Incremental generation bids, or DECs - Decremental load bids). If you forecast real-time demand will exceed DAM forecasts, you buy DAM and sell RTM to capture the positive spread.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Layers className="w-4 h-4" />
              <span>3. Spark Spread & Peaker Heat Rate Valuation</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Natural gas plants often act as the marginal price-setting unit in US power markets. Power traders track the <strong>Spark Spread</strong> to evaluate power plant profit margins:
            </p>
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-amber-300">
              Spark Spread ($/MWh) = Power Price - (Heat Rate × Gas Price) - Variable O&M
            </div>
            <ul className="space-y-1 list-disc pl-5 text-slate-400">
              <li><strong>Heat Rate (Btu/kWh):</strong> Thermal efficiency measure. Lower is more efficient. Modern Combined Cycle (CCGT) runs at ~7,000 Btu/kWh. Simple Cycle Peakers (CT) run at ~10,500 Btu/kWh.</li>
              <li>When power prices exceed the peaker's total generation cost, the peaker runs and captures windfall scarcity margins.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>4. The "Duck Curve" and Negative Pricing</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              In markets with heavy solar penetration (like CAISO and ERCOT), midday solar oversupply crushes wholesale prices, occasionally driving them negative (-$20 to -$50/MWh).
            </p>
            <p className="text-slate-400 leading-relaxed">
              <strong>Why would power prices be negative?</strong> Baseload thermal and nuclear plants face high shutdown and restart costs ($50k–$200k), and wind generators receive federal production tax credits (PTC), making it more economical to pay the grid to take their electricity than to curtail production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
