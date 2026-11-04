FROM node:24-alpine AS build
WORKDIR /source
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
ENV API_UPSTREAM=http://api:8080
ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /source/dist/ /usr/share/nginx/html/
EXPOSE 80
