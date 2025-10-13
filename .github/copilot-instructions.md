
# Copilot Instructions

This document provides instructions for the Copilot coding agent to work efficiently with this repository.

## High-Level Details

This is a Next.js 15 web application that serves as a "Chrome Enterprise Premium Guru". It's a chat-based interface that answers questions about Chrome Enterprise policies, help center articles, and cloud documentation.

- **Project Type**: Next.js 15 Web Application
- **Languages**: TypeScript
- **Frameworks**: React, Next.js, Tailwind CSS, shadcn/ui
- **Runtimes**: Node.js, Bun
- **Key Libraries**:
    - Vercel AI SDK: For building the chat interface.
    - Upstash Vector DB: For vector search and storage.
    - Crawlee: For web scraping and data indexing.
    - Biome: For linting and formatting.

## Build Instructions

### 1. Bootstrap

To install the dependencies, run the following command:

```bash
bun install
```

### 2. Build

To build the project for production, run the following command:

```bash
bun run build
```

### 3. Run

To start the development server, run the following command:

```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

### 4. Lint and Format

This project uses Biome for linting and formatting.

To check for linting errors, run:

```bash
bun run lint
```

To format the code, run:

```bash
bun run format
```

To apply safe fixes for linting errors, run:
```bash
bun x biome check --write
```

**Note:** There are some known linting issues with `app/globals.css` and some of the `shadcn/ui` components. These can be ignored for now.

### 5. Data Indexing

The application uses Upstash Vector DB for search. The data is indexed by running the following scripts:

- `bun run scripts/index-cloud.ts`: Crawls and indexes Google Cloud documentation.
- `bun run scripts/index-helpcenter.ts`: Crawls and indexes Google Support help center articles.
- `bun run scripts/index-policies.ts`: Fetches and indexes Chrome Enterprise policy templates.

You will need to have a `.env.local` file with the following environment variables to run the indexing scripts:

```
UPSTASH_VECTOR_REST_URL=...
UPSTASH_VECTOR_REST_TOKEN=...
```

## Project Layout

- **`app/`**: The main application code, following the Next.js App Router structure.
    - **`app/api/chat/`**: The API route for the chat functionality.
        - **`app/api/chat/_tools/`**: Tools used by the chat API, such as `search-articles.ts` and `search-policies.ts`.
- **`components/`**: React components used in the application.
    - **`components/ai-elements/`**: Components related to the AI SDK and chat interface.
    - **`components/ui/`**: Components from the `shadcn/ui` library.
- **`lib/`**: Utility functions and type definitions.
- **`scripts/`**: Scripts for crawling and indexing data.
- **`public/`**: Static assets.
- **`biome.json`**: Configuration file for Biome.
- **`next.config.ts`**: Configuration file for Next.js.
- **`package.json`**: Project dependencies and scripts.
- **`tsconfig.json`**: TypeScript configuration.

## Checks

This repository has no pre-commit hooks or CI/CD pipelines configured. Please ensure that you run the `lint` and `build` commands before committing any changes.
