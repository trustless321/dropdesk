# DropDesk

DropDesk is a small browser app for keeping a focused daily task list. The
first slice is a calm, responsive dashboard shell. The next slice will add
task creation and editing, deadlines, project links, notes, urgency sorting,
countdowns, and a one-click plain-text daily digest.

## Stack

- Plain HTML, CSS, and JavaScript so the app stays easy to learn and change.
- Node.js' built-in HTTP server for local development; there is no framework
  or dependency-heavy toolchain yet.
- Node's built-in test runner, so the test command works offline after cloning.
- Node.js `24.20.0`, pinned in `.nvmrc` and `package.json`.

## Prerequisites

- Node.js `24.20.0` (using [nvm](https://github.com/nvm-sh/nvm) is recommended).
- npm `10.9.x` or another npm version compatible with the pinned Node.js
  runtime.

Docker is optional. The included `Dockerfile` uses the same pinned Node.js
runtime for a clean rebuild.

## Setup

From the repository root:

```sh
nvm install
nvm use
npm ci
cp .env.example .env
```

`.env` is optional. The example only sets the local server port, and `.env` is
ignored by git so local settings and secrets are not committed.

## Run locally

Start the development server:

```sh
npm run dev
```

Open <http://localhost:4173> in a browser. Set another port in `.env` or in
the environment when needed:

```sh
PORT=4174 npm run dev
```

The production-style local command is equivalent for this static app:

```sh
npm start
```

## Test

Run the one project test command:

```sh
npm test
```

This runs the offline Node.js test suite for the browser shell, task validation
and persistence logic, and deadline urgency/countdown behavior. It should pass
without a network connection after the repository is cloned.

## Docker

Build and run the app with the pinned container runtime:

```sh
docker build -t dropdesk .
docker run --rm -p 4173:4173 dropdesk
```

Then open <http://localhost:4173>. The image runs `npm test` during its build,
so a broken setup fails before the image is produced.

## Deploy

The app is a static browser app and can be deployed to any host that serves
the repository files and runs the small Node server. For a container-based
deployment, build the Docker image above and run it with the platform's
container service. The app currently has no external services or production
secrets; add deployment-specific environment variables through the hosting
provider rather than committing them.
