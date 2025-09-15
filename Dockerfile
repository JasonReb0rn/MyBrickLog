# frontend Dockerfile
# Stage 1: Build the React app
FROM node:18-alpine as build
WORKDIR /app
RUN apk add --no-cache git

# Accept build arguments
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package.json ./
COPY package-lock.json ./
RUN npm ci --quiet --no-optional
COPY . ./
RUN npm run build

# Stage 2: Serve the React app with Nginx and use it as a reverse proxy
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]