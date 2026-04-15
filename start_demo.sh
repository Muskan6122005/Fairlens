#!/bin/bash
# ─────────────────────────────────────────────────────────────
# FairLens — Demo Day Startup Script
# Run this ONCE before judges arrive:  bash start_demo.sh
# ─────────────────────────────────────────────────────────────

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║   🔍  FairLens AI Bias Detector       ║"
echo "  ║       Demo Day Startup Script         ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""

# Add Python 3.9 scripts to PATH
export PATH="$PATH:/Users/muskanyeshminali/Library/Python/3.9/bin"

# Kill any existing Flask on port 5000
echo "  [1/4] Stopping any existing backend..."
lsof -ti:5000 | xargs kill -9 2>/dev/null && echo "       Stopped old process." || echo "       No old process found."

# Start Flask backend in background
echo "  [2/4] Starting Flask backend on port 5000..."
cd "$(dirname "$0")/backend"
python3 app.py &
FLASK_PID=$!
sleep 2

# Test backend health
echo "  [3/4] Testing backend health..."
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
  echo "       ✅ Backend is running! (PID: $FLASK_PID)"
else
  echo "       ⚠️  Backend starting... give it 2-3 more seconds"
fi

# Open browser with the landing page
echo "  [4/4] Opening FairLens in browser..."
sleep 1
open "$(dirname "$0")/frontend/scan.html"

echo ""
echo "  ┌─────────────────────────────────────┐"
echo "  │  ✅ FairLens is LIVE                 │"
echo "  │                                     │"
echo "  │  Frontend: frontend/scan.html       │"
echo "  │  Backend:  http://localhost:5000    │"
echo "  │                                     │"
echo "  │  Demo CSVs on Desktop:              │"  
echo "  │  • adult_demo.csv  (Hiring bias)    │"
echo "  │  • ibm_hr_demo.csv (HR bias)        │"
echo "  │                                     │"
echo "  │  Press Ctrl+C to stop backend       │"
echo "  └─────────────────────────────────────┘"
echo ""

# Keep script alive so backend stays running
wait $FLASK_PID
