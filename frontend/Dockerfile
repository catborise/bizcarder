FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# Vite'ın dışarıdan erişilebilir olması için --host parametresi eklendi
CMD ["npm", "run", "dev", "--", "--host"]
