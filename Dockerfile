# Use official Node.js 22 LTS image as base
FROM node:22

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json from workspace root
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code into /app/src
COPY src ./src

# Create a config folder (will later be mounted as a volume)
RUN mkdir -p ./config

# Create a data folder for local image storage
RUN mkdir -p ./data

RUN mkddir ./templates

RUN mkdir templates/config

# Copy config folder to templates/config
COPY config ./templates/config

# Expose app port (adjust if different)
EXPOSE 3000

# Default command
CMD ["npm", "start"]

# Declare config as a volume so it can be mounted at runtime
VOLUME ["/app/config"]

# Declare data as a volume for local image storage
VOLUME ["/app/data"]