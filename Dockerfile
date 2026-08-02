# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_VIETMAP_TILE_KEY=
ARG VITE_VIETMAP_API_KEY=
ARG VITE_VIETMAP_SERVICE_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_VIETMAP_TILE_KEY=$VITE_VIETMAP_TILE_KEY
ENV VITE_VIETMAP_API_KEY=$VITE_VIETMAP_API_KEY
ENV VITE_VIETMAP_SERVICE_KEY=$VITE_VIETMAP_SERVICE_KEY
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

