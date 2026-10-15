FROM node:24.20.0-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm test

ENV NODE_ENV=production
EXPOSE 4173

CMD ["npm", "start"]
