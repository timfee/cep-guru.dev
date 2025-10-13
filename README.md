# Chrome Enterprise Premium Guru

A chat-based interface to answer questions about Chrome Enterprise policies, help center articles, and cloud documentation.

## Live Demo

[cep-guru.dev](https://cep-guru.dev)

## Overview

This is a Next.js 15 web application that serves as a "Chrome Enterprise Premium Guru". It's a chat-based interface that answers questions about Chrome Enterprise policies, help center articles, and cloud documentation.

The application uses the Vercel AI SDK to build the chat interface and Upstash Vector DB for vector search and storage. The data is indexed by crawling the web using Crawlee.

## Tech Stack

- [Next.js 15](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Upstash Vector DB](https://upstash.com/vector)
- [Crawlee](https://crawlee.dev/)
- [Biome](https://biomejs.dev/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/)
- [Bun](https://bun.sh/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/cep-guru.dev.git
   ```

2. Install the dependencies:

   ```bash
   bun install
   ```

3. Create a `.env.local` file in the root of the project and add the following environment variables:

   ```
   UPSTASH_VECTOR_REST_URL=...
   UPSTASH_VECTOR_REST_TOKEN=...
   ```

4. Start the development server:

   ```bash
   bun run dev
   ```

The application will be available at `http://localhost:3000`.

## Linting and Formatting

This project uses Biome for linting and formatting.

- To check for linting errors, run: `bun run lint`
- To format the code, run: `bun run format`
- To apply safe fixes for linting errors, run: `bun x biome check --write`

## Data Indexing

The application uses Upstash Vector DB for search. The data is indexed by running the following scripts:

- `bun run scripts/index-cloud.ts`: Crawls and indexes Google Cloud documentation.
- `bun run scripts/index-helpcenter.ts`: Crawls and indexes Google Support help center articles.
- `bun run scripts/index-policies.ts`: Fetches and indexes Chrome Enterprise policy templates.

## Project Structure

- **`app/`**: The main application code, following the Next.js App Router structure.
- **`components/`**: React components used in the application.
- **`lib/`**: Utility functions and type definitions.
- **`scripts/`**: Scripts for crawling and indexing data.
- **`public/`**: Static assets.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
