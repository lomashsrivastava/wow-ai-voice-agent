# BACKEND API REFERENCE — WOW Voice AI Agent

This document lists all available REST API endpoints exposed by the Fastify backend server.

## Health & Monitoring

### 1. Health Status
* **Endpoint**: `GET /api/health`
* **Response**:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-08-14T06:37:44.662Z",
  "services": {
    "database": "disconnected",
    "ai": {
      "currentProvider": null,
      "stats": {
        "totalRequests": 0,
        "totalSuccesses": 0,
        "totalFailovers": 0
      }
    },
    "voice": {
      "provider": "vapi",
      "demoMode": true
    }
  }
}
```

### 2. AI Provider Status
* **Endpoint**: `GET /api/ai/providers/status`
* **Response**: Detailed availability metrics (request counts, failures, cooldowns) for all providers.

---

## Conversational Endpoints

### 3. Create Conversation Session
* **Endpoint**: `POST /api/conversations`
* **Payload**:
```json
{
  "leadId": "optional-uuid"
}
```
* **Response**: Returns a new `conversationId`, initial call stage, and initialization state.

### 4. Process Conversation Turn
* **Endpoint**: `POST /api/conversations/:id/message`
* **Payload**:
```json
{
  "message": "Hi, this is Amit. Tell me about the project location."
}
```
* **Response**:
```json
{
  "conversationId": "bee76599-c73a-4e3a-a336-f47cf56e2c19",
  "response": "Hello Amit, this is Priya calling from Divyasree Developers...",
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "latencyMs": 3520
}
```

---

## Lead Management

### 5. Get Leads
* **Endpoint**: `GET /api/leads`
* **Response**: Returns a list of all qualified leads stored in the database.

### 6. Create/Update Lead
* **Endpoint**: `POST /api/leads`
* **Payload**: Validated against the lead Zod schema. Returns the saved lead with classification score.
