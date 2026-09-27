import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ISOCode, ISORegionData, MetricView, TradingHub } from '../types/market';
import { MapPin, Info } from 'lucide-react';

interface GridHeatmapProps {
  isoData: Record<ISOCode, ISORegionData>;
  selectedISO: ISOCode;
  onSelectISO: (iso: ISOCode) => void;
  selectedHub: TradingHub | null;
  onSelectHub: (hub: TradingHub | null) => void;
}

// Approximate SVG polygon paths for the 7 US ISO territories on a 960x600 coordinate plane
// Matches standard Albers USA projection relative positions
const ISO_PATHS: Record<ISOCode, string> = {
  CAISO: 'M 60,180 L 110,195 L 140,260 L 190,390 L 160,430 L 120,410 L 80,310 L 40,210 Z',
  ERCOT: 'M 400,380 L 490,360 L 520,400 L 530,470 L 490,550 L 440,560 L 410,500 L 390,440 Z',
  SPP: 'M 350,110 L 460,110 L 460,340 L 430,370 L 370,410 L 350,380 L 340,270 L 330,190 Z',
  MISO: 'M 460,110 L 570,120 L 580,240 L 610,290 L 530,340 L 550,470 L 490,470 L 480,360 L 460,340 Z',
  PJM: 'M 610,220 L 730,190 L 780,240 L 770,330 L 710,350 L 650,320 L 600,280 Z',
  NYISO: 'M 740,140 L 810,120 L 820,170 L 790,220 L 740,210 Z',
  ISONE: 'M 820,100 L 870,80 L 890,140 L 850,200 L 810,180 Z',
};

