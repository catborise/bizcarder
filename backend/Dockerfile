FROM node:18-alpine

# pg_dump and psql needed for backup/restore scripts
RUN apk add --no-cache postgresql15-client

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
