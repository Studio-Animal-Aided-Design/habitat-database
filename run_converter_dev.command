#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
python3 -m converter_app.dev_runner
