/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ISOCode, TradingHub, MarketAlertRule, TriggeredAlert } from './types/market';
import { marketEngine } from './services/marketSimulator';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { GridHeatmap } from './components/GridHeatmap';
import { ForecastingChart } from './components/ForecastingChart';
import { GenerationMixChart } from './components/GenerationMixChart';
import { HubPricingTable } from './components/HubPricingTable';
import { SparkSpreadCalculator } from './components/SparkSpreadCalculator';
import { MarketSentiment } from './components/MarketSentiment';
import { VolatilityAlertsModal } from './components/VolatilityAlertsModal';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import { ArchitectureModal } from './components/ArchitectureModal';
import { TraderGuideModal } from './components/TraderGuideModal';

export default function App() {
  // Application State
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedISO, setSelectedISO] = useState<ISOCode>('PJM');
  const [selectedHub, setSelectedHub] = useState<TradingHub | null>(null);

  // Modals state
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isScenariosOpen, setIsScenariosOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isTraderGuideOpen, setIsTraderGuideOpen] = useState(false);

  // Market Engine subscription state
  const [isoData, setIsoData] = useState(() => marketEngine.getISOData());
  const [alertRules, setAlertRules] = useState<MarketAlertRule[]>(() => marketEngine.getAlertRules());
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>(() => marketEngine.getTriggeredAlerts());
  const [currentScenario, setCurrentScenario] = useState(() => marketEngine.getCurrentScenario());
  const [henryHubPrice, setHenryHubPrice] = useState(() => marketEngine.getHenryHubPrice());
  const [streamingStatus, setStreamingStatus] = useState(() => marketEngine.getStreamingStatus());

  useEffect(() => {
    const handleUpdate = () => {
      setIsoData({ ...marketEngine.getISOData() });
      setAlertRules([...marketEngine.getAlertRules()]);
      setTriggeredAlerts([...marketEngine.getTriggeredAlerts()]);
      setCurrentScenario(marketEngine.getCurrentScenario());
      setHenryHubPrice(marketEngine.getHenryHubPrice());
      setStreamingStatus(marketEngine.getStreamingStatus());
    };

    const unsubscribe = marketEngine.subscribe(handleUpdate);
    return () => unsubscribe();
  }, []);

  const handleQuickAlert = (hub: TradingHub) => {
    marketEngine.addAlertRule({
      name: `${hub.name} Volatility Spike (> $${(hub.rtmLmp * 1.5).toFixed(0)})`,
      iso: hub.iso,
      metric: 'rtmLmp',
      operator: '>',
      threshold: Number((hub.rtmLmp * 1.5).toFixed(0)),
      severity: 'critical',
      enabled: true,
      soundEnabled: true,
    });
  };

  const activeRegion = isoData[selectedISO];
  const unacknowledgedAlerts = triggeredAlerts.filter(a => !a.acknowledged);

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col font-mono selection:bg-amber-500/20 selection:text-amber-300">
      {/* Institutional Top Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isStreaming={streamingStatus.isStreaming}
        onToggleStreaming={() => marketEngine.toggleStreaming()}
        latencyMs={streamingStatus.latencyMs}
        unacknowledgedAlerts={unacknowledgedAlerts}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenScenarios={() => setIsScenariosOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenTraderGuide={() => setIsTraderGuideOpen(true)}
      />

      {/* Main Terminal Viewport */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 xl:px-8 py-5 space-y-5">
        {/* National Metric Overview & ISO Selector Strip */}
        <MetricCards
          isoData={isoData}
          currentScenario={currentScenario}
          onResetScenario={() => marketEngine.setScenario('normal')}
          selectedISO={selectedISO}
          onSelectISO={(iso) => {
            setSelectedISO(iso);
            setSelectedHub(null);
          }}
        />

        {/* Tab 1: Comprehensive Grid Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* AI Market Sentiment Radar */}
            <MarketSentiment
              selectedISO={selectedISO}
              isoData={isoData}
              gasPrice={henryHubPrice}
              currentScenario={currentScenario}
              onSelectISO={(iso) => {
                setSelectedISO(iso);
                setSelectedHub(null);
              }}
            />

            {/* Interactive D3 US Map & Heatmap */}
            <GridHeatmap
              isoData={isoData}
              selectedISO={selectedISO}
              onSelectISO={(iso) => {
                setSelectedISO(iso);
                setSelectedHub(null);
              }}
              selectedHub={selectedHub}
              onSelectHub={setSelectedHub}
            />

            {/* Middle Grid: Forecasting Curves + Generation Stack */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <ForecastingChart
                  selectedISO={selectedISO}
                  regionName={activeRegion.name}
                />
              </div>
              <div className="lg:col-span-1">
                <GenerationMixChart
                  fuelMix={activeRegion.fuelMix}
                  isoCode={selectedISO}
                  currentLoadMW={activeRegion.currentLoadMW}
                />
              </div>
            </div>

            {/* Spark Spread Valuation Matrix */}
            <SparkSpreadCalculator
              isoData={isoData}
              henryHubPrice={henryHubPrice}
              onUpdateHenryHub={(p) => marketEngine.setHenryHubPrice(p)}
              selectedISO={selectedISO}
            />

            {/* Trading Hubs Table */}
            <HubPricingTable
              isoData={isoData}
              selectedISO={selectedISO}
              onSelectHub={(hub) => {
                setSelectedISO(hub.iso);
                setSelectedHub(hub);
              }}
              onQuickAlert={handleQuickAlert}
            />
          </div>
        )}

        {/* Tab 2: AI Market Sentiment Radar */}
        {activeTab === 'sentiment' && (
          <div className="space-y-5">
            <MarketSentiment
              selectedISO={selectedISO}
              isoData={isoData}
              gasPrice={henryHubPrice}
              currentScenario={currentScenario}
              onSelectISO={(iso) => {
                setSelectedISO(iso);
                setSelectedHub(null);
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <ForecastingChart
                  selectedISO={selectedISO}
                  regionName={activeRegion.name}
                />
              </div>
              <div className="lg:col-span-1">
                <GenerationMixChart
                  fuelMix={activeRegion.fuelMix}
                  isoCode={selectedISO}
                  currentLoadMW={activeRegion.currentLoadMW}
                />
              </div>
            </div>

            <HubPricingTable
              isoData={isoData}
              selectedISO={selectedISO}
              onSelectHub={(hub) => {
                setSelectedISO(hub.iso);
                setSelectedHub(hub);
              }}
              onQuickAlert={handleQuickAlert}
            />
          </div>
        )}

        {/* Tab 2: Full-screen LMP Heatmap */}
        {activeTab === 'map' && (
          <div className="space-y-5">
            <GridHeatmap
              isoData={isoData}
              selectedISO={selectedISO}
              onSelectISO={(iso) => {
                setSelectedISO(iso);
                setSelectedHub(null);
              }}
              selectedHub={selectedHub}
              onSelectHub={setSelectedHub}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GenerationMixChart
                fuelMix={activeRegion.fuelMix}
                isoCode={selectedISO}
                currentLoadMW={activeRegion.currentLoadMW}
              />
              <SparkSpreadCalculator
                isoData={isoData}
                henryHubPrice={henryHubPrice}
                onUpdateHenryHub={(p) => marketEngine.setHenryHubPrice(p)}
                selectedISO={selectedISO}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Detailed Load & Price Forecasting */}
        {activeTab === 'forecast' && (
          <div className="space-y-5">
            <ForecastingChart
              selectedISO={selectedISO}
              regionName={activeRegion.name}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GenerationMixChart
                fuelMix={activeRegion.fuelMix}
                isoCode={selectedISO}
                currentLoadMW={activeRegion.currentLoadMW}
              />
              <HubPricingTable
                isoData={isoData}
                selectedISO={selectedISO}
                onSelectHub={(hub) => {
                  setSelectedISO(hub.iso);
                  setSelectedHub(hub);
                }}
                onQuickAlert={handleQuickAlert}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Node Trading Desk */}
        {activeTab === 'hubs' && (
          <div className="space-y-5">
            <HubPricingTable
              isoData={isoData}
              selectedISO={selectedISO}
              onSelectHub={(hub) => {
                setSelectedISO(hub.iso);
                setSelectedHub(hub);
              }}
              onQuickAlert={handleQuickAlert}
            />
            <SparkSpreadCalculator
              isoData={isoData}
              henryHubPrice={henryHubPrice}
              onUpdateHenryHub={(p) => marketEngine.setHenryHubPrice(p)}
              selectedISO={selectedISO}
            />
          </div>
        )}

        {/* Tab 5: Spark Spread Analytics */}
        {activeTab === 'spark' && (
          <div className="space-y-5">
            <SparkSpreadCalculator
              isoData={isoData}
              henryHubPrice={henryHubPrice}
              onUpdateHenryHub={(p) => marketEngine.setHenryHubPrice(p)}
              selectedISO={selectedISO}
            />
            <HubPricingTable
              isoData={isoData}
              selectedISO={selectedISO}
              onSelectHub={(hub) => {
                setSelectedISO(hub.iso);
                setSelectedHub(hub);
              }}
              onQuickAlert={handleQuickAlert}
            />
          </div>
        )}
      </main>

      {/* Subtle Footer with Metadata, Attribution and Architecture Reference */}
      <footer className="border-t border-[#1e2638] bg-[#070a0f] py-4">
        <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 xl:px-8 text-xs text-slate-400 font-mono flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="text-[#ff9900] font-bold tracking-wider uppercase">GRIDPULSE TERMINAL</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>US Electricity Wholesale & Commodity Analytics</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-amber-400 font-medium">Developed by Kevin Shalu</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsArchitectureOpen(true)}
              className="hover:text-[#ff9900] text-slate-400 transition-colors cursor-pointer"
            >
              AWS Architecture Specs
            </button>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <button
              onClick={() => setIsTraderGuideOpen(true)}
              className="hover:text-cyan-400 text-slate-400 transition-colors cursor-pointer"
            >
              Trader's Primer
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <VolatilityAlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alertRules={alertRules}
        triggeredAlerts={triggeredAlerts}
      />

      <ScenarioSimulator
        isOpen={isScenariosOpen}
        onClose={() => setIsScenariosOpen(false)}
        currentScenario={currentScenario}
        onSelectScenario={(id) => marketEngine.setScenario(id)}
      />

      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      <TraderGuideModal
        isOpen={isTraderGuideOpen}
        onClose={() => setIsTraderGuideOpen(false)}
      />
    </div>
  );
}
