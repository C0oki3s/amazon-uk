FROM node:20.13.1-alpine3.20

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Use CMD to specify the command to run your app
CMD ["node", "app.js"]
