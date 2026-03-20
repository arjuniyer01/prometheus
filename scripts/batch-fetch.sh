#!/bin/bash
# Fetch data for multiple tickers in parallel
# Usage: bash scripts/batch-fetch.sh AAPL MSFT GOOG ...

for TICK in "$@"; do
    echo "[BATCH] Fetching $TICK..." >&2
    npx tsx scripts/fetch-stock-data.ts "$TICK" US 1>/tmp/prometheus-${TICK}.json 2>/dev/null &
done

wait
echo "[BATCH] All fetches complete" >&2

# Verify outputs
for TICK in "$@"; do
    if python3 -c "import json; json.load(open('/tmp/prometheus-${TICK}.json'))" 2>/dev/null; then
        echo "OK:${TICK}"
    else
        echo "FAIL:${TICK}"
    fi
done
