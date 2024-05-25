FROM node:20.13.1-alpine3.20

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

CMD ["node", "app.js"]
