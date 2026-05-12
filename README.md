# Prompt Optimiser

A single-page personal prompt optimiser powered by the OpenAI API. Paste a rough prompt, choose a purpose, tone, and detail level, then receive a clearer prompt with concise notes about what changed.

## Local setup

1. Create `.env` from `.env.example`.
2. Set `OPENAI_API_KEY` and `OPENAI_MODEL`.
3. Install dependencies:

```bash
npm install
```

4. Run the app locally:

```bash
npm run dev
```

The Vite frontend runs with a local Express API. In production, Express serves the built frontend and `/api/optimise`.

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

Open `http://localhost:3000`.

## Prompting approach

The optimiser favours clear task design over vague persona prompting. It decides whether to include Role, Goal / Task, Context, Format, and Constraints & Tone based on task complexity, ambiguity, and required precision.

## Security

Secrets must stay in `.env` or another ignored environment file. Do not commit API keys, tokens, credentials, or private configuration.
