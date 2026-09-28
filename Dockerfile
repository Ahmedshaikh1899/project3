FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY /public ./
RUN npm install
RUN npm ci --omit=dev
COPY server.js ./
EXPOSE 3000
CMD ["node" ,"server.js"]
