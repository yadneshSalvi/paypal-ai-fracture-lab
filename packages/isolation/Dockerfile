FROM node:22.22.3-bookworm-slim@sha256:e21fc383b50d5347dc7a9f1cae45b8f4e2f0d39f7ade28e4eef7d2934522b752
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /runtime
COPY package.json package-lock.json ./
COPY vendor/ ./vendor/
RUN git config --global url.https://github.com/.insteadOf ssh://git@github.com/ && npm ci --no-audit --no-fund && npm cache clean --force
COPY snapshot/ /snapshot/
RUN ln -s /runtime/node_modules /snapshot/node_modules && chmod -R a-w /snapshot
WORKDIR /snapshot
USER 1000:1000
ENTRYPOINT ["timeout","--signal=KILL","55s","node","--import","tsx","packages/isolation/runner/main.ts"]
