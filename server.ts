import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Google GenAI with recommended telemetry header
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// API Route for AI Market Sentiment Analysis
app.post('/api/market-sentiment', async (req, res) => {
  try {
    const { iso, regionData, gasPrice, currentScenario } = req.body;

    if (!regionData) {
      return res.status(400).json({ error: 'Missing regionData' });
    }

    // If Gemini API is available, call gemini-3.8-flash
    if (ai) {
      try {
        const prompt = `You are a chief commodity power and financial transmission rights (FTR) trader analyzing real-time electricity markets.
Analyze the current fundamental and technical conditions for ISO: ${iso} (${regionData.name}):
- Current Wholesale RTM LMP: $${regionData.avgLmp}/MWh
- Day-Ahead Market (DAM) LMP: $${regionData.damAvgLmp}/MWh
- DART Spread (RTM - DAM): $${(regionData.avgLmp - regionData.damAvgLmp).toFixed(2)}/MWh
- Current Grid Load: ${regionData.currentLoadMW} MW (Peak: ${regionData.peakLoadMW} MW)
- Operating Reserve Margin: ${regionData.reserveMarginPct}%
- Henry Hub Gas Benchmark: $${gasPrice}/MMBtu
- Clean Spark Spread: $${regionData.sparkSpread}/MWh
- Interconnection: ${regionData.interconnection}
- Generation Fuel Stack: Gas ${regionData.fuelMix.naturalGas}MW, Wind ${regionData.fuelMix.wind}MW, Solar ${regionData.fuelMix.solar}MW, Nuclear ${regionData.fuelMix.nuclear}MW, Coal ${regionData.fuelMix.coal}MW, Battery ${regionData.fuelMix.battery}MW.
- Active Market Event: ${currentScenario?.title || 'Normal Operations'} - ${currentScenario?.description || ''}

Evaluate whether near-term wholesale power prices (next 2-6 hours) are BULLISH (price upward pressure/spikes), BEARISH (price downward pressure/oversupply/negative pricing), or NEUTRAL (stable equilibrium).
Provide an institutional-grade, highly actionable commodity trader assessment.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sentiment: {
                  type: Type.STRING,
                  description: "Must be 'BULLISH', 'BEARISH', or 'NEUTRAL'",
                },
                confidenceScore: {
                  type: Type.INTEGER,
                  description: 'Confidence level from 0 to 100',
                },
                headline: {
                  type: Type.STRING,
                  description: 'Short Bloomberg terminal headline (under 12 words)',
                },
                summary: {
                  type: Type.STRING,
                  description: 'Concise 2-sentence institutional trade desk summary',
                },
                drivers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '3 key quantitative market drivers',
                },
                priceOutlookNext4Hours: {
                  type: Type.STRING,
                  description: 'Expected price trajectory (e.g. +$15 to +$30/MWh or -$10 to -$20/MWh)',
                },
                tradingStrategy: {
                  type: Type.STRING,
                  description: 'Recommended virtual bidding or asset dispatch action',
                },
              },
              required: [
                'sentiment',
                'confidenceScore',
                'headline',
                'summary',
                'drivers',
                'priceOutlookNext4Hours',
                'tradingStrategy',
              ],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          return res.json({ ...parsed, source: 'ai-gemini' });
        }
      } catch (geminiErr) {
        console.error('Gemini API call failed, using heuristic model fallback:', geminiErr);
      }
    }

    // Institutional Heuristic Fallback (Ensures 100% uptime and resilience)
    const spread = regionData.avgLmp - regionData.damAvgLmp;
    const reserveMargin = regionData.reserveMarginPct;
    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let confidence = 75;
    let headline = '';
    let summary = '';
    let drivers: string[] = [];
    let priceOutlook = '';
    let tradingStrategy = '';

    if (reserveMargin < 10 || spread > 12 || regionData.avgLmp > 65) {
      sentiment = 'BULLISH';
      confidence = Math.min(95, Math.round(70 + (10 - Math.min(10, reserveMargin)) * 2.5 + Math.abs(spread)));
      headline = `${iso} RTM POWER UNDER HEAVY UPWARD PRESSURE ON SUPPLY TIGHTNESS`;
      summary = `Operating reserve margin has constricted to ${reserveMargin.toFixed(1)}% with RTM clearing at a +$${spread.toFixed(2)} premium over DAM. Peakers are receiving economic dispatch signals.`;
      drivers = [
        `Tight generation margin: ${reserveMargin.toFixed(1)}% vs 15.0% reliability benchmark`,
        `Real-time load approaching ${((regionData.currentLoadMW / regionData.peakLoadMW) * 100).toFixed(0)}% of seasonal peak`,
        `Gas generation marginal heat rate setting cleared energy component at $${(regionData.avgLmp * 0.85).toFixed(1)}/MWh`,
      ];
      priceOutlook = '+$20.00 to +$55.00/MWh upward drift during peak load window';
      tradingStrategy = 'Long DART virtual spread; dispatch CT open-cycle peakers into RTM reserves.';
    } else if (regionData.avgLmp < 22 || regionData.fuelMix.solar + regionData.fuelMix.wind > regionData.currentLoadMW * 0.45) {
      sentiment = 'BEARISH';
      confidence = Math.min(92, Math.round(72 + (regionData.avgLmp < 0 ? 20 : 10)));
      headline = `${iso} WHOLESALE MARGINAL PRICES CRUSHED BY RENEWABLE SURPLUS`;
      summary = `Massive zero-marginal-cost renewable penetration is forcing thermal generation down to minimum turn-down limits. Downside risk persists until the evening ramp.`;
      drivers = [
        `Renewable generation supplying ${(((regionData.fuelMix.solar + regionData.fuelMix.wind) / regionData.currentLoadMW) * 100).toFixed(0)}% of instantaneous demand`,
        `Depressed RTM clearing at $${regionData.avgLmp.toFixed(2)}/MWh vs DAM of $${regionData.damAvgLmp.toFixed(2)}`,
        `Transmission export interfaces approaching thermal limit boundaries`,
      ];
      priceOutlook = '-$8.00 to -$15.00/MWh downside pressure with potential curtailment risks';
      tradingStrategy = 'Charge battery energy storage systems (BESS); take short virtual DAM positions.';
    } else {
      sentiment = 'NEUTRAL';
      confidence = 74;
      headline = `${iso} POWER SUPPLY-DEMAND EQUILIBRIUM TRADING WITHIN TIGHT BAND`;
      summary = `Grid fundamentals remain well-buffered with a comfortable ${reserveMargin.toFixed(1)}% reserve margin. Arbitrage spreads are oscillating within historical normal distribution bounds.`;
      drivers = [
        `Balanced reserve margin at ${reserveMargin.toFixed(1)}%`,
        `DART spread trading tightly at $${spread.toFixed(2)}/MWh`,
        `Spark spread at $${regionData.sparkSpread.toFixed(2)}/MWh offers steady CCGT margin`,
      ];
      priceOutlook = '±$4.00/MWh range-bound price action';
      tradingStrategy = 'Market-neutral arbitrage; execute intra-hour battery cycle optimization.';
    }

    return res.json({
      sentiment,
      confidenceScore: confidence,
      headline,
      summary,
      drivers,
      priceOutlookNext4Hours: priceOutlook,
      tradingStrategy,
      source: 'algorithmic-heuristic',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal sentiment engine failure';
    console.error('Sentiment engine error:', err);
    res.status(500).json({ error: errorMsg });
  }
});

// Mount Vite or serve static production build
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GridPulse Terminal server running on port ${PORT} (prod: ${isProd})`);
  });
}

startServer();
