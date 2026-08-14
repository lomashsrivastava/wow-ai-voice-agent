# DEPLOYMENT GUIDE — WOW Voice AI Agent

This document explains how to deploy the front-end dashboard and back-end orchestration server.

## 1. Local Development Setup
Run both apps locally:

```bash
# Clone and enter workspace
cd wow-ai-voice-agent

# Install root scripts
npm install

# Start both back-end and front-end dev servers concurrently
npm run dev
```

## 2. Docker Deployment
Create a root `docker-compose.yml` to launch MongoDB, Fastify backend, and Vite frontend.

### `docker-compose.yml` (located in project root):
```yaml
version: '3.8'

services:
  database:
    image: mongo:latest
    container_name: wow-mongodb
    ports:
      - "27017:27017"
    volumes:
      - db-data:/data/db

  backend:
    build: ./backend
    container_name: wow-backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://database:27017/wowai
      - GEMINI_API_KEY=your-key
    depends_on:
      - database

  frontend:
    build: ./frontend
    container_name: wow-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://localhost:5000

volumes:
  db-data:
```

## 3. Production Deployment (Cloud)

### Backend (Render)
1. Link your GitHub repository.
2. Select **Web Service** and choose the `backend/` root directory.
3. Use Build Command: `npm install && npm run build` (or similar).
4. Start Command: `node dist/server.js`.
5. Supply environment variables (API keys, MongoDB URI).

### Frontend (Netlify / Vercel)
1. Link your repository.
2. Select the `frontend/` directory.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Configure `VITE_API_URL` pointing to your live Render Web Service URL.
