#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Dataset Lab  ─  macOS / Linux Quick-Start
#  Run: bash start.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if install has been run
if [ ! -f "dataset-lab/.venv/bin/python" ]; then
    echo ""
    echo "  [!] Setup not complete. Running installer first..."
    echo ""
    python3 install.py
fi

echo ""
echo "  ▶  Starting Dataset Lab..."
echo ""
python3 datasetlab.py start

echo ""
echo "  Press Enter to stop the servers and exit..."
read -r

python3 datasetlab.py stop