export const GridHeatmap: React.FC<GridHeatmapProps> = ({
  isoData,
  selectedISO,
  onSelectISO,
  selectedHub,
  onSelectHub,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [metricView, setMetricView] = useState<MetricView>('lmp');
  const [hoveredISO, setHoveredISO] = useState<ISOCode | null>(null);
  const [hoveredHub, setHoveredHub] = useState<TradingHub | null>(null);

  // Compute color scale based on active metric
  const getColor = (iso: ISOCode): string => {
    const data = isoData[iso];
    if (!data) return '#1e293b';

    if (metricView === 'lmp') {
      const price = data.avgLmp;
      if (price < 0) return '#8b5cf6'; // negative pricing (purple)
      if (price < 30) return '#10b981'; // low/normal (emerald)
      if (price < 50) return '#0284c7'; // moderate (blue)
      if (price < 80) return '#f59e0b'; // elevated (amber)
      if (price < 150) return '#ea580c'; // high (orange)
      return '#e11d48'; // extreme spike (rose)
    }

    if (metricView === 'load') {
      const ratio = data.currentLoadMW / data.capacityMW;
      if (ratio < 0.6) return '#10b981';
      if (ratio < 0.75) return '#0284c7';
      if (ratio < 0.85) return '#f59e0b';
      return '#e11d48';
    }

    if (metricView === 'reserve') {
      const margin = data.reserveMarginPct;
      if (margin > 20) return '#10b981';
      if (margin > 14) return '#0284c7';
      if (margin > 8) return '#f59e0b';
      return '#e11d48'; // Dangerously tight
    }

    if (metricView === 'renewables') {
      const total = data.fuelMix.wind + data.fuelMix.solar + data.fuelMix.hydro;
      const pct = (total / data.currentLoadMW) * 100;
      if (pct > 50) return '#06b6d4';
      if (pct > 35) return '#10b981';
      if (pct > 20) return '#0284c7';
      return '#64748b';
    }

    return '#334155';
  };

  // Coords mapping from lon/lat to SVG 960x600 plane
  const projectCoords = (lon: number, lat: number): [number, number] => {
    // Albers-like linear approximation for continental US
    const x = ((lon - -125) / (-66 - -125)) * 820 + 70;
    const y = ((50 - lat) / (50 - 24)) * 480 + 70;
    return [x, y];
  };

  const activeData = isoData[selectedISO];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-4">
      {/* Top Controls bar for Heatmap */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>US Wholesale Electricity Heatmap</span>
            <span className="text-xs font-mono text-slate-400 font-normal">
              · 7 ISO/RTO Jurisdictions
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time LMP Locational Marginal Pricing, Load Stress, and Interconnection Nodes
          </p>
        </div>

        {/* Metric Layer Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 shrink-0">
          {(
            [
              { id: 'lmp', label: 'LMP ($/MWh)' },
              { id: 'load', label: 'Load Stress' },
              { id: 'reserve', label: 'Reserve Margin' },
              { id: 'renewables', label: 'Renewable %' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMetricView(m.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                metricView === m.id
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Map Canvas & Details Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* SVG Map Section */}
        <div className="lg:col-span-2 relative bg-slate-950 rounded-lg border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center p-2 min-h-[380px]">
          <svg
            ref={svgRef}
            viewBox="0 0 960 580"
            className="w-full h-auto select-none max-h-[460px]"
          >
            {/* Background grid markings */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
              </pattern>
            </defs>
            <rect width="960" height="580" fill="url(#grid)" />

            {/* US Country Outline Base for context */}
            <path
              d="M 50,150 L 120,120 L 300,120 L 460,110 L 610,120 L 740,110 L 820,90 L 890,130 L 860,200 L 780,240 L 770,340 L 740,390 L 670,440 L 550,470 L 490,560 L 420,560 L 370,420 L 310,380 L 190,440 L 140,430 L 60,200 Z"
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.3"
            />

            {/* Regional ISO Polygons */}
            {(Object.keys(ISO_PATHS) as ISOCode[]).map((iso) => {
              const path = ISO_PATHS[iso];
              const isSelected = selectedISO === iso;
              const isHovered = hoveredISO === iso;
              const fill = getColor(iso);
              const data = isoData[iso];

              return (
                <g key={iso} className="cursor-pointer">
                  <path
                    d={path}
                    fill={fill}
                    fillOpacity={isSelected ? 0.85 : isHovered ? 0.75 : 0.45}
                    stroke={isSelected ? '#34d399' : isHovered ? '#94a3b8' : '#475569'}
                    strokeWidth={isSelected ? 3 : 1.5}
                    strokeLinejoin="round"
                    className="transition-all duration-200"
                    onClick={() => onSelectISO(iso)}
                    onMouseEnter={() => setHoveredISO(iso)}
                    onMouseLeave={() => setHoveredISO(null)}
                  />

                  {/* ISO Label and Price/Metric overlay */}
                  <text
                    x={projectCoords(data.coordinates.labelPos[0], data.coordinates.labelPos[1])[0]}
                    y={projectCoords(data.coordinates.labelPos[0], data.coordinates.labelPos[1])[1]}
                    textAnchor="middle"
                    className="pointer-events-none text-xs font-mono font-bold fill-white tracking-wider"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                  >
                    {iso}
                  </text>
                  <text
                    x={projectCoords(data.coordinates.labelPos[0], data.coordinates.labelPos[1])[0]}
                    y={projectCoords(data.coordinates.labelPos[0], data.coordinates.labelPos[1])[1] + 16}
                    textAnchor="middle"
                    className="pointer-events-none text-[11px] font-mono fill-emerald-300 font-semibold"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                  >
                    ${data.avgLmp.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Trading Hub Pinpoints */}
            {Object.values(isoData).flatMap(region => region.hubs).map((hub) => {
              const [x, y] = projectCoords(hub.coordinates[0], hub.coordinates[1]);
              const isSelected = selectedHub?.id === hub.id;
              const isHovered = hoveredHub?.id === hub.id;
              const isParentSelected = selectedISO === hub.iso;

              return (
                <g
                  key={hub.id}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectISO(hub.iso);
                    onSelectHub(isSelected ? null : hub);
                  }}
                  onMouseEnter={() => setHoveredHub(hub)}
                  onMouseLeave={() => setHoveredHub(null)}
                >
                  {/* Outer pulse if selected or high volatility */}
                  {(isSelected || hub.volatilityZScore > 2.0) && (
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? 10 : 8}
                      fill="none"
                      stroke={hub.volatilityZScore > 2.0 ? '#f43f5e' : '#34d399'}
                      strokeWidth="1.5"
                      className="animate-ping origin-center"
                      opacity="0.7"
                    />
                  )}

                  {/* Hub Pin */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 6 : isHovered ? 5.5 : 4}
                    fill={isSelected ? '#34d399' : hub.rtmLmp > 80 ? '#f43f5e' : '#0ea5e9'}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />

                  {/* Tooltip on hover */}
                  {(isHovered || isSelected) && (
                    <g transform={`translate(${x}, ${y - 12})`} className="pointer-events-none">
                      <rect
                        x="-70"
                        y="-26"
                        width="140"
                        height="24"
                        rx="4"
                        fill="#090d16"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="-10"
                        textAnchor="middle"
                        fill="#f1f5f9"
                        className="text-[10px] font-mono font-bold"
                      >
                        {hub.name.split('(')[0]} · ${hub.rtmLmp.toFixed(1)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Color Scale Legend */}
          <div className="absolute bottom-2 left-3 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded text-[11px] font-mono text-slate-300 flex items-center gap-2">
            <span className="text-slate-400 font-mono">
              {metricView === 'lmp' ? 'LMP Scale:' : metricView === 'reserve' ? 'Reserve Margin:' : 'Scale:'}
            </span>
            {metricView === 'lmp' ? (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6]" /> &lt;$0</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /> $0-30</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#0284c7]" /> $30-50</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" /> $50-80</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#e11d48]" /> &gt;$150</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" /> High</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#0284c7]" /> Normal</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" /> Moderate</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#e11d48]" /> Stressed</span>
              </div>
            )}
          </div>
        </div>

        {/* Selected ISO & Hub Telemetry Panel */}
        <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 font-semibold">{activeData.interconnection} Interconnection</span>
              <span className="text-xs text-slate-400 font-mono">Freq: {activeData.frequencyHz} Hz</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1">{activeData.name} ({activeData.code})</h3>
            <p className="text-xs text-slate-400">States: {activeData.states.join(', ')}</p>
          </div>

          {/* Regional Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block">Real-Time Avg LMP</span>
              <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                ${activeData.avgLmp.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block">DAM: ${activeData.damAvgLmp.toFixed(2)}</span>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block">Current Demand</span>
              <span className="text-lg font-bold font-mono text-slate-100 tabular-nums">
                {(activeData.currentLoadMW / 1000).toFixed(1)} GW
              </span>
              <span className="text-[10px] text-slate-400 block">Peak: {(activeData.peakLoadMW / 1000).toFixed(1)} GW</span>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block">Reserve Margin</span>
              <span className={`text-lg font-bold font-mono tabular-nums ${activeData.reserveMarginPct < 10 ? 'text-rose-400' : 'text-slate-200'}`}>
                {activeData.reserveMarginPct}%
              </span>
              <span className="text-[10px] text-slate-400 block">Capacity: {(activeData.capacityMW / 1000).toFixed(1)} GW</span>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
              <span className="text-slate-400 block">Spark Spread</span>
              <span className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
                ${activeData.sparkSpread.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block">CCGT 7.2k Heat Rate</span>
            </div>
          </div>

          {/* Detailed Selected Hub Inspection */}
          {selectedHub && selectedHub.iso === selectedISO ? (
            <div className="bg-slate-900 border border-emerald-500/40 p-3 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {selectedHub.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedHub.type}
                </span>
              </div>

              <div className="flex items-baseline justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-400">RTM Price:</span>
                <span className="font-mono font-bold text-slate-100 tabular-nums">${selectedHub.rtmLmp.toFixed(2)}/MWh</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">DAM Price:</span>
                <span className="font-mono text-slate-300 tabular-nums">${selectedHub.damLmp.toFixed(2)}/MWh</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">DART Spread (RTM - DAM):</span>
                <span className={`font-mono font-bold tabular-nums ${selectedHub.spread > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedHub.spread > 0 ? `+${selectedHub.spread.toFixed(2)}` : selectedHub.spread.toFixed(2)}
                </span>
              </div>

              {/* LMP Component Decomposition */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
                  <span>LMP Decomposition (MEC + MCC + MLC)</span>
                  <Info className="w-3 h-3 text-slate-500" />
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center">
                  <div className="bg-slate-950 p-1 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Energy</span>
                    <span className="text-slate-200 tabular-nums">${selectedHub.components.energy.toFixed(1)}</span>
                  </div>
                  <div className="bg-slate-950 p-1 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Congestion</span>
                    <span className={`tabular-nums ${selectedHub.components.congestion > 0 ? 'text-amber-400' : selectedHub.components.congestion < 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
                      ${selectedHub.components.congestion.toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-1 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Loss</span>
                    <span className="text-slate-200 tabular-nums">${selectedHub.components.loss.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-900/40 p-3 rounded border border-slate-800/60 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Click any trading hub node pin on the map to inspect granular locational marginal pricing and congestion breakdown.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
