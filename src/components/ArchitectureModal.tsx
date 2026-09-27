import React from 'react';
import { X, Cpu, Database, Network, ArrowRight, ShieldCheck, Zap, Layers, Server } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                AWS High-Frequency Energy Data Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Low-latency ingestion, time-series aggregation, and real-time streaming for wholesale power trading
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
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {/* Architectural Flow Diagram */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-2">
              <Network className="w-4 h-4" />
              <span>END-TO-END LOW-LATENCY PIPELINE (SUB-50MS)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* Box 1: Sources */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono text-cyan-400 font-semibold block">01. DATA INGESTION</span>
                <div className="font-semibold text-slate-200">ISO/RTO & EIA Feeds</div>
                <ul className="text-[11px] text-slate-400 space-y-1">
                  <li>• EIA-930 Hourly Real-Time</li>
                  <li>• PJM Data Miner 2 REST API</li>
                  <li>• CAISO OASIS 5-min SCADA</li>
                  <li>• ERCOT Market Information API</li>
                </ul>
                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800">
                  Protocol: REST / Webhooks
                </div>
              </div>

              {/* Box 2: Streaming Buffer */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono text-purple-400 font-semibold block">02. BUFFER & STREAM</span>
                <div className="font-semibold text-slate-200">Amazon Kinesis</div>
                <ul className="text-[11px] text-slate-400 space-y-1">
                  <li>• Kinesis Data Streams (24 Shards)</li>
                  <li>• 12,000 node ticks / second</li>
                  <li>• Micro-batch windowing (500ms)</li>
                  <li>• Partition keys by ISO & Hub ID</li>
                </ul>
                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800">
                  Throughput: 25 MB/s burst
                </div>
              </div>

              {/* Box 3: Real-Time Compute */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono text-amber-400 font-semibold block">03. COMPUTE & RULES</span>
                <div className="font-semibold text-slate-200">AWS Lambda / ECS Fargate</div>
                <ul className="text-[11px] text-slate-400 space-y-1">
                  <li>• Online Volatility Z-Score Math</li>
                  <li>• DART Spread Divergence Engine</li>
                  <li>• Spark Spread & Heat Rate matrix</li>
                  <li>• Custom alert threshold matcher</li>
                </ul>
                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800">
                  Compute: Rust & Node workers
                </div>
              </div>

              {/* Box 4: Distribution & Storage */}
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono text-emerald-400 font-semibold block">04. SERVE & STORE</span>
                <div className="font-semibold text-slate-200">Timestream + WebSockets</div>
                <ul className="text-[11px] text-slate-400 space-y-1">
                  <li>• AWS API Gateway WebSocket API</li>
                  <li>• Amazon Timestream (ticks & curves)</li>
                  <li>• Amazon DynamoDB (user rules)</li>
                  <li>• React + D3.js Trader Terminal</li>
                </ul>
                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800">
                  Client Latency: &lt; 45ms P99
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Time-Series Storage & Query Latency</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Wholesale energy markets generate massive telemetry (over 40,000 pricing nodes in North America). Using <strong>Amazon Timestream</strong> with a 24-hour memory store and S3 magnetic tier enables sub-second aggregations for 90-day forward curves while keeping AWS billing lean.
              </p>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                <code>SELECT bin(time, 5m), avg(rtm_lmp), max(mcc_congestion) FROM &quot;energy_db&quot;.&quot;pjm_nodes&quot; WHERE time &gt; ago(24h) GROUP BY 1</code>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Financial Alert Engine & Volatility Calculation</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Commodity traders require alerts before prices print in settlement records. The AWS Lambda streaming processor calculates rolling 30-day standard deviations and instantly evaluates trader-defined threshold rules, broadcasting via AWS SNS and API Gateway WebSocket connections.
              </p>
              <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                <code>Z = (RTM_Price - μ_30d) / σ_30d; if (Z &gt; threshold) publish_alert();</code>
              </div>
            </div>
          </div>

          {/* Portfolio & Resume Talking Points */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Key Portfolio Highlights For Energy Trading & Financial Engineering Roles</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5">
              <li>
                <strong>High-Frequency Market Streaming:</strong> Designed a reactive event-driven client using D3.js and WebSockets capable of updating thousands of nodal price components without DOM layout thrashing.
              </li>
              <li>
                <strong>Market Fundamentals Modeling:</strong> Implemented real-time Spark Spread valuation with adjustable heat rates (Btu/kWh) to determine CCGT vs peaker dispatch status under varying Henry Hub natural gas feedstock prices.
              </li>
              <li>
                <strong>Nodal Locational Marginal Pricing (LMP):</strong> Decomposed nodal wholesale prices into System Marginal Energy (MEC), Transmission Congestion (MCC), and Marginal Losses (MLC).
              </li>
              <li>
                <strong>Statistical Forecasting:</strong> Rendered fan charts showing P10, P50, and P90 confidence intervals for forward peak demand and DART spread arbitrage.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
