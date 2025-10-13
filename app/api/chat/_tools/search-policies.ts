import { Index } from "@upstash/vector";
import { tool } from "ai";
import { z } from "zod/v4";
import type {
  PolicySearchResult,
  PolicyVectorMetadata,
} from "@/lib/vector-types";

export function searchPoliciesTool() {
  const index = new Index<PolicyVectorMetadata>();

  return tool({
    description:
      "Search for Chrome Policy related information in the knowledge base.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "The search query (relevant to Chrome Policies) to find relevant information",
        ),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default: 3)"),
    }),
    execute: async ({ query, limit = 3 }): Promise<PolicySearchResult[]> => {
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
        (hit, i): PolicySearchResult => ({
          resourceId: String(hit.id),
          rank: i + 1,
          policyName: hit.metadata?.policyName,
          policyId: hit.metadata?.policyId,
          deprecated: hit.metadata?.deprecated,
          deviceOnly: hit.metadata?.deviceOnly,
          platforms: hit.metadata?.supportedPlatforms,
          tags: hit.metadata?.tags,
          content: hit.data || "",
          score: hit.score || 0,
          url: hit.metadata?.url,
        }),
      );
    },
  });
}
