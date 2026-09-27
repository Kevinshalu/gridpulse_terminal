import { ISOCode, ISORegionData, ForecastPoint, MarketAlertRule, TriggeredAlert, MarketScenario } from '../types/market';
import { INITIAL_ISO_DATA, DEFAULT_ALERT_RULES, MARKET_SCENARIOS } from '../data/isoRegions';

export class MarketEngine {
  private isoData: Record<ISOCode, ISORegionData>;
  private alertRules: MarketAlertRule[];
  private triggeredAlerts: TriggeredAlert[];
  private currentScenario: MarketScenario;
  private listeners: Set<() => void>;
  private timerId: number | null = null;
  private tickCount: number = 0;
  private henryHubGasPrice: number = 2.85; // $/MMBtu
  private isStreaming: boolean = true;
  private updateIntervalMs: number = 2000;
  private latencyMs: number = 42; // simulated AWS websocket ping

  constructor() {
    this.isoData = JSON.parse(JSON.stringify(INITIAL_ISO_DATA));
    this.alertRules = JSON.parse(JSON.stringify(DEFAULT_ALERT_RULES));
    this.triggeredAlerts = [];
    this.currentScenario = MARKET_SCENARIOS[0];
    this.listeners = new Set();
    this.startStreaming();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getISOData(): Record<ISOCode, ISORegionData> {
    return this.isoData;
  }

  public getRegion(code: ISOCode): ISORegionData {
    return this.isoData[code];
  }

  public getAlertRules(): MarketAlertRule[] {
    return this.alertRules;
  }

  public getTriggeredAlerts(): TriggeredAlert[] {
    return this.triggeredAlerts;
  }

  public getCurrentScenario(): MarketScenario {
    return this.currentScenario;
  }

  public getHenryHubPrice(): number {
    return this.henryHubGasPrice;
  }

  public setHenryHubPrice(price: number) {
    this.henryHubGasPrice = Math.max(0.5, Number(price.toFixed(2)));
    this.recalculateSparkSpreads();
    this.notify();
  }

  public getStreamingStatus(): { isStreaming: boolean; latencyMs: number; tickCount: number } {
    return {
      isStreaming: this.isStreaming,
      latencyMs: this.latencyMs,
      tickCount: this.tickCount,
    };
  }

  public toggleStreaming(enable?: boolean) {
    this.isStreaming = enable !== undefined ? enable : !this.isStreaming;
    if (this.isStreaming && !this.timerId) {
      this.startStreaming();
    } else if (!this.isStreaming && this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notify();
  }

  public setScenario(scenarioId: string) {
    const found = MARKET_SCENARIOS.find(s => s.id === scenarioId);
    if (!found) return;
    this.currentScenario = found;
    this.applyScenario();
    this.notify();
  }

  public addAlertRule(rule: Omit<MarketAlertRule, 'id' | 'createdAt'>): MarketAlertRule {
    const newRule: MarketAlertRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    this.alertRules.unshift(newRule);
    this.notify();
    return newRule;
  }

  public updateAlertRule(id: string, updates: Partial<MarketAlertRule>) {
    this.alertRules = this.alertRules.map(r => r.id === id ? { ...r, ...updates } : r);
    this.notify();
  }

  public deleteAlertRule(id: string) {
    this.alertRules = this.alertRules.filter(r => r.id !== id);
    this.notify();
  }

  public acknowledgeAlert(alertId: string) {
    this.triggeredAlerts = this.triggeredAlerts.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    );
    this.notify();
  }

  public clearAllAlerts() {
    this.triggeredAlerts = [];
    this.notify();
  }

  private startStreaming() {
    if (typeof window === 'undefined') return;
    this.timerId = window.setInterval(() => {
      this.tick();
    }, this.updateIntervalMs);
  }

  private tick() {
    this.tickCount++;
    // Simulate real-time stochastic tick fluctuations
    this.latencyMs = Math.round(28 + Math.random() * 25);
    const codes: ISOCode[] = ['PJM', 'ERCOT', 'CAISO', 'MISO', 'NYISO', 'ISONE', 'SPP'];

    for (const code of codes) {
      const region = this.isoData[code];
      const isTarget = code === this.currentScenario.targetISO;
      const scenMod = isTarget ? this.currentScenario.modifiers : {
        lmpMultiplier: 1.0,
        loadMultiplier: 1.0,
        solarMultiplier: 1.0,
        windMultiplier: 1.0,
        gasMultiplier: 1.0,
        congestionOffset: 0,
      };

      // Brownian noise
      const lmpNoise = (Math.random() - 0.49) * 0.8;
      const loadNoise = (Math.random() - 0.49) * 120;

      // Update frequency slightly around 60.00 Hz
      const targetFreq = isTarget && this.currentScenario.id === 'ercot-heatwave' ? 59.88 : 60.00;
      region.frequencyHz = Number((targetFreq + (Math.random() - 0.5) * 0.03).toFixed(2));

      // Update regional load
      const baseLoad = INITIAL_ISO_DATA[code].currentLoadMW * scenMod.loadMultiplier;
      region.currentLoadMW = Math.round(baseLoad + (Math.sin(this.tickCount * 0.1) * 800) + loadNoise);

      // Update reserve margin
      const reserve = ((region.capacityMW - region.currentLoadMW) / region.currentLoadMW) * 100;
      region.reserveMarginPct = Number(Math.max(2.1, reserve).toFixed(1));

      // Update hubs and aggregate LMP
      let sumLmp = 0;
      region.hubs.forEach((hub, idx) => {
        const baseRtm = INITIAL_ISO_DATA[code].hubs[idx].rtmLmp;
        let targetLmp = baseRtm * scenMod.lmpMultiplier;

        // Apply special scenario tweaks
        if (isTarget && this.currentScenario.id === 'pjm-congest-trip' && hub.id === 'PJM_DOM') {
          targetLmp += scenMod.congestionOffset * 1.5;
        } else if (isTarget && this.currentScenario.id === 'caiso-duck-curve') {
          targetLmp = -15 - Math.random() * 20; // negative pricing
        }

        const tickShift = lmpNoise + (Math.random() - 0.49) * 1.2;
        hub.rtmLmp = Number((targetLmp + tickShift).toFixed(2));
        hub.spread = Number((hub.rtmLmp - hub.damLmp).toFixed(2));

        // Update components
        const energyShare = hub.rtmLmp * 0.85;
        const congestionShare = hub.spread * 0.8 + (scenMod.congestionOffset ? scenMod.congestionOffset * 0.5 : 0);
        const lossShare = hub.rtmLmp * 0.015;
        hub.components = {
          energy: Number(energyShare.toFixed(2)),
          congestion: Number(congestionShare.toFixed(2)),
          loss: Number(lossShare.toFixed(2)),
        };

        // Z-score volatility metric
        const dev = Math.abs(hub.spread);
        hub.volatilityZScore = Number((0.5 + (dev / 12) + (Math.random() * 0.3)).toFixed(2));

        sumLmp += hub.rtmLmp;
      });

      region.avgLmp = Number((sumLmp / region.hubs.length).toFixed(2));

      // Update Spark Spread: Spark Spread = LMP - (HeatRate * GasPrice / 1000) - VOM
      // Assuming avg CCGT heat rate ~ 7,200 Btu/kWh and $3.50 VOM
      const fuelCost = (7200 / 1000) * this.henryHubGasPrice * scenMod.gasMultiplier;
      region.sparkSpread = Number((region.avgLmp - fuelCost - 3.50).toFixed(2));
    }

    this.checkAlerts();
    this.notify();
  }

  private applyScenario() {
    this.tick();
  }

  private recalculateSparkSpreads() {
    const codes: ISOCode[] = ['PJM', 'ERCOT', 'CAISO', 'MISO', 'NYISO', 'ISONE', 'SPP'];
    for (const code of codes) {
      const region = this.isoData[code];
      const fuelCost = (7200 / 1000) * this.henryHubGasPrice;
      region.sparkSpread = Number((region.avgLmp - fuelCost - 3.50).toFixed(2));
    }
  }

  private checkAlerts() {
    const nowStr = new Date().toLocaleTimeString();

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const targetISOs = rule.iso === 'ALL'
        ? (Object.keys(this.isoData) as ISOCode[])
        : [rule.iso];

      for (const iso of targetISOs) {
        const region = this.isoData[iso];
        let metricVal: number | undefined;

        if (rule.metric === 'rtmLmp') {
          metricVal = region.avgLmp;
        } else if (rule.metric === 'spread') {
          // Max spread among hubs
          metricVal = Math.max(...region.hubs.map(h => Math.abs(h.spread)));
        } else if (rule.metric === 'reserveMarginPct') {
          metricVal = region.reserveMarginPct;
        } else if (rule.metric === 'volatilityZScore') {
          metricVal = Math.max(...region.hubs.map(h => h.volatilityZScore));
        }

        if (metricVal !== undefined) {
          const isTriggered = rule.operator === '>' ? metricVal > rule.threshold : metricVal < rule.threshold;
          if (isTriggered) {
            // Prevent spamming identical alert within 30 seconds
            const recent = this.triggeredAlerts.find(
              a => a.ruleId === rule.id && a.iso === iso && !a.acknowledged
            );

            if (!recent) {
              const newAlert: TriggeredAlert = {
                id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                ruleId: rule.id,
                ruleName: rule.name,
                iso,
                metric: rule.metric,
                value: Number(metricVal.toFixed(2)),
                threshold: rule.threshold,
                timestamp: nowStr,
                severity: rule.severity,
                acknowledged: false,
              };

              this.triggeredAlerts.unshift(newAlert);
              if (this.triggeredAlerts.length > 50) {
                this.triggeredAlerts.pop();
              }

              if (rule.soundEnabled) {
                this.playAlertTone(rule.severity === 'critical');
              }
            }
          }
        }
      }
    }
  }

