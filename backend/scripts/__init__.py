# Future You — data refresh/validate scripts (DEV/SEED ONLY, off the request path).
#
# These build the committed JSON snapshots from the curated seed + market data
# (yfinance) and the licensed JPM CMA matrix. The deployed app never imports this
# package; it only reads the snapshots the scripts produce. Run from backend/ with
# `python -m scripts.<name>` (pyproject sets pythonpath = ".").
