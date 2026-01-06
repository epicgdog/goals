# Frontend Dockerfile (Expo)
FROM node:20-alpine

WORKDIR /app

# Install Expo CLI globally
RUN npm install -g expo-cli @expo/ngrok

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Expo ports
EXPOSE 8081
EXPOSE 19000
EXPOSE 19001
EXPOSE 19002

# Start Expo
CMD ["npx", "expo", "start", "--tunnel"]
