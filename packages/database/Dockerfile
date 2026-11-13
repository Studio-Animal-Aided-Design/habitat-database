# syntax=docker/dockerfile:1.7

FROM node:24.13.0-bookworm-slim
WORKDIR /workspace

COPY packages/database/package.json packages/database/package-lock.json ./packages/database/
RUN --mount=type=cache,target=/root/.npm npm ci --prefix packages/database --no-audit --no-fund

COPY packages/database/ ./packages/database/
COPY data/ ./data/

WORKDIR /workspace/packages/database
ENTRYPOINT ["npm", "run"]
CMD ["db:migrate"]
