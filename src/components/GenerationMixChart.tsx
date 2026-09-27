import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { GenerationFuelMix, ISOCode } from '../types/market';
import { Flame, Wind, Sun, Atom, Droplets, BatteryCharging, Factory } from 'lucide-react';

interface GenerationMixChartProps {
  fuelMix: GenerationFuelMix;
  isoCode: ISOCode;
  currentLoadMW: number;
}

interface FuelItem {
  id: keyof GenerationFuelMix;
  label: string;
  mw: number;
  color: string;
  icon: React.ReactNode;
}

export const GenerationMixChart: React.FC<GenerationMixChartProps> = ({
  fuelMix,
  isoCode,
  currentLoadMW,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const fuels: FuelItem[] = [
    { id: 'naturalGas' as keyof GenerationFuelMix, label: 'Natural Gas (Marginal)', mw: fuelMix.naturalGas, color: '#f59e0b', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'wind' as keyof GenerationFuelMix, label: 'Wind Power', mw: fuelMix.wind, color: '#06b6d4', icon: <Wind className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'solar' as keyof GenerationFuelMix, label: 'Solar PV', mw: fuelMix.solar, color: '#eab308', icon: <Sun className="w-3.5 h-3.5 text-yellow-400" /> },
    { id: 'nuclear' as keyof GenerationFuelMix, label: 'Nuclear Baseload', mw: fuelMix.nuclear, color: '#a855f7', icon: <Atom className="w-3.5 h-3.5 text-purple-400" /> },
    { id: 'coal' as keyof GenerationFuelMix, label: 'Coal', mw: fuelMix.coal, color: '#64748b', icon: <Factory className="w-3.5 h-3.5 text-slate-400" /> },
    { id: 'hydro' as keyof GenerationFuelMix, label: 'Hydroelectric', mw: fuelMix.hydro, color: '#3b82f6', icon: <Droplets className="w-3.5 h-3.5 text-blue-400" /> },
    { id: 'battery' as keyof GenerationFuelMix, label: 'Battery Storage', mw: fuelMix.battery, color: '#10b981', icon: <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" /> },
  ].filter(f => f.mw !== 0);

  const totalGenMW = fuels.reduce((acc, f) => acc + Math.max(0, f.mw), 0);

  // Render D3 Donut Chart
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 180;
    const height = 180;
    const radius = Math.min(width, height) / 2;

    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    const pie = d3.pie<FuelItem>()
      .value(d => Math.max(0, d.mw))
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<FuelItem>>()
      .innerRadius(radius * 0.62)
      .outerRadius(radius * 0.95)
      .padAngle(0.02)
      .cornerRadius(3);

    g.selectAll('path')
      .data(pie(fuels))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', '#090d16')
      .attr('stroke-width', 2);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('letter-spacing', '0.05em')
      .text('GEN OUTPUT');

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.1em')
      .attr('fill', '#f1f5f9')
      .attr('font-size', '14px')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('font-weight', 'bold')
      .text(`${(totalGenMW / 1000).toFixed(1)} GW`);

  }, [fuels, totalGenMW]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>{isoCode} Real-Time Generation Fuel Stack</span>
          </h3>
          <p className="text-xs text-slate-400">
            Marginal resource dispatch and renewable vs thermal penetration
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Demand: {(currentLoadMW / 1000).toFixed(1)} GW
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6 pt-2">
        {/* Donut Chart */}
        <div className="shrink-0 flex items-center justify-center">
          <svg ref={svgRef} width="180" height="180" className="select-none" />
        </div>

        {/* Breakdown List */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {fuels.map(f => {
            const pct = ((f.mw / totalGenMW) * 100);
            return (
              <div
                key={f.id}
                className="bg-slate-950 p-2 rounded border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {f.icon}
                  <div className="truncate">
                    <span className="text-slate-300 font-medium truncate block">{f.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {(Math.abs(f.mw) / 1000).toFixed(2)} GW {f.mw < 0 ? '(Charging)' : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="font-mono font-bold text-slate-200 tabular-nums">
                    {pct > 0 ? `${pct.toFixed(1)}%` : '--'}
                  </span>
                  <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: f.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
