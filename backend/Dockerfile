FROM node:22-alpine

# pg_dump and psql needed for backup/restore scripts
RUN apk add --no-cache postgresql16-client

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
