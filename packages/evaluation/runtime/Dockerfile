FROM node:22.22.3-bookworm-slim@sha256:e21fc383b50d5347dc7a9f1cae45b8f4e2f0d39f7ade28e4eef7d2934522b752
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /runtime
COPY package.json package-lock.json ./
RUN git config --global url.https://github.com/.insteadOf ssh://git@github.com/ && npm ci --no-audit --no-fund && npm cache clean --force
COPY requirements.txt ./
RUN python3 -m venv /runtime/venv && /runtime/venv/bin/pip install --no-cache-dir -r requirements.txt
COPY runtime/ ./
COPY api.ts api.py ./
# Models can read only the explicit gateway file allowlist. The executable image
# additionally contains no generated Markdown, maps, tests, or golden solutions.
RUN find /runtime/node_modules -type f \( -name '*.md' -o -name '*.map' \) -delete && rm -rf /runtime/node_modules/paypal/src /runtime/node_modules/paypal/map && chmod -R a-w /runtime
USER 1000:1000
ENTRYPOINT ["timeout","--signal=KILL","180s","node","/runtime/supervisor.mjs"]
