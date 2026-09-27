import React, { useState } from 'react';
import { TradingHub, ISOCode, ISORegionData } from '../types/market';
import { Search, ArrowUpDown, BellPlus, Check } from 'lucide-react';

interface HubPricingTableProps {
  isoData: Record<ISOCode, ISORegionData>;
  selectedISO: ISOCode;
  onSelectHub: (hub: TradingHub) => void;
  onQuickAlert: (hub: TradingHub) => void;
}

type SortField = 'name' | 'iso' | 'rtmLmp' | 'damLmp' | 'spread' | 'congestion' | 'volumeMW' | 'volatilityZScore';

export const HubPricingTable: React.FC<HubPricingTableProps> = ({
  isoData,
  selectedISO,
  onSelectHub,
  onQuickAlert,
}) => {
  const [filterISO, setFilterISO] = useState<ISOCode | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rtmLmp');
  const [sortAsc, setSortAsc] = useState(false);
  const [alertSuccessId, setAlertSuccessId] = useState<string | null>(null);

  // Aggregate all hubs
  const allHubs: TradingHub[] = Object.values(isoData).flatMap(r => r.hubs);

  const filteredHubs = allHubs.filter(hub => {
    if (filterISO !== 'ALL' && hub.iso !== filterISO) return false;
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return hub.name.toLowerCase().includes(q) || hub.iso.toLowerCase().includes(q) || hub.id.toLowerCase().includes(q);
  });

  const sortedHubs = [...filteredHubs].sort((a, b) => {
    let valA: number | string = 0;
    let valB: number | string = 0;

    switch (sortField) {
      case 'name': valA = a.name; valB = b.name; break;
      case 'iso': valA = a.iso; valB = b.iso; break;
      case 'rtmLmp': valA = a.rtmLmp; valB = b.rtmLmp; break;
      case 'damLmp': valA = a.damLmp; valB = b.damLmp; break;
      case 'spread': valA = a.spread; valB = b.spread; break;
      case 'congestion': valA = a.components.congestion; valB = b.components.congestion; break;
      case 'volumeMW': valA = a.volumeMW; valB = b.volumeMW; break;
      case 'volatilityZScore': valA = a.volatilityZScore; valB = b.volatilityZScore; break;
    }

    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
    }
    return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleAlertClick = (hub: TradingHub, e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAlert(hub);
    setAlertSuccessId(hub.id);
    setTimeout(() => setAlertSuccessId(null), 1800);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-4">
      {/* Table Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>Wholesale Node Trading Desk</span>
            <span className="text-xs font-mono text-emerald-400 font-normal">
              · Live Low-Latency Feeds
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-Time Market (RTM) vs Day-Ahead Market (DAM) spreads & congestion decomposition
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ISO Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            {(['ALL', 'PJM', 'ERCOT', 'CAISO', 'MISO', 'NYISO', 'ISONE', 'SPP'] as const).map(iso => (
              <button
                key={iso}
                onClick={() => setFilterISO(iso)}
                className={`px-2 py-0.5 text-xs font-mono rounded transition-colors cursor-pointer ${
                  filterISO === iso ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {iso}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter trading hubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-700 w-44"
            />
          </div>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="overflow-x-auto rounded border border-slate-800/80">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 select-none font-medium">
            <tr>
              <th className="px-3 py-2 cursor-pointer hover:text-slate-200" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  <span>Trading Hub / Zone</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="px-3 py-2 cursor-pointer hover:text-slate-200" onClick={() => handleSort('iso')}>
                <div className="flex items-center gap-1">
                  <span>ISO</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="px-3 py-2 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('rtmLmp')}>
                <div className="flex items-center justify-end gap-1">
                  <span>RTM LMP ($/MWh)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="px-3 py-2 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('damLmp')}>
                <div className="flex items-center justify-end gap-1">
                  <span>DAM LMP</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="px-3 py-2 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('spread')}>
                <div className="flex items-center justify-end gap-1">
                  <span>DART Spread</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="px-3 py-2 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('congestion')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Congestion (MCC)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="px-3 py-2 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('volatilityZScore')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Volatility (Z)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="px-3 py-2 text-right cursor-pointer hover:text-slate-200" onClick={() => handleSort('volumeMW')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Volume (MW)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th className="px-3 py-2 text-center">Alert</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {sortedHubs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No matching trading hubs found for query "{searchQuery}".
                </td>
              </tr>
            ) : (
              sortedHubs.map(hub => {
                const isSpreadPositive = hub.spread > 0;
                const isHighVolatility = hub.volatilityZScore > 2.0;
                const isAlertAdded = alertSuccessId === hub.id;

                return (
                  <tr
                    key={hub.id}
                    onClick={() => onSelectHub(hub)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-3 py-2.5 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="group-hover:text-emerald-300 transition-colors">{hub.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({hub.type})</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-400 font-semibold">
                      {hub.iso}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums">
                      <span className={hub.rtmLmp < 0 ? 'text-purple-400' : hub.rtmLmp > 70 ? 'text-rose-400' : 'text-emerald-400'}>
                        ${hub.rtmLmp.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-300 tabular-nums">
                      ${hub.damLmp.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                      <span className={isSpreadPositive ? 'text-rose-400' : 'text-emerald-400'}>
                        {isSpreadPositive ? `+${hub.spread.toFixed(2)}` : hub.spread.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      <span className={hub.components.congestion > 5 ? 'text-amber-400 font-semibold' : hub.components.congestion < -5 ? 'text-cyan-400 font-semibold' : 'text-slate-400'}>
                        ${hub.components.congestion.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      <span className={isHighVolatility ? 'text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/60' : 'text-slate-300'}>
                        {hub.volatilityZScore.toFixed(2)}σ
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400 tabular-nums">
                      {hub.volumeMW.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={(e) => handleAlertClick(hub, e)}
                        title={`Set volatility spike alert for ${hub.name}`}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          isAlertAdded
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                        }`}
                      >
                        {isAlertAdded ? <Check className="w-3.5 h-3.5" /> : <BellPlus className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
