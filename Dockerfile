# Use the official Microsoft Playwright image as the base
# This image already contains all OS-level dependencies for running headless browsers
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

# Set the working directory
WORKDIR /app

# Copy package files and install standard dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the Vite React frontend
RUN npm run build

# Expose the port the Express server will run on
EXPOSE 3001

# Start the Express server
CMD ["npm", "start"]
