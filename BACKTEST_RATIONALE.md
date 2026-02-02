# Prometheus Backtest Accuracy Rationale

## Overview
The Prometheus Backtest Engine provides historical validation of technical breakout thresholds (Bull/Bear Triggers). It evaluates the integrity of these levels by analyzing price action over a subsequent 1-week (5-trading day) horizon.

## 1. Trigger Calculation (The Estimate)
To provide a fair backtest, every historical data point calculates what the "Forward Triggers" would have been at that exact moment.

### Synthesis Blend:
- **Resistance/Support**: Uses 20-period Donchian Channels (High/Low).
- **Trend Alignment**: Anchored to the 20-period EMA.
- **Volatility Buffer**: Uses ATR (Average True Range).
- **Adaptive Sentiment**: A "Sigma" multiplier (ranging from 0.5 to 2.0) that tightens or expands triggers based on the internal Consensus Score (-100 to +100).

## 2. Validation Logic (The Integrity Check)
Accuracy is calculated using a **5-day Lookahead Window** from the point of estimation.

### Bull Trigger Accuracy (1W)
- **Condition: Bullish Breach**
  - If the maximum high within the next week hits or exceeds the Bull Trigger.
  - **Success (100%)**: If the end-of-week price remains above or at the Trigger level.
  - **Failure (0%)**: If the price breached the level but failed to hold, closing the week below the trigger (Bull Trap).
- **Condition: Range Maintained**
  - If the price never reached the Bull Trigger.
  - **Success (100%)**: The trigger successfully acted as a structural resistance ceiling.
  - **Failure (0%)**: N/A (The ceiling held by definition).

### Bear Trigger Accuracy (1W)
- **Condition: Bearish Breach**
  - If the minimum low within the next week hits or drops below the Bear Trigger.
  - **Success (100%)**: If the end-of-week price remains below or at the Trigger level.
  - **Failure (0%)**: If the price breached the level but recovered, closing the week above the trigger (Bear Trap).
- **Condition: Range Maintained**
  - If the price never reached the Bear Trigger.
  - **Success (100%)**: The trigger successfully acted as a structural support floor.
  - **Failure (0%)**: N/A (The floor held by definition).

## 3. Visual Indicators in UI
- **Percentage (0-100%)**: The degree to which the estimate held its integrity.
- **Status Badges**:
  - `Bullish Breach`: Confirmed Trend Extension (Up).
  - `Bearish Breach`: Confirmed Trend Extension (Down).
  - `Range Maintained`: Volatility successfully contained within predicted boundaries.

## 4. Purpose
The goal of this metric is to build user trust by surfacing the AI's "Track Record" directly on the chart. It objectively proves where the Technical Intelligence engine is most reliable and where market noise has previously caused false signals.
