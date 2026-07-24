ARG APP_MODE=gestor

FROM node:22-alpine AS builder
ARG APP_MODE
WORKDIR /app
COPY package*.json tsconfig.json vite.config.ts tailwind.config.js postcss.config.js ./
RUN npm ci
COPY index.html index-gestor.html index-horas.html index-producao.html ./
COPY src/ ./src/
RUN npm run build:${APP_MODE}

FROM nginx:alpine AS runner
ARG APP_MODE
COPY --from=builder /app/dist/${APP_MODE} /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
