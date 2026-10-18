#!/usr/bin/env bash
# Run BragDoc on a throwaway data home, isolated from the machine it runs on.
#
#   tools/docs-media/serve.sh <home dir> [--port <n>] [--fake-gh <prs.json> <now>]      default port: $PORT or 2724
#
# --fake-gh puts the repo's fake GitHub CLI (test/fixtures/fake-gh) first on PATH, answering from <prs.json> with its
# "days ago" counted from <now>, so the GitHub source can be connected without a real login or the network.
#
# The ONE place that says how the capture rig launches BragDoc: capture.ts runs this script. It runs the compiled CLI
# from this checkout (build it first: capture.ts does, with BRAGDOC_KIT=1 so /dev/kit exists), the same thing an
# installed `bragdoc` runs. To shoot an installed package instead, change LAUNCH below. Adapted from Local Review.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOME_DIR=""
PORT_ARG="${PORT:-2724}"
FAKE_GH_PRS=""
FAKE_GH_NOW=""
while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT_ARG="$2"; shift 2 ;;
    --fake-gh) FAKE_GH_PRS="$2"; FAKE_GH_NOW="$3"; shift 3 ;;
    *) HOME_DIR="$1"; shift ;;
  esac
done
[ -n "$HOME_DIR" ] && [ -d "$HOME_DIR" ] || { echo "usage: serve.sh <home dir> [--port <n>]" >&2; exit 2; }
HOME_DIR="$(cd "$HOME_DIR" && pwd)"
[ -f "$ROOT/dist/server/cli.js" ] || { echo "not built: run npm run build" >&2; exit 1; }

BIN_PATH=""
if [ -n "$FAKE_GH_PRS" ]; then
  mkdir -p "$HOME_DIR/.fake-gh-bin"
  ln -sf "$ROOT/test/fixtures/fake-gh/gh" "$HOME_DIR/.fake-gh-bin/gh"
  BIN_PATH="$HOME_DIR/.fake-gh-bin:"
fi

# A scrubbed environment: no inherited credentials or BRAGDOC_* settings, and a throwaway HOME, so nothing can touch
# the real ~/.bragdoc, gh login or service manager.
LAUNCH=(node "$ROOT/dist/server/cli.js" serve --port "$PORT_ARG" --quiet)
exec /usr/bin/env -i \
  PATH="$BIN_PATH/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$(dirname "$(command -v node)")" \
  HOME="$HOME_DIR" \
  XDG_CONFIG_HOME="$HOME_DIR/.config" \
  BRAGDOC_HOME="$HOME_DIR/.bragdoc" \
  TZ=UTC \
  LANG=C.UTF-8 \
  FAKE_GH_PRS="$FAKE_GH_PRS" \
  FAKE_GH_NOW="$FAKE_GH_NOW" \
  "${LAUNCH[@]}"
