import { Index } from "@upstash/vector";
import { tool } from "ai";
import { z } from "zod/v4";
import type {
  ArticleSearchResult,
  ArticleVectorMetadata,
} from "@/lib/vector-types";

export function searchArticlesTool() {
  const index = new Index<ArticleVectorMetadata>();

  return tool({
    description:
      "Search for Chrome Enterprise articles and documentation in the knowledge base.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "The search query to find relevant Chrome Enterprise documentation",
        ),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 3)"),
    }),
    execute: async ({ query, limit = 3 }): Promise<ArticleSearchResult[]> => {
      const results = await index.query({
        data: query,
        includeData: true,
        includeMetadata: true,
        topK: limit,
      });

      if (results.length === 0) {
        return [];
      }

      return results.map(
        (hit, i): ArticleSearchResult => ({
          resourceId: String(hit.id),
          rank: i + 1,
          title: hit.metadata?.title,
          articleType: hit.metadata?.articleType,
          articleId: hit.metadata?.articleId,
          content: hit.data || "",
          score: hit.score || 0,
          url: hit.metadata?.url,
        }),
      );
    },
  });
}