  private playAlertTone(isCritical: boolean) {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isCritical ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isCritical ? 880 : 540, ctx.currentTime);
      if (isCritical) {
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
      }

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      // Audio context might be restricted before user interaction
    }
  }

  // Generates 24-hour historical + forward forecast data for selected ISO
  public getForecastTimeSeries(iso: ISOCode, timeframe: '24h' | '7d' | '30d' = '24h'): ForecastPoint[] {
    const region = this.isoData[iso];
    const points: ForecastPoint[] = [];
    const baseLoad = region.currentLoadMW;
    const baseLmp = region.avgLmp;
    const count = timeframe === '24h' ? 24 : (timeframe === '7d' ? 48 : 60);

    for (let i = 0; i < count; i++) {
      const hourOffset = i - Math.floor(count * 0.6); // 60% historical, 40% forward forecast
      const isHistorical = hourOffset <= 0;
      
      const hourOfDay = (14 + hourOffset + 240) % 24;
      // Typical daily diurnal load curve: trough at 4 AM, peak at 6 PM
      const diurnalFactor = 0.75 + 0.28 * Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI);
      const forecastLoad = Math.round(baseLoad * diurnalFactor);
      const uncertainty = Math.abs(hourOffset) * (baseLoad * 0.015);
      const p10Load = Math.round(forecastLoad - uncertainty * 1.6);
      const p90Load = Math.round(forecastLoad + uncertainty * 1.6);
      
      const actualLoad = isHistorical
        ? Math.round(forecastLoad + (Math.sin(i * 1.4) * (baseLoad * 0.035)))
        : undefined;

      const damLmp = Number((baseLmp * (diurnalFactor * 1.1) + Math.cos(i * 0.8) * 3).toFixed(2));
      const rtmLmp = isHistorical
        ? Number((damLmp + (Math.sin(i * 2.1) * 8.5) + (isHistorical && hourOffset === 0 ? region.avgLmp - damLmp : 0)).toFixed(2))
        : undefined;

      const date = new Date();
      date.setHours(date.getHours() + hourOffset);
      const timestamp = timeframe === '24h'
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;

      points.push({
        timestamp,
        hour: hourOfDay,
        actualLoad,
        forecastLoad,
        p10Load,
        p90Load,
        damLmp,
        rtmLmp,
        spread: rtmLmp !== undefined ? Number((rtmLmp - damLmp).toFixed(2)) : undefined,
      });
    }

    return points;
  }
}

// Global Singleton for application state
export const marketEngine = new MarketEngine();
