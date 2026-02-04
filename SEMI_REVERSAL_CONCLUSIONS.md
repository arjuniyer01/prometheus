# Research Report: Semiconductor Reversal Signatures
**Date:** February 3, 2026
**Subject:** High-Precision Short-Term Spike Prediction
**Data Universe:** Semiconductors
- **Equities:** NVDA, AMD, MU, ARM, ASML, AMAT, LRCX, KLAC, TSM, AVGO, ADI, TXN, QCOM, INTC, WOLF
- **Benchmarks/ETFs:** SMH, SOXX
**Sample Size:** ~37,000 Trading Days (Post-2015)

---

## 1. Executive Summary
Our research has moved from single-ticker analysis (AAPL) to **Sector-Based Mean Reversion**. By training a Decision Tree on the entire Semiconductor universe, we have identified a specific "Signature" that predicts a **+6% price spike within 3 trading days** with a historical precision of **69.89%**. This significantly outperforms the random sector baseline (~26%).

## 2. The Infrastructure: Quant Pipeline
We established a standardized pipeline that fetches raw data and calculates a "Kitchen Sink" of 100+ technical indicators. 
*   **Stationary Features:** Every feature used in the model is relative (e.g., % distance from SMA, RSI, Wick-to-Body ratio) rather than absolute price levels.
*   **Sector Context:** Every individual stock sample is enriched with the current state of the **SMH Semiconductor ETF**.

## 3. Key Finding: The "Golden Reversal" Signature
The model's highest-precision leaf (68.5% success rate) identifies a scenario of **Maximum Compression during a Sector Bloodbath**.

### The 4 Pillars of the Signal:
1.  **Sector Crash:** The **SMH ETF** must be at least **10% below its 50-day SMA**. (Individual stocks rarely reverse with high confidence unless the whole sector has "washed out").
2.  **Volatility Expansion:** The stock's **Keltner Channel Width (KCW)** must be high (> 7.2). This indicates that while the sector is down, the specific stock's price range is expanding—often a sign of high-volume capitulation.
3.  **Terminal Oversold:** The **Williams %R** indicator must be below **-81**. This confirms the stock is at the bottom of its recent range.
4.  **Price Stabilization:** The **Detrended Price Oscillator (DPO)** must be **above -0.31**. This is the most critical filter; it suggests that even though the stock is oversold, the *rate of decline* has flattened, indicating the "vertical drop" is over.

## 4. Performance Metrics
| Metric | Result |
| :--- | :--- |
| **High-Confidence Precision** | **69.89%** |
| **Random Baseline** | ~26.00% |
| **Target Return** | +6% in < 3 Days |
| **Confidence Boost** | 2.7x over random chance |

## 5. Strategic Conclusion
Individual technical indicators are noisy. However, when **Sector Fatigue** (SMH < SMA50 by 10%) aligns with **Stock-Specific Stabilization** (DPO > -0.31), the probability of a violent mean-reversion spike in Semiconductor stocks increases nearly threefold.

---
**Model Location:** `/master_tree.py`
**Leaf Stats:** `/leaf_analysis.py`
**Visual Evidence:** `/spike_drivers.png`
