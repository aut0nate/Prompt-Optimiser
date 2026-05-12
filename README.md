# Prompt Optimiser

## Introduction

Prompt Optimiser is a single-page web app for enhancing prompts using the OpenAI API.

It is built for quick local use: paste an unfinished prompt, choose the purpose, tone, and detail level, optionally answer follow-up questions, and receive a clearer prompt with concise notes about what changed.

## Features

- Improve rough prompts into clearer, more actionable instructions.
- Generate follow-up questions before optimising when more context would help.
- Choose purpose, tone, and detail level for each prompt.
- Show which prompt elements were included in the final result.
- Run locally or in Docker with the OpenAI API key kept server-side.

## Stack

- Runtime: Node.js 22
- Frontend: React with Vite
- Backend: Express
- AI API: OpenAI Responses API
- UI icons: `lucide-react`
- Validation: ESLint and Vite production build
- Packaging: Docker and Docker Compose

## Requirements

Before running this project, install:

- Node.js 22
- npm
- Docker and Docker Compose, for container testing or server deployment
- An OpenAI API key

## Configuration (.env)

1. Create a local `.env` file from the example file:

    ```bash
    cp .env.example .env
    ```

2. Update `.env` with values for your local setup:

    ```bash
    OPENAI_API_KEY=replace-with-your-openai-api-key
    OPENAI_MODEL=gpt-4.1-mini
    HOST=127.0.0.1
    PORT=3000
    ```

Environment notes:

- `OPENAI_API_KEY` is used by the Express server to call the OpenAI API.
- `OPENAI_MODEL` controls which OpenAI model is used for prompt improvement.
- `HOST` controls the interface the Express server binds to.
- `PORT` controls the Express server port. The Vite dev server proxies `/api` to `http://127.0.0.1:3000`.
- `IMAGE_TAG` controls which GHCR image tag the production Compose file runs.
- `DOCKER_NETWORK` is the existing external Docker network shared with Caddy in production.

## Test Locally

1. Install dependencies:

    ```bash
    npm install
    ```

2. Create and update `.env` using the configuration steps above.

3. Start the app:

    ```bash
    npm run dev
    ```

4. Open the Vite local URL shown in the terminal.

5. Before handing off changes, run:

    ```bash
    npm run lint
    npm run build
    npm audit --omit=dev
    ```

## Test Locally Using Docker

Docker is useful for checking the production container before server deployment. The local Compose file builds the image, reads `.env`, and publishes container port `3000` on host port `3002`.

1. Start the local Docker stack:

    ```bash
    docker compose up --build
    ```

    The app will be available at `http://127.0.0.1:3002`.

2. Stop the stack:

    ```bash
    docker compose down
    ```

>[!Note]
The local Compose file is `docker-compose.yml`. The production source Compose file is `docker-compose.prod.yaml`; CI/CD uploads it to the VPS as `docker-compose.yaml`.

## Server Deployment

Server deployment depends on where you host the project. Use the structure that fits your own environment and preferred deployment method. For public-facing access, put the service behind HTTPS using a reverse proxy such as Nginx Proxy Manager, Caddy, Traefik, or another preferred option.

This repository is configured for GitHub Container Registry and a Docker Compose deployment on your VPS:

- Image: `ghcr.io/aut0nate/prompt-optimiser`
- Deployment path: `/opt/stacks/prompt-optimiser`
- Public URL: `https://prompt-optimiser.ts.autonate.net`
- Production Compose source file: `docker-compose.prod.yaml`
- Server Compose file: `/opt/stacks/prompt-optimiser/docker-compose.yaml`

For most Docker-based deployments:

1. Create a directory in your chosen location on your server, for example `/opt/stacks/prompt-optimiser`.
2. Change into this directory.
3. Ensure the production Compose file is saved in this directory as `docker-compose.yaml`. The CD workflow uploads `docker-compose.prod.yaml` from this repository with that server filename.
4. Create a `.env` file:

    ```bash
    OPENAI_API_KEY=replace-with-your-openai-api-key
    OPENAI_MODEL=gpt-4.1-mini
    HOST=0.0.0.0
    PORT=3000
    IMAGE_TAG=latest
    DOCKER_NETWORK=caddy
    ```

5. Ensure the app uses the same external Docker network as Caddy:

    ```bash
    docker network create caddy
    ```

    If your Caddy stack already uses a different external network name, do not create a new one. Set `DOCKER_NETWORK` to the existing network name instead.

6. Start the app:

    ```bash
    docker compose up -d
    ```

7. Add this Caddy entry outside the existing `*.ts.autonate.dev` block, because the target host uses `.net`:

    ```caddyfile
    prompt-optimiser.ts.autonate.net {
      tls {
        dns cloudflare {env.CF_API_TOKEN}
        resolvers 1.1.1.1 8.8.8.8
        propagation_delay 1m
      }

      reverse_proxy prompt-optimiser:3000
    }
    ```

8. Reload Caddy after updating the Caddyfile.
9. Verify `https://prompt-optimiser.ts.autonate.net` after deployment.

After deployment, verify:

- The homepage loads.
- Prompt optimisation works with a small test prompt.
- The OpenAI API key is present only in the server environment.

## GitHub Actions

- `CI - Validate and build` runs on pull requests and pushes to `main`.
- CI installs dependencies, runs linting, builds the app, audits production dependencies, builds a Docker image, and smoke tests the container locally.
- `CD - Build and deploy` runs only after CI succeeds on `main`.
- CD builds and pushes `latest` and commit SHA image tags to GitHub Container Registry.
- CD uploads `docker-compose.prod.yaml` to `/opt/stacks/prompt-optimiser/docker-compose.yaml`, updates `IMAGE_TAG`, then runs `docker compose pull` and `docker compose up -d`.
- Required GitHub Actions secrets are `VPS_HOST`, `VPS_PORT`, `VPS_USER`, and `VPS_SSH_KEY`.
- The GHCR package should be public, or the VPS must be logged in to GHCR before `docker compose pull`.
- Production runtime values should live in the VPS `.env`, not in the workflow files.

## Security Notes

- Do not commit `.env`.
- Keep `OPENAI_API_KEY` on the server only.
- Store production secrets in the deployment environment, not in the repository.
- Rotate the OpenAI API key immediately if it is exposed.
- Add reverse-proxy authentication, firewall rules, a VPN, or another access control before exposing the app publicly.
- Avoid logging private prompt content in production.

## AI-Assisted Development

Prompt Optimiser was built with OpenAI Codex using GPT-5.5. This repository includes an [`AGENTS.md`](./AGENTS.md) file, which provides structured instructions and context for AI coding agents. It defines expectations, constraints, and project-specific guidance to help keep contributions consistent and reliable.

## Contributions

Contributions, ideas, and suggestions are welcome.

If you have improvements, feature ideas, or bug fixes, feel free to open an issue or submit a pull request. All contributions are appreciated and help improve the project.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
