import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ISOCode, ForecastPoint } from '../types/market';
import { marketEngine } from '../services/marketSimulator';
import { Download, Calendar, Layers } from 'lucide-react';

interface ForecastingChartProps {
  selectedISO: ISOCode;
  regionName: string;
}

export const ForecastingChart: React.FC<ForecastingChartProps> = ({
  selectedISO,
  regionName,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [dataPoints, setDataPoints] = useState<ForecastPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<ForecastPoint | null>(null);
  const [chartMode, setChartMode] = useState<'load' | 'price' | 'both'>('both');

  // Load and refresh forecast series from marketEngine
  useEffect(() => {
    const updateData = () => {
      const pts = marketEngine.getForecastTimeSeries(selectedISO, timeframe);
      setDataPoints(pts);
    };

    updateData();
    const unsubscribe = marketEngine.subscribe(updateData);
    return () => unsubscribe();
  }, [selectedISO, timeframe]);

  // D3 Rendering of Load Forecast & Price Overlay
  useEffect(() => {
    if (!svgRef.current || dataPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 860;
    const height = chartMode === 'both' ? 380 : 300;
    const margin = { top: 25, right: 60, bottom: 45, left: 65 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const xScale = d3.scaleLinear()
      .domain([0, dataPoints.length - 1])
      .range([0, innerWidth]);

    // Y Scale for Load (MW)
    const maxLoad = d3.max(dataPoints, d => Math.max(d.p90Load, d.actualLoad || 0)) || 100000;
    const minLoad = d3.min(dataPoints, d => Math.min(d.p10Load, d.actualLoad || d.p10Load)) || 10000;
    const yLoadScale = d3.scaleLinear()
      .domain([minLoad * 0.9, maxLoad * 1.08])
      .range([innerHeight, 0]);

    // Y Scale for Price ($/MWh)
    const maxPrice = d3.max(dataPoints, d => Math.max(d.damLmp, d.rtmLmp || 0)) || 100;
    const minPrice = Math.min(0, d3.min(dataPoints, d => Math.min(d.damLmp, d.rtmLmp || 0)) || 0);
    const yPriceScale = d3.scaleLinear()
      .domain([minPrice, maxPrice * 1.15])
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yLoadScale).tickSize(-innerWidth).tickFormat(() => ''));

    // P10 - P90 Confidence Band (Fan area)
    const areaGenerator = d3.area<ForecastPoint>()
      .x((_, i) => xScale(i))
      .y0(d => yLoadScale(d.p10Load))
      .y1(d => yLoadScale(d.p90Load))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(dataPoints)
      .attr('fill', '#0284c7')
      .attr('fill-opacity', 0.12)
      .attr('d', areaGenerator);

    // Day-Ahead Forecast Load Line
    const forecastLine = d3.line<ForecastPoint>()
      .x((_, i) => xScale(i))
      .y(d => yLoadScale(d.forecastLoad))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(dataPoints)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 4')
      .attr('d', forecastLine);

    // Actual Historical Load Line (only where actualLoad is defined)
    const actualData = dataPoints.filter(d => d.actualLoad !== undefined);
    if (actualData.length > 0) {
      const actualLine = d3.line<ForecastPoint>()
        .x((d) => xScale(dataPoints.indexOf(d)))
        .y(d => yLoadScale(d.actualLoad!))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(actualData)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 2.5)
        .attr('d', actualLine);
    }

    // Now boundary vertical marker
    const nowIdx = dataPoints.findIndex(d => d.actualLoad === undefined);
    if (nowIdx > 0) {
      const nowX = xScale(nowIdx);
      g.append('line')
        .attr('x1', nowX)
        .attr('x2', nowX)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 3');

      g.append('text')
        .attr('x', nowX + 4)
        .attr('y', 12)
        .attr('fill', '#f59e0b')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .text('NOW / FORWARD PROJECTION');
    }

    // Price Overlay if enabled
    if (chartMode === 'price' || chartMode === 'both') {
      const damPriceLine = d3.line<ForecastPoint>()
        .x((_, i) => xScale(i))
        .y(d => yPriceScale(d.damLmp))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(dataPoints)
        .attr('fill', 'none')
        .attr('stroke', '#a855f7')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2 2')
        .attr('opacity', 0.8)
        .attr('d', damPriceLine);

      if (actualData.length > 0) {
        const rtmPriceLine = d3.line<ForecastPoint>()
          .x((d) => xScale(dataPoints.indexOf(d)))
          .y(d => yPriceScale(d.rtmLmp!))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(actualData)
          .attr('fill', 'none')
          .attr('stroke', '#f43f5e')
          .attr('stroke-width', 2)
          .attr('d', rtmPriceLine);
      }
    }

    // X Axis
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(10, dataPoints.length))
      .tickFormat((d) => dataPoints[d as number]?.timestamp || '');

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('color', '#64748b')
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Left Y Axis (Load in GW)
    const yAxisLeft = d3.axisLeft(yLoadScale)
      .ticks(6)
      .tickFormat(d => `${((d as number) / 1000).toFixed(0)} GW`);

    g.append('g')
      .attr('color', '#38bdf8')
      .call(yAxisLeft)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Right Y Axis (Price in $/MWh)
    if (chartMode === 'price' || chartMode === 'both') {
      const yAxisRight = d3.axisRight(yPriceScale)
        .ticks(6)
        .tickFormat(d => `$${d}`);

      g.append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .attr('color', '#f43f5e')
        .call(yAxisRight)
        .selectAll('text')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');
    }

    // Interactive Hover Overlay
    const overlay = g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    const focusLine = g.append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 2')
      .attr('opacity', 0);

    overlay
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const idx = Math.max(0, Math.min(dataPoints.length - 1, Math.round(xScale.invert(mx))));
        const pt = dataPoints[idx];
        setHoveredPoint(pt);

        focusLine
          .attr('x1', xScale(idx))
          .attr('x2', xScale(idx))
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('opacity', 0.8);
      })
      .on('mouseleave', () => {
        setHoveredPoint(null);
        focusLine.attr('opacity', 0);
      });

  }, [dataPoints, chartMode]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'ActualLoad_MW', 'ForecastLoad_MW', 'P10_MW', 'P90_MW', 'DAM_LMP', 'RTM_LMP', 'DART_Spread'];
    const rows = dataPoints.map(p => [
      p.timestamp,
      p.actualLoad ?? '',
      p.forecastLoad,
      p.p10Load,
      p.p90Load,
      p.damLmp,
      p.rtmLmp ?? '',
      p.spread ?? '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedISO}_forecast_curves.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={containerRef} className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-4">
      {/* Forecasting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100">
              {selectedISO} Load & LMP Forward Curve Forecasting
            </h2>
            <span className="text-xs font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
              P10 / P50 / P90 Statistical Bounds
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Diurnal demand curve tracking, Day-Ahead Market (DAM) vs Real-Time Market (RTM) clearing, and automated spread projections.
          </p>
        </div>

        {/* View Controls & CSV Export */}
        <div className="flex items-center gap-2">
          {/* Chart mode toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            {(['both', 'load', 'price'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer capitalize ${
                  chartMode === mode ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'both' ? 'Load + LMP' : mode}
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            {(['24h', '7d', '30d'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer uppercase ${
                  timeframe === tf ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            title="Download CSV dataset for commodity modeling"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* D3 Chart Canvas */}
      <div className="relative bg-slate-950 rounded-lg border border-slate-800/80 p-2 overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox="0 0 860 380"
          className="w-full h-auto min-w-[650px] select-none"
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono px-4 py-2 border-t border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Actual Load (MW)
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-3 h-0.5 bg-sky-400 inline-block border-b border-dashed" /> Forecast Load (DAM)
            </span>
            <span className="flex items-center gap-1.5 text-sky-300">
              <span className="w-2.5 h-2.5 bg-sky-500/20 inline-block rounded-xs" /> P10-P90 Confidence Band
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" /> Real-Time LMP ($/MWh)
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-3 h-0.5 bg-purple-400 inline-block border-b border-dashed" /> Day-Ahead LMP
            </span>
          </div>

          <span className="text-slate-500 text-[11px] font-mono">
            Hover along timeline to inspect crosshair values
          </span>
        </div>
      </div>

      {/* Hovered Point Inspection Bar */}
      {hoveredPoint ? (
        <div className="bg-slate-950 border border-slate-800 p-3 rounded grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px]">TIMESTAMP</span>
            <span className="text-slate-200 font-bold">{hoveredPoint.timestamp}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">ACTUAL LOAD</span>
            <span className="text-emerald-400 font-bold tabular-nums">
              {hoveredPoint.actualLoad ? `${(hoveredPoint.actualLoad / 1000).toFixed(2)} GW` : 'Forward Hour'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">FORECAST LOAD</span>
            <span className="text-sky-400 font-bold tabular-nums">
              {(hoveredPoint.forecastLoad / 1000).toFixed(2)} GW
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">P10 - P90 RANGE</span>
            <span className="text-slate-300 tabular-nums">
              {(hoveredPoint.p10Load / 1000).toFixed(1)} - {(hoveredPoint.p90Load / 1000).toFixed(1)} GW
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">RTM LMP</span>
            <span className="text-rose-400 font-bold tabular-nums">
              {hoveredPoint.rtmLmp !== undefined ? `$${hoveredPoint.rtmLmp.toFixed(2)}` : 'Pending'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">DAM LMP (SPREAD)</span>
            <span className="text-purple-400 font-bold tabular-nums">
              ${hoveredPoint.damLmp.toFixed(2)}{' '}
              {hoveredPoint.spread !== undefined && (
                <span className={`text-[11px] ${hoveredPoint.spread > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ({hoveredPoint.spread > 0 ? `+${hoveredPoint.spread.toFixed(1)}` : hoveredPoint.spread.toFixed(1)})
                </span>
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-500 font-mono py-1 px-2">
          Move your cursor over the chart to inspect actual load, forward forecasts, and DART price arbitrage spreads.
        </div>
      )}
    </div>
  );
};
