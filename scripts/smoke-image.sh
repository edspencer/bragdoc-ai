#!/usr/bin/env bash
# `scripts/smoke-image.sh <image> <version> <commit> <official: true|false>`: start a built Docker image the way the
# docs say to run it (published on 127.0.0.1:2724, a data folder at /data), wait for its HEALTHCHECK to say healthy,
# then check what it serves: /api/health, the build info in /api/meta, the web app, and that a foreign Host is refused.
# CI runs it on every image it builds (ci.yml and release.yml), before anything could be pushed.
set -euo pipefail
image="$1" version="$2" commit="$3" official="$4"
data="$(mktemp -d)"
# the image runs as uid 1000 (`node`), and so must own its data folder, as compose.yaml arranges on a laptop. 755, not
# mktemp's 700, so this script (another uid) can still look inside afterwards.
chmod 755 "${data}"
if [ "$(id -u)" = 0 ]; then chown 1000:1000 "${data}"; else sudo chown 1000:1000 "${data}"; fi
name="bragdoc-smoke-$$"
cleanup() { docker rm -f "${name}" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "${name}" -p 127.0.0.1:2724:2724 -v "${data}:/data" "${image}" >/dev/null
status=starting
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "${name}")"
  [ "${status}" = healthy ] && break
  if [ "$(docker inspect -f '{{.State.Running}}' "${name}")" != true ]; then
    docker logs "${name}"
    echo "the container exited" >&2
    exit 1
  fi
  sleep 2
done
docker logs "${name}"
[ "${status}" = healthy ] || { echo "the container never became healthy (${status})" >&2; exit 1; }

check() { echo "smoke-image: $1"; }
health="$(curl -fsS http://127.0.0.1:2724/api/health)"
[ "${health}" = "{\"ok\":true,\"version\":\"${version}\"}" ] || { echo "/api/health: ${health}" >&2; exit 1; }
check "/api/health: ${health}"
curl -fsS http://127.0.0.1:2724/api/meta | jq -e --arg v "${version}" --arg sha "${commit}" --argjson official "${official}" \
  '.version == $v and .build.version == $v and .build.commit == $sha and .build.official == $official' >/dev/null \
  || { echo "/api/meta's build info: $(curl -fsS http://127.0.0.1:2724/api/meta | jq -c .build)" >&2; exit 1; }
check "/api/meta: build ${commit:0:12}, official ${official}"
curl -fsS http://127.0.0.1:2724/ | grep -q '<div id="root">' || { echo "/ isn't the web app" >&2; exit 1; }
check "/ is the web app"
code="$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: evil.example' http://127.0.0.1:2724/api/health)"
[ "${code}" = 403 ] || { echo "a foreign Host got ${code}, not 403" >&2; exit 1; }
check "a foreign Host is refused"
# the data home was laid out, as the node user
[ -n "$(ls -A "${data}")" ] || { echo "nothing was written to /data" >&2; exit 1; }
check "the data home was laid out"
docker stop "${name}" >/dev/null
# the wrong uid (a data folder that isn't the container user's) is explained, not blamed on the port
# (bounded: if a regression made /data writable, the server would start and run forever)
bounded=(); command -v timeout >/dev/null && bounded=(timeout 60) # macOS has no timeout(1)
out="$("${bounded[@]}" docker run --rm --user 4321:4321 "${image}" 2>&1 || true)"
case "${out}" in *"can't write to /data"*) check "an unwritable /data is explained" ;; *) echo "an unwritable /data said: ${out}" >&2; exit 1 ;; esac
# OCR (PR11, D48) with no network at all: the image reads a screenshot with only what it ships
fixtures="$(cd "$(dirname "$0")/.." && pwd)/test/fixtures/screenshots"
ocr="$(docker run --rm --network none -v "${fixtures}:/fixtures:ro" "${image}" node dist/server/cli.js dev ocr /fixtures/praise.png --engine tesseract --name 'Alex Marlowe' --json)"
echo "${ocr}" | jq -e '.[0].engine == "tesseract" and .[0].rules.pass == true and (.[0].text | test("@Alex Marlowe ran the dual-write plan"))' >/dev/null \
  || { echo "OCR in the image: ${ocr}" >&2; exit 1; }
check "OCR reads a screenshot with --network none"
check ok
