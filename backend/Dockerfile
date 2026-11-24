FROM node:22-alpine

# pg_dump/psql and bash needed for backup/restore scripts and Makefile commands
RUN apk add --no-cache postgresql18-client bash

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 5000
CMD ["npm", "start"]
