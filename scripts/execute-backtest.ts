
import YahooFinance from 'yahoo-finance2';
import { SMA, WilliamsR, KeltnerChannels, ATR } from 'technicalindicators';

const tickers = [
    'NVDA', 'AMD', 'MU', 'ARM', 'ASML', 'AMAT', 'LRCX', 'KLAC', 'TSM', 'AVGO', 'ADI', 'TXN', 'QCOM', 'INTC', 'WOLF'
];
const benchmark = 'SMH';

async function getHistory(symbol: string) {
    try {
        const results = await YahooFinance.historical(symbol, {
            period1: '2015-01-01',
            period2: new Date(),
            interval: '1d'
        });
        return results;
    } catch (e) {
        console.error(`Failed to fetch ${symbol}`);
        return [];
    }
}

function calculateDPO(close: number[], period: number = 20): (number | null)[] {
    const sma = SMA.calculate({ period, values: close });
    const shift = Math.floor(period / 2) + 1;
    const results: (number | null)[] = new Array(close.length).fill(null);

    for (let i = period - 1; i < close.length; i++) {
        const smaValue = sma[i - period + 1];
        const lookbackIdx = i - shift;
        if (lookbackIdx >= 0) {
            results[i] = close[lookbackIdx] - smaValue;
        }
    }
    return results;
}

function calculateKCW(high: number[], low: number[], close: number[], period: number = 20, multiplier: number = 2): (number | null)[] {
    try {
        const kc = KeltnerChannels.calculate({
            high,
            low,
            close,
            maPeriod: period,
            atrPeriod: period,
            multiplier,
            useSMA: false
        });
        const results: (number | null)[] = new Array(close.length).fill(null);
        const offset = close.length - kc.length;

        for (let i = 0; i < kc.length; i++) {
            const { upper, lower, middle } = kc[i];
            results[i + offset] = ((upper - lower) / middle) * 100;
        }
        return results;
    } catch (e) {
        return new Array(close.length).fill(null);
    }
}

async function runBacktest() {
    console.log('--- SEMICONDUCTOR REVERSAL BACKTEST ENGINE ---');
    console.log(`Universe: ${tickers.length} stocks + ${benchmark}`);

    const smhData = await getHistory(benchmark);
    if (!smhData.length) return;

    const smhCloses = smhData.map(d => d.close);
    const smhSMA50 = SMA.calculate({ period: 50, values: smhCloses });
    const smhSMA50Padded = [...new Array(smhCloses.length - smhSMA50.length).fill(null), ...smhSMA50];

    let totalSignals = 0;
    let successfulSignals = 0;
    let totalReturns = 0;
    const resultsByTicker: Record<string, any> = {};

    for (const ticker of tickers) {
        console.log(`Analyzing ${ticker}...`);
        const data = await getHistory(ticker);
        if (!data.length) continue;

        const closes = data.map(d => d.close);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);

        const kcw = calculateKCW(highs, lows, closes);
        const wr = WilliamsR.calculate({ high: highs, low: lows, close: closes, period: 14 });
        const wrPadded = [...new Array(closes.length - wr.length).fill(null), ...wr];
        const dpo = calculateDPO(closes);

        const tickerSignals = [];
        // Map individual stock dates to SMH dates
        for (let i = 100; i < data.length - 3; i++) {
            const date = data[i].date;
            // Find same date in SMH
            const smhIdx = smhData.findIndex(d => d.date.getTime() === date.getTime());
            if (smhIdx === -1 || !smhSMA50Padded[smhIdx]) continue;

            const isSectorCrash = smhData[smhIdx].close <= smhSMA50Padded[smhIdx] * 0.90;
            const isVolExpansion = (kcw[i] || 0) > 7.2;
            const isOversold = (wrPadded[i] || 0) < -81;
            const isStabilized = (dpo[i] || 0) > -0.31;

            if (isSectorCrash && isVolExpansion && isOversold && isStabilized) {
                // Signal Triggered!
                const entryPrice = closes[i];
                const maxPriceNext3Days = Math.max(closes[i + 1], closes[i + 2], closes[i + 3]);
                const returnPct = ((maxPriceNext3Days - entryPrice) / entryPrice) * 100;
                const isSuccess = returnPct >= 6.0;

                totalSignals++;
                if (isSuccess) successfulSignals++;
                totalReturns += returnPct;

                tickerSignals.push({
                    date: date.toISOString().split('T')[0],
                    return: returnPct,
                    success: isSuccess
                });
            }
        }
        resultsByTicker[ticker] = tickerSignals;
    }

    const precision = (successfulSignals / totalSignals) * 100;
    const avgReturn = totalReturns / totalSignals;

    console.log('\n--- BACKTEST RESULTS ---');
    console.log(`Total Signals: ${totalSignals}`);
    console.log(`Successful Signals (>= 6% in 3 days): ${successfulSignals}`);
    console.log(`Precision: ${precision.toFixed(2)}%`);
    console.log(`Average Max Return (3 Days): ${avgReturn.toFixed(2)}%`);

    // Top performers
    const sortedTickers = Object.entries(resultsByTicker).sort((a, b) => b[1].length - a[1].length);
    console.log('\n--- BY TICKER ---');
    sortedTickers.forEach(([t, s]) => {
        if (s.length === 0) return;
        const tPrec = (s.filter((sig: any) => sig.success).length / s.length) * 100;
        console.log(`${t}: ${s.length} signals, Precision: ${tPrec.toFixed(2)}%`);
    });
}

runBacktest();
