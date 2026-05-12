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
- OpenAI Responses API
- UI icons: `lucide-react`
- Validation: ESLint and Vite production build
- Docker and Docker Compose
- GitHub Container Registry
- GitHub Actions

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
    OPENAI_MODEL=gpt-5.4-mini
    HOST=127.0.0.1
    PORT=3000
    IMAGE_TAG=latest
    ```

Environment notes:

- `OPENAI_API_KEY` is used by the Express server to call the OpenAI API.
- `OPENAI_MODEL` controls which OpenAI model is used for prompt improvement.
- `HOST` controls the interface the Express server binds to. Use `127.0.0.1` for direct local development and `0.0.0.0` for Docker.
- `PORT` controls the Express server port.
- `IMAGE_TAG` controls which GHCR image tag the production Compose file runs.
- The Vite dev server proxies `/api` to `http://127.0.0.1:3000` when running with `npm run dev`.

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

4. Open `http://127.0.0.1:3000`.

5. Before handing off changes, run:

    ```bash
    npm run lint
    npm run build
    npm audit --omit=dev
    ```

## Test Locally Using Docker

Docker is useful for checking the production container before server deployment. The local Compose file builds the image from this repository, reads `.env`, and publishes the app on `http://127.0.0.1:3001`.

1. Start the local Docker stack:

    ```bash
    docker compose up --build
    ```

    The app will be available at `http://127.0.0.1:3001`.

2. Stop the stack:

    ```bash
    docker compose down
    ```

>[!Note]
The local Compose file is `docker-compose.yml`. The production source Compose file is `docker-compose.prod.yaml`.

## Server Deployment

You can run this on your own server by pulling the latest Docker image from `ghcr.io/aut0nate/prompt-optimiser:${IMAGE_TAG:-latest}`.

Use the structure that fits your own environment and preferred deployment methods. I would recommend hosting this locally or on a private network via Tailscale or an alternative service, to prevent your Open API credits being abused. In my environment, I am using using Caddy and Tailscale with a docker network named `mgmt-net`.

For most Docker-based deployments:

1. Create a directory in your chosen location on your server, for example `/opt/stacks/prompt-optimiser`.
2. Change into this directory.
3. Ensure the production Compose file is saved in this directory. In this repository the production source file is `docker-compose.prod.yaml`, but the associated GitHub Actions CI/CD workflow should save it as `docker-compose.yaml`.

4. Create a `.env` file:

    ```bash
    OPENAI_API_KEY=replace-with-your-openai-api-key
    OPENAI_MODEL=gpt-5.4-mini
    HOST=0.0.0.0
    PORT=3000
    IMAGE_TAG=latest
    ```

5. Create the external Docker network or create your own and update the production Compose file accordingly.

    ```bash
    docker network create mgmt-net
    ```

6. Start the container using the Compose file name on your server:

    ```bash
    docker compose -f docker-compose.yaml up -d
    ```

7. Verify the url after deployment.

Example production files:

- `docker-compose.prod.yaml`
- `docker-compose.yaml`
- `.env`

After deployment, verify:

- The homepage loads.
- Prompt optimisation works with a small test prompt.
- The OpenAI API key is showing as active in the top right of the page.

## GitHub Actions

- `CI - Validate and build` should run on pull requests and pushes to `main`.
- CI should install dependencies, run linting, build the Vite application, build a Docker image, and smoke test the container locally.
- `CD - Build and deploy` should run only after CI succeeds on `main`.
- CD should build and push `ghcr.io/aut0nate/prompt-optimiser:latest` and `ghcr.io/aut0nate/prompt-optimiser:<commit-sha>`.
- CD should upload `docker-compose.prod.yaml` to the server as `docker-compose.yaml`, update `IMAGE_TAG` in the server `.env`, then run `docker compose pull` and `docker compose up -d`.
- Deployment SSH details should be stored in GitHub Actions secrets: `VPS_HOST`, `VPS_PORT`, `VPS_USER`, and `VPS_SSH_KEY`.
- Production runtime values should live in the server `.env`, not in the workflow files.

## Security Notes

- Do not commit `.env`.
- Keep `OPENAI_API_KEY` on the server only.
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
