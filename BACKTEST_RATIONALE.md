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
- **Directional Bias**: Categorizes terminal momentum into **Bullish** (Score > 15), **Bearish** (Score < -15), or **Neutral** (Lateral consolidation).

## 1.1 Mathematical Formulas (Quantitative Architecture)

The system utilizes a **Multi-Factor Normalized Model** to estimate market trajectory, moving away from simple point-based heuristics to a statistically standardized framework.

### Weekly Prediction Bias ($WPB$)
The composite sentiment score ($WPB \in [-1, 1]$) is derived from three primary quantitative vectors:
$$WPB = (w_1 \cdot T_s + w_2 \cdot M_{final} + w_3 \cdot O_s)$$
*Weights: $w_1=0.4, w_2=0.4, w_3=0.2$*

#### 1. Trend Vector ($T_s$)
Categorical indicator based on price position relative to core structural averages:
- **Bullish (+1)**: $(Price > EMA_{20}) \wedge (EMA_{20} > EMA_{50}) \wedge (TRIX > 0)$
- **Bearish (-1)**: $(Price < EMA_{20}) \wedge (EMA_{20} < EMA_{50}) \wedge (TRIX < 0)$
- **Neutral (0)**: Any other regime configuration.

#### 2. Activated Momentum Vector ($M_{final}$)
Uses a 60-day rolling Z-score of the MACD Histogram, compressed via a hyperbolic tangent function:
$$M_{final} = \tanh\left(\frac{H - \mu_{60}}{\sigma_{60}}\right) \times \left(\frac{ADX}{100}\right)$$
*This ensures momentum signals are statistically significant relative to recent history and dampened during low-volatility (low ADX) environments.*

#### 3. Oscillator Vector ($O_s$)
Normalized Range Index (RSI) mapped to the $[-1, 1]$ domain:
$$O_s = \frac{RSI - 50}{50}$$

### Adaptive Sentiment Multiplier ($\sigma$)
The volatility buffer adjusts dynamically based on the conviction of the prediction:
$$\sigma = 1.5 - (WPB \times 0.5)$$
*Resulting Sigma Range: $[1.0, 2.0]$. High conviction bullishness ($WPB \approx 1$) tightens triggers to $1.0\sigma$ for faster entry confirmation.*

### Structural Breakout Triggers
Triggers are anchored to local 20-day structural extremes (Donchian Channels) but buffered by the adaptive sigma:

**Bull Trigger ($T_{bull}$):**
$$T_{bull} = \max(\text{DonchianHigh}_{20}, EMA_{20} + (ATR \times \sigma))$$

**Bear Trigger ($T_{bear}$):**
$$T_{bear} = \min(\text{DonchianLow}_{20}, EMA_{20} - (ATR \times \sigma))$$
Accuracy is calculated using a **5-day Lookahead Window** from the point of estimation.

### Directional Bias Validation (1W)
Integrity is measured by whether the market trajectory aligned with the predicted sentiment.
- **Predicted: Bullish**
  - **Success (100%)**: If the price at the end of the week is higher than the starting price.
  - **Failure (0%)**: If the price at the end of the week is lower than or equal to the starting price.
- **Predicted: Bearish**
  - **Success (100%)**: If the price at the end of the week is lower than the starting price.
  - **Failure (0%)**: If the price at the end of the week is higher than or equal to the starting price.
- **Predicted: Neutral**
  - **Success (100%)**: If the total price variance remains within **+/- 1 ATR**, successfully predicting a lack of trend (Chop/Consolidation).
  - **Failure (0%)**: If the price trends significantly (breaks 1 ATR) in either direction.

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
- **Global Integrity Rate**: An aggregate weighted average of Bull accuracy, Bear accuracy, and Directional Bias success.
- **Status Badges**:
  - `Bullish Breach`: Confirmed Trend Extension (Up).
  - `Bearish Breach`: Confirmed Trend Extension (Down).
  - `Bias Confirmed`: Market trajectory aligned with predicted sentiment (Bull/Bear/Neutral).
  - `Range Maintained`: Volatility successfully contained within predicted boundaries.

## 4. Purpose
The goal of this metric is to build user trust by surfacing the AI's "Track Record" directly on the chart. It objectively proves where the Technical Intelligence engine is most reliable and where market noise has previously caused false signals.
