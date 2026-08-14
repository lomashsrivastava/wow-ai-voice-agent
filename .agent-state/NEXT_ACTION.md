# NEXT ACTION — WOW Voice AI Agent

1. **Production Deployment Setup**:
   - Set up MongoDB Atlas instance for staging/production database.
   - Deploy Fastify API on Render.
   - Deploy Vite React build on Netlify or Vercel.

2. **Vapi Outbound Telephony Integration**:
   - Purchase phone number on Vapi.
   - Attach webhook URL pointing to the deployed Fastify `GET /api/conversations` and message handlers.
   - Configure Priya's ElevenLabs voice ID in Vapi settings.
