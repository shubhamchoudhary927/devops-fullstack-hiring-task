# Stage 1: Dependency builder
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

# Stage 2: Lean production runtime
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .

# Use non-root node user for security
USER node
EXPOSE 3000
CMD ["npm", "start"]