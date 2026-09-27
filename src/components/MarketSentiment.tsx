import React, { useState, useEffect, useCallback } from 'react';
import { ISOCode, ISORegionData, MarketScenario } from '../types/market';
import { TrendingUp, TrendingDown, Minus, BrainCircuit, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight, Compass, ShieldAlert } from 'lucide-react';

interface MarketSentimentProps {
  selectedISO: ISOCode;
  isoData: Record<ISOCode, ISORegionData>;
  gasPrice: number;
  currentScenario: MarketScenario;
  onSelectISO: (iso: ISOCode) => void;
}

interface SentimentResponse {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidenceScore: number;
  headline: string;
  summary: string;
  drivers: string[];
  priceOutlookNext4Hours: string;
  tradingStrategy: string;
  source?: string;
}

export const MarketSentiment: React.FC<MarketSentimentProps> = ({
  selectedISO,
  isoData,
  gasPrice,
  currentScenario,
  onSelectISO,
}) => {
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const regionData = isoData[selectedISO];

  const fetchSentiment = useCallback(async () => {
    if (!regionData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/market-sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iso: selectedISO,
          regionData,
          gasPrice,
          currentScenario,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data: SentimentResponse = await res.json();
      setSentiment(data);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
    } catch (err: unknown) {
      console.warn('API sentiment fetch failed, generating client fallback:', err);
      // Client-side fallback if server endpoint is temporarily unreachable
      const spread = regionData.avgLmp - regionData.damAvgLmp;
      const reserve = regionData.reserveMarginPct;
      const isBull = reserve < 10 || spread > 10 || regionData.avgLmp > 65;
      const isBear = regionData.avgLmp < 22 || regionData.fuelMix.solar > regionData.currentLoadMW * 0.35;

      setSentiment({
        sentiment: isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL',
        confidenceScore: isBull ? 88 : isBear ? 82 : 74,
        headline: `${selectedISO} WHOLESALE REAL-TIME PRICE VELOCITY EVALUATION`,
        summary: isBull
          ? `Operating reserve margin at ${reserve}% is triggering scarcity premia in RTM contracts. Marginal gas units clearing above DAM benchmark.`
          : isBear
          ? `Solar and wind generation is compressing net load across the interconnection, driving marginal heat rates down.`
          : `Supply-demand balance remains stable. Reserve margins are well-cushioned and spark spreads are trading in equilibrium.`,
        drivers: [
          `Real-Time LMP: $${regionData.avgLmp.toFixed(2)}/MWh (Spread: ${spread > 0 ? '+' : ''}${spread.toFixed(2)})`,
          `Operating Reserve: ${reserve.toFixed(1)}% (Capacity: ${(regionData.capacityMW / 1000).toFixed(0)}GW)`,
          `Clean Spark Spread: $${regionData.sparkSpread.toFixed(2)}/MWh at $${gasPrice.toFixed(2)} Gas`,
        ],
        priceOutlookNext4Hours: isBull ? '+$15.00 to +$45.00/MWh upward drift' : isBear ? '-$5.00 to -$15.00/MWh downside' : '±$3.50/MWh tight range',
        tradingStrategy: isBull ? 'Long DART virtual spread; dispatch quick-start peakers.' : isBear ? 'Charge BESS storage; short virtual day-ahead.' : 'Market-neutral spread trading.',
        source: 'client-algorithmic',
      });
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
    } finally {
      setLoading(false);
    }
  }, [selectedISO, regionData, gasPrice, currentScenario]);

  // Re-run sentiment analysis when region or scenario changes
  useEffect(() => {
    fetchSentiment();
  }, [fetchSentiment]);

  const isBullish = sentiment?.sentiment === 'BULLISH';
  const isBearish = sentiment?.sentiment === 'BEARISH';
  const isNeutral = sentiment?.sentiment === 'NEUTRAL';

  return (
    <div className="bg-[#0b101b] border border-[#1e2638] rounded-xs p-4 space-y-4 font-mono text-slate-100">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#182338] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xs bg-[#ff9900]/10 border border-[#ff9900]/30 text-[#ff9900]">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                AI MARKET SENTIMENT RADAR <span className="text-[#ff9900]">&lt;SENT&gt;</span>
              </h2>
              <span className="text-[10px] text-slate-400 border border-[#1e2638] px-1.5 py-0.2 rounded-xs bg-[#070a0f]">
                GEMINI 3.8 REASONING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated fundamental & technical price velocity evaluation for power traders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ISO Switcher buttons */}
          <div className="flex items-center gap-1 bg-[#070a0f] p-0.5 rounded-xs border border-[#1e2638]">
            {(['PJM', 'ERCOT', 'CAISO', 'MISO', 'NYISO', 'ISONE', 'SPP'] as ISOCode[]).map((iso) => (
              <button
                key={iso}
                onClick={() => onSelectISO(iso)}
                className={`px-2 py-0.5 text-xs font-semibold rounded-xs transition-colors cursor-pointer ${
                  selectedISO === iso
                    ? 'bg-[#182338] text-[#ff9900] border border-[#ff9900]/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {iso}
              </button>
            ))}
          </div>

          {/* Refresh analysis button */}
          <button
            onClick={fetchSentiment}
            disabled={loading}
            title="Re-run AI sentiment evaluation"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-[#111724] hover:bg-[#182338] border border-[#1e2638] text-slate-200 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[#ff9900] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'ANALYZING...' : 'RE-RUN'}</span>
          </button>
        </div>
      </div>

      {/* Main Sentiment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Box 1: Bullish/Bearish Directional Gauge */}
        <div className={`p-4 rounded-xs border flex flex-col justify-between ${
          isBullish
            ? 'bg-[#062413]/60 border-[#00ff66]/40'
            : isBearish
            ? 'bg-[#2a0b12]/60 border-[#ff3355]/40'
            : 'bg-[#1e1b0a]/60 border-[#ff9900]/40'
        }`}>
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="tracking-wider uppercase">{selectedISO} DIRECTIONAL BIAS</span>
              <span className="text-[10px] text-slate-500 font-mono">UPDATED: {lastUpdated}</span>
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className={`p-2.5 rounded-xs ${
                isBullish
                  ? 'bg-[#00ff66]/20 text-[#00ff66]'
                  : isBearish
                  ? 'bg-[#ff3355]/20 text-[#ff3355]'
                  : 'bg-[#ff9900]/20 text-[#ff9900]'
              }`}>
                {isBullish && <ArrowUpRight className="w-8 h-8" />}
                {isBearish && <ArrowDownRight className="w-8 h-8" />}
                {isNeutral && <Minus className="w-8 h-8" />}
              </div>

              <div>
                <span className={`text-2xl font-bold tracking-wider block ${
                  isBullish ? 'text-[#00ff66]' : isBearish ? 'text-[#ff3355]' : 'text-[#ff9900]'
                }`}>
                  {sentiment?.sentiment || 'ANALYZING...'}
                </span>
                <span className="text-xs text-slate-400">
                  {isBullish
                    ? 'Upside Price Pressure / Scarcity Risk'
                    : isBearish
                    ? 'Downside Pressure / Renewable Glut'
                    : 'Equilibrium Range-Bound Oscillations'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-1.5 mt-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Model Conviction:</span>
              <span className="font-bold text-slate-200 tabular-nums">
                {sentiment?.confidenceScore || 0}%
              </span>
            </div>
            {/* Visual Conviction Meter */}
            <div className="w-full h-1.5 bg-[#070a0f] rounded-xs overflow-hidden border border-[#1e2638]">
              <div
                className={`h-full transition-all duration-500 ${
                  isBullish ? 'bg-[#00ff66]' : isBearish ? 'bg-[#ff3355]' : 'bg-[#ff9900]'
                }`}
                style={{ width: `${sentiment?.confidenceScore || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Box 2: Institutional Narrative & Outlook */}
        <div className="lg:col-span-2 bg-[#070a0f] p-4 rounded-xs border border-[#1e2638] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-[#182338] pb-2">
              <span className="text-xs font-bold text-[#ff9900] uppercase tracking-wider">
                {sentiment?.headline || 'FETCHING MARKET TELEMETRY...'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                SOURCE: {sentiment?.source === 'ai-gemini' ? 'GEMINI 3.8 FLASH' : 'ALGORITHMIC SPREAD MODEL'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
              {sentiment?.summary || 'Evaluating wholesale electricity market fundamentals...'}
            </p>

            {/* Price Drivers List */}
            <div className="mt-3 space-y-1.5">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                KEY QUANTITATIVE PRICE DRIVERS:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {(sentiment?.drivers || [
                  `RTM LMP: $${regionData.avgLmp.toFixed(2)}/MWh`,
                  `Reserve: ${regionData.reserveMarginPct}%`,
                  `Gas: $${gasPrice.toFixed(2)}/MMBtu`,
                ]).map((driver, idx) => (
                  <div key={idx} className="bg-[#0b101b] p-2 rounded-xs border border-[#182338] text-[11px] text-slate-300">
                    <span className="text-[#ff9900] mr-1">#{idx + 1}</span>
                    <span>{driver}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar: 4-Hour Outlook + Trading Action */}
          <div className="pt-3 border-t border-[#182338] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-[#111724] p-2 rounded-xs border border-[#182338]">
              <span className="text-[10px] text-slate-400 block uppercase">4-HOUR PRICE TRAJECTORY</span>
              <span className="font-bold text-[#00ff66] block mt-0.5">
                {sentiment?.priceOutlookNext4Hours || 'Evaluating...'}
              </span>
            </div>

            <div className="bg-[#111724] p-2 rounded-xs border border-[#182338]">
              <span className="text-[10px] text-slate-400 block uppercase">RECOMMENDED TRADING ACTION</span>
              <span className="font-bold text-[#ff9900] block mt-0.5">
                {sentiment?.tradingStrategy || 'Evaluating...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
