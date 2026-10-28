# ---- build the React app ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- serve it with nginx (also proxies /api to the backend) ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# GS Net Academy logo from the official website. If the download fails the site
# falls back to loading it directly from gsnetacademy.com in the browser.
RUN wget -q -T 20 -O /usr/share/nginx/html/gs-net-academy.png https://gsnetacademy.com/assets/gs-net-academy.png \
    || rm -f /usr/share/nginx/html/gs-net-academy.png
EXPOSE 80
