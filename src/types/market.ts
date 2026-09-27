export type ISOCode = 'PJM' | 'ERCOT' | 'CAISO' | 'MISO' | 'NYISO' | 'ISONE' | 'SPP';

export type MetricView = 'lmp' | 'load' | 'reserve' | 'renewables';

export interface LMPComponent {
  energy: number;     // Marginal Energy Component (MEC)
  congestion: number; // Marginal Congestion Component (MCC)
  loss: number;       // Marginal Loss Component (MLC)
}

export interface TradingHub {
  id: string;
  name: string;
  iso: ISOCode;
  type: 'Hub' | 'Zone' | 'Generator' | 'Intertie';
  rtmLmp: number;     // Real-Time Market $/MWh
  damLmp: number;     // Day-Ahead Market $/MWh
  spread: number;     // RTM - DAM
  components: LMPComponent;
  change24h: number;  // % change
  volumeMW: number;
  volatilityZScore: number;
  coordinates: [number, number]; // [longitude, latitude] for map projection
}

export interface GenerationFuelMix {
  naturalGas: number; // MW
  coal: number;
  nuclear: number;
  wind: number;
  solar: number;
  hydro: number;
  battery: number;    // positive: discharge, negative: charge
}

export interface ISORegionData {
  code: ISOCode;
  name: string;
  states: string[];
  currentLoadMW: number;
  forecastLoadMW: number;
  peakLoadMW: number;
  capacityMW: number;
  reserveMarginPct: number;
  avgLmp: number;
  damAvgLmp: number;
  sparkSpread: number; // $/MWh
  fuelMix: GenerationFuelMix;
  hubs: TradingHub[];
  frequencyHz: number;
  interconnection: 'Eastern' | 'Texas Interconnection' | 'Western';
  coordinates: {
    center: [number, number];
    labelPos: [number, number];
  };
}

export interface ForecastPoint {
  timestamp: string;
  hour: number;
  actualLoad?: number;
  forecastLoad: number;
  p10Load: number;
  p90Load: number;
  rtmLmp?: number;
  damLmp: number;
  spread?: number;
}

export interface MarketAlertRule {
  id: string;
  name: string;
  iso: ISOCode | 'ALL';
  metric: 'rtmLmp' | 'spread' | 'reserveMarginPct' | 'loadSpike' | 'volatilityZScore';
  operator: '>' | '<';
  threshold: number;
  severity: 'warning' | 'critical';
  enabled: boolean;
  soundEnabled: boolean;
  createdAt: string;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  iso: ISOCode;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  severity: 'warning' | 'critical';
  acknowledged: boolean;
}

export interface MarketScenario {
  id: string;
  title: string;
  subtitle: string;
  targetISO: ISOCode;
  description: string;
  traderTakeaway: string;
  modifiers: {
    lmpMultiplier: number;
    loadMultiplier: number;
    solarMultiplier: number;
    windMultiplier: number;
    gasMultiplier: number;
    congestionOffset: number;
  };
}
