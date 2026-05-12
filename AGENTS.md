# Prompt Optimiser Agent Guide

## Project overview

Prompt Optimiser is a single-page personal web app for improving rough prompts with the OpenAI API. It helps users turn vague requests into clear, actionable prompts while avoiding unnecessary prompt-engineering ceremony.

## Tools, languages, and frameworks

- Language: JavaScript
- Frontend: React with Vite
- Backend: Express
- Icons: `lucide-react`
- Runtime: Node.js 22
- Containerisation: Docker and Docker Compose
- Environment: `.env` with `OPENAI_API_KEY`, `OPENAI_MODEL`, and optional `PORT`

## Build and test commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm start
docker compose up --build
```

## Code style guidelines

- Use British English for user-facing text, comments, documentation, UI labels, and example content.
- Keep the app simple, practical, and maintainable.
- Prefer clear component structure over clever abstractions.
- Keep API code server-side only. Never expose `OPENAI_API_KEY` to the browser.
- Preserve the elegant productivity UI direction: restrained colours, readable typography, focused editor layout, and no marketing landing page.

## Prompting rules

The app should optimise prompts by:

- Preserving the user's intent.
- Increasing specificity and clarity.
- Removing ambiguity.
- Using natural, concise language.
- Making the prompt actionable.
- Avoiding over-engineering simple prompts.
- Including Role only when it helps style, perspective, or audience framing.
- Including Goal / Task, Context, Format, and Constraints & Tone only when they improve the result.

## Security considerations

- Never commit `.env`, API keys, tokens, credentials, or private configuration.
- Keep `.env.example` safe and placeholder-only.
- Validate user input before sending it to the API.
- Do not log prompt content unnecessarily in production.
- Keep the OpenAI API key on the server.

## Deployment notes

- Use Docker Compose for local container testing.
- For VPS deployment, pass environment variables through a secure `.env` file or the host's secret management approach.
- Expose port `3000` by default.
- Put a reverse proxy such as Caddy or Nginx in front of the app if deploying publicly.
