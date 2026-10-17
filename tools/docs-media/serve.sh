#!/usr/bin/env bash
# Run BragDoc on a throwaway data home, isolated from the machine it runs on.
#
#   tools/docs-media/serve.sh <home dir> [--port <n>]      default port: $PORT or 2724
#
# The ONE place that says how the capture rig launches BragDoc: capture.ts runs this script. It runs the compiled CLI
# from this checkout (build it first: capture.ts does, with BRAGDOC_KIT=1 so /dev/kit exists), the same thing an
# installed `bragdoc` runs. To shoot an installed package instead, change LAUNCH below. Adapted from Local Review.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOME_DIR=""
PORT_ARG="${PORT:-2724}"
while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT_ARG="$2"; shift 2 ;;
    *) HOME_DIR="$1"; shift ;;
  esac
done
[ -n "$HOME_DIR" ] && [ -d "$HOME_DIR" ] || { echo "usage: serve.sh <home dir> [--port <n>]" >&2; exit 2; }
HOME_DIR="$(cd "$HOME_DIR" && pwd)"
[ -f "$ROOT/dist/server/cli.js" ] || { echo "not built: run npm run build" >&2; exit 1; }

# A scrubbed environment: no inherited credentials or BRAGDOC_* settings, and a throwaway HOME, so nothing can touch
# the real ~/.bragdoc, gh login or service manager.
LAUNCH=(node "$ROOT/dist/server/cli.js" serve --port "$PORT_ARG" --quiet)
exec /usr/bin/env -i \
  PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$(dirname "$(command -v node)")" \
  HOME="$HOME_DIR" \
  XDG_CONFIG_HOME="$HOME_DIR/.config" \
  BRAGDOC_HOME="$HOME_DIR/.bragdoc" \
  TZ=UTC \
  LANG=C.UTF-8 \
  "${LAUNCH[@]}"
