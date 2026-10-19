# BragDoc Local as a Docker image: another way to run it on your laptop, instead of `npx @bragdoc/local` (D14). It's
# not a server mode: BragDoc has no login, so publish it on loopback only (`-p 127.0.0.1:2724:2724`, as compose.yaml
# does). Mount your ~/.bragdoc at /data and Docker and npm share the same data, so you can switch between them.
#
#   docker run -d --name bragdoc -p 127.0.0.1:2724:2724 -v ~/.bragdoc:/data ghcr.io/edspencer/bragdoc
#
# Adapted from Paddock's Dockerfile (multi-stage, tini, HEALTHCHECK). Multi-arch (linux/amd64, linux/arm64) is built
# in CI on native per-arch runners (release.yml); each leg pushes by digest and the manifests are merged with
# `docker buildx imagetools create`.

# ---- build stage ----------------------------------------------------------
# Pinned to $BUILDPLATFORM: this stage only emits arch-independent JS (tsc + vite → dist/), so in an emulated
# cross-build (a local `docker buildx build --platform linux/amd64,linux/arm64`) it runs once, natively, instead of
# repeating npm ci + compile under QEMU per arch.
FROM --platform=$BUILDPLATFORM node:22-slim AS build
WORKDIR /app

# Install deps first (cache layer). No install scripts run: nothing we build with needs one (esbuild ships its
# binary as a per-platform optional dependency).
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

# What the build says about itself (scripts/build-info.mjs → dist/build-info.json). The build context has no .git,
# so the release workflow passes the commit, the run and the official flag in; a local build is unofficial.
ARG GITHUB_SHA=
ARG SOURCE_DATE_EPOCH=
ARG BRAGDOC_BUILD_RUN_URL=
ARG BRAGDOC_OFFICIAL_BUILD=
COPY . .
RUN GITHUB_SHA="$GITHUB_SHA" SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" BRAGDOC_BUILD_RUN_URL="$BRAGDOC_BUILD_RUN_URL" \
    BRAGDOC_OFFICIAL_BUILD="$BRAGDOC_OFFICIAL_BUILD" npm run build

# ---- runtime stage --------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app

# git and gh are what BragDoc runs to read your repositories and (with a mounted ~/.config/gh or GH_TOKEN) find your
# pull requests; ca-certificates for gh's HTTPS; tini, see ENTRYPOINT. gh comes from GitHub's own apt repository.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates curl tini \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y --no-install-recommends gh \
    && apt-get purge -y curl && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    && git config --system --add safe.directory '*'
# safe.directory: your repositories are mounted read-only and owned by your uid on the host, which inside the
# container often isn't the uid BragDoc runs as (Docker Desktop's file sharing, or compose.yaml's BRAGDOC_UID), and
# git refuses to read a repo it considers someone else's ("detected dubious ownership"). The mounts are your own repos,
# read-only, so trusting them is the point.

# Production dependencies only: React, Vite, tsc and the rest are build-time (the same as an npm install).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force

# The image redistributes BragDoc, so it carries the licence text.
COPY LICENSE README.md ./
COPY --from=build /app/dist dist
# the example data ("Fill it with example data", PR16): read by the server, never written
COPY fixtures/example fixtures/example

# The data home is /data (mount ~/.bragdoc there). BragDoc runs as the image's `node` user (uid 1000), not root, so
# what it writes into your ~/.bragdoc is yours; compose.yaml's `user:` maps another uid. The directory is made here so
# an unmounted /data is still writable. HOME is fixed, so it's /home/node (where a mounted gh login goes) whatever the
# uid; an unknown uid would otherwise get `/`.
#
# The bind: BragDoc refuses anything but loopback unless BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1 (D10). Inside a container,
# loopback is unreachable from the host, so the image binds 0.0.0.0, and **publishing the port on the host's
# 127.0.0.1 is the only thing keeping other machines out**: `-p 2724:2724` (no address) opens it to your network. The
# Host check (loopback names only) stops DNS rebinding, not a machine on your network that sends `Host: localhost`.
# The bind is CMD's `--host`, not a HOST variable: `serve` doesn't read HOST, so a shell that exports it (many do)
# can't open a normal install up by accident (D38).
ENV NODE_ENV=production \
    HOME=/home/node \
    BRAGDOC_HOME=/data \
    BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1 \
    BRAGDOC_IN_DOCKER=1 \
    PORT=2724
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 2724

# Node's fetch rather than curl (removed above). 127.0.0.1 is a loopback Host, so the Host check lets it through.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --start-interval=2s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||2724)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

# tini as pid 1, so orphaned processes (git and gh, which BragDoc runs) get reaped, and so `docker stop`'s SIGTERM
# reaches node: a Node process that is pid 1 gets no default signal handlers. tini forwards the signal to its child
# and exits with the child's exit code. Baked in rather than `docker run --init`, which compose and Kubernetes
# users would have to remember; `--init` stays harmless (tini notices it isn't pid 1 and defers). From Paddock.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server/cli.js", "serve", "--host", "0.0.0.0"]
