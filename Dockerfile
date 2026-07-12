FROM node:20-slim
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
ENV DATA_DIR=/tmp/data
EXPOSE 3000
CMD ["node", "server.js"]
