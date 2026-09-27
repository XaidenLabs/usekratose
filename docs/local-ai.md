# Local AI for development

UseKratose keeps event detection, severity, and evidence deterministic. AI only
adds a non-authoritative explanation after an event has already been stored.

## Default development provider

Local development uses Ollama so test explanations do not incur API charges:

```dotenv
AI_EXPLANATION_PROVIDER=ollama
AI_EXPLANATION_MODEL=qwen3:4b-instruct
OLLAMA_BASE_URL=http://127.0.0.1:11434
OPENAI_API_KEY=
```

Install Ollama, start its local service, and pull the configured model:

```bash
brew install ollama
brew services start ollama
ollama pull qwen3:4b-instruct
```

The monitor calls Ollama's local `/api/chat` endpoint with a JSON schema,
streaming disabled, and temperature set to zero. Returned data is still parsed
through the same strict schema used by the hosted provider.

## Deployment boundary

Vercel cannot reach an Ollama server running on a developer laptop. Set
`AI_EXPLANATION_PROVIDER=disabled` on Vercel until a reachable provider is
configured. The monitoring and security-event pipeline continues to work when
AI explanations are disabled.

To opt into OpenAI later, set `AI_EXPLANATION_PROVIDER=openai`, provide
`OPENAI_API_KEY`, and choose an OpenAI model in `AI_EXPLANATION_MODEL`.
