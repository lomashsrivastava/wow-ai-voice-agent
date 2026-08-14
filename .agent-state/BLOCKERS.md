# BLOCKERS — WOW Voice AI Agent

## Active Blockers
* **None**: The system has no blocking bugs or unresolved environment concerns.

## Resolved Blockers
* **Gemini 400 Bad Request**: Resolved by updating the `systemInstruction` format in `gemini-provider.ts` to be a structured Content object rather than a raw string.
* **Gemini 2.0 Flash Deprecation**: Resolved by migrating model configuration from deprecated `gemini-2.0-flash` to active `gemini-2.5-flash`.
