import { Index } from "@upstash/vector";
import { tool } from "ai";
import { z } from "zod/v4";

export function searchPoliciesTool() {
  const index = new Index<{
    "kind:": string;
    policy_name: string;
    policy_id: number;
    is_deprecated: boolean;
    platforms: string[];
    min_version: number;
    policy_type: string;
    per_profile: boolean;
    device_only: boolean;
    dynamic_refresh: boolean;
    can_be_recommended: boolean;
    can_be_mandatory: boolean;
    tags: string[];
    has_example: boolean;
    source: string;
    url: string;
    crawledAt: Date;
  }>();

  return tool({
    description:
      "Search the knowledge base to find relevant information for answering questions",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant information"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 3)"),
    }),
    execute: async ({ query, limit = 3 }) => {
      const results = await index.query({
        data: query,
        includeData: true,
        includeMetadata: true,
        topK: limit,
      });

      if (results.length === 0) {
        return "No relevant information found in the knowledge base.";
      }

      return results.map((hit, i) => ({
        resourceId: hit.id,
        rank: i + 1,
        title: hit.metadata?.policy_name,
        content: hit.data,
        score: hit.score,
      }));
    },
  });
}
