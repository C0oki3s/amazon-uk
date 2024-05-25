FROM node:20.13.1-alpine3.20

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Install cron
RUN apk update && apk add --no-cache cron

# Copy the cron job file into the app directory
COPY cron-job /usr/src/app/cron-job

# Give execution rights on the cron job
RUN chmod 0644 /usr/src/app/cron-job

# Apply cron job
RUN crontab /usr/src/app/cron-job

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

# Run the command on container startup
CMD cron && tail -f /var/log/cron.log
