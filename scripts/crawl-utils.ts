import { Index } from "@upstash/vector";
import dotenv from "dotenv";
import TurndownService from "turndown";
import type { PolicyDefinition } from "./crawl-policy-types.js";

dotenv.config({ path: ".env.local" });

export const UPSTASH_MAX_DATA_SIZE = 1024 * 1024;
export const BATCH_SIZE = 100;
export const MAX_REQUESTS = 300;
export const MAX_CONCURRENCY = 10;

export interface BaseDocument {
  id: string;
  content: string;
  kind: string;
  url: string;
  title: string;
}

export interface Document extends BaseDocument {
  metadata?: {
    articleType?: string;
    articleId?: string;
  };
}

export interface PolicyDocument extends BaseDocument {
  metadata: {
    policyId: number;
    policyName: string;
    deprecated?: boolean;
    deviceOnly?: boolean;
    supportedPlatforms?: string[];
    supportedPlatformsText?: string;
    tags?: string[];
    features?: {
      dynamicRefresh?: boolean;
      perProfile?: boolean;
      canBeRecommended?: boolean;
      canBeMandatory?: boolean;
      cloudOnly?: boolean;
      userOnly?: boolean;
    };
  };
}

export const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

export function getStandardId(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.origin + urlObj.pathname;
  } catch {
    return url;
  }
}

export function extractCleanTitle(element: unknown, url: string): string {
  try {
    const cheerioElement = element as { text?: () => string };
    const title = cheerioElement?.text?.()?.replace(/\s+/g, " ").trim();
    if (title) return title;
  } catch {
    // Fallback to URL-based title
  }

  const match = url.match(/\/(answer|topic)\/(\d+)/);
  return match ? `Article ${match[2]}` : "Untitled";
}

export function extractHelpcenterMetadata(url: string) {
  const urlMatch = url.match(/\/(answer|topic)\/(\d+)/);
  if (urlMatch) {
    return {
      articleType: urlMatch[1] as "answer" | "topic",
      articleId: urlMatch[2],
    };
  }
  return {};
}

export function cleanHtml(html: string): string {
  return html.split(/Was this helpful\?/i)[0] || html;
}

export function generatePolicyMarkdown(policy: PolicyDefinition): string {
  const sections: string[] = [];

  sections.push(`# ${policy.caption || policy.name}`);
  sections.push("");

  const metadata: string[] = [];
  if (policy.name) metadata.push(`**Policy Name:** \`${policy.name}\``);
  if (policy.id) metadata.push(`**Policy ID:** ${policy.id}`);
  if (policy.deprecated) metadata.push(`**Status:** ⚠️ Deprecated`);
  if (policy.device_only) metadata.push(`**Scope:** Device-only`);

  if (metadata.length > 0) {
    sections.push(metadata.join("  \n"));
    sections.push("");
  }

  if (policy.desc) {
    sections.push("## Description");
    sections.push("");
    sections.push(policy.desc);
    sections.push("");
  }

  if (policy.supported_on && policy.supported_on.length > 0) {
    sections.push("## Supported Platforms");
    sections.push("");
    sections.push(policy.supported_on.map((p: string) => `- ${p}`).join("\n"));
    sections.push("");
  }

  if (policy.type || policy.schema || policy.items) {
    sections.push("## Configuration");
    sections.push("");

    if (policy.type) {
      sections.push(`**Type:** ${policy.type}`);
      sections.push("");
    }

    if (policy.items && policy.items.length > 0) {
      sections.push("### Available Options");
      sections.push("");
      policy.items.forEach((item) => {
        const value = JSON.stringify(item.value);
        const caption = item.caption || item.name || value;
        sections.push(`- **${caption}** (${value})`);
      });
      sections.push("");
    }

    if (policy.example_value !== undefined) {
      sections.push("### Example");
      sections.push("");
      sections.push("```json");
      sections.push(JSON.stringify(policy.example_value, null, 2));
      sections.push("```");
      sections.push("");
    }

    if (policy.default !== undefined) {
      sections.push(`**Default:** \`${JSON.stringify(policy.default)}\``);
      sections.push("");
    }
  }

  if (policy.features) {
    const features: string[] = [];
    if (policy.features.dynamic_refresh)
      features.push("Dynamic refresh supported");
    if (policy.features.per_profile) features.push("Per-profile configuration");
    if (policy.features.can_be_recommended)
      features.push("Can be set as recommended");
    if (policy.features.can_be_mandatory)
      features.push("Can be set as mandatory");

    if (features.length > 0) {
      sections.push("## Features");
      sections.push("");
      sections.push(features.map((f) => `- ${f}`).join("\n"));
      sections.push("");
    }
  }

  if (policy.tags && policy.tags.length > 0) {
    sections.push("## Tags");
    sections.push("");
    sections.push(policy.tags.map((tag: string) => `\`${tag}\``).join(" "));
    sections.push("");
  }

  return sections.join("\n");
}

export async function processDocs(documents: Document[]): Promise<void> {
  if (documents.length === 0) {
    console.log("No documents to process.");
    return;
  }

  console.log(`Processing ${documents.length} documents...`);

  const batches: Document[][] = [];
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    batches.push(documents.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `Processing ${batches.length} batches of up to ${BATCH_SIZE} documents each...`
  );

  const index = new Index();

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\nBatch ${i + 1}/${batches.length}:`);

    await Promise.all(
      batch.map(async (doc) => {
        console.log(`  Working on: ${doc.title}`);

        await index.upsert({
          id: doc.id,
          data: doc.content.slice(0, UPSTASH_MAX_DATA_SIZE),
          metadata: {
            kind: doc.kind,
            title: doc.title,
            url: doc.url,
            ...(doc.metadata || {}),
          },
        });
      })
    );
  }

  console.log("\n✅ All documents processed successfully!");
}

export async function processPolicyDocs(
  documents: PolicyDocument[]
): Promise<void> {
  if (documents.length === 0) {
    console.log("No policy documents to process.");
    return;
  }

  console.log(`Processing ${documents.length} policy documents...`);

  const batches: PolicyDocument[][] = [];
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    batches.push(documents.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `Processing ${batches.length} batches of up to ${BATCH_SIZE} documents each...`
  );

  const index = new Index();

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\nBatch ${i + 1}/${batches.length}:`);

    try {
      const results = await Promise.allSettled(
        batch.map(async (doc) => {
          console.log(`  Working on: ${doc.title}`);

          return await index.upsert({
            id: doc.id,
            data: doc.content.slice(0, UPSTASH_MAX_DATA_SIZE),
            metadata: {
              kind: doc.kind,
              title: doc.title,
              url: doc.url,
              policyId: doc.metadata.policyId,
              policyName: doc.metadata.policyName,
              deprecated: doc.metadata.deprecated || false,
              deviceOnly: doc.metadata.deviceOnly || false,
              supportedPlatforms: doc.metadata.supportedPlatforms || [],
              supportedPlatformsText:
                doc.metadata.supportedPlatformsText || "Not specified",
              tags: doc.metadata.tags || [],
              dynamicRefresh: doc.metadata.features?.dynamicRefresh || false,
              perProfile: doc.metadata.features?.perProfile || false,
              canBeRecommended:
                doc.metadata.features?.canBeRecommended || false,
              canBeMandatory: doc.metadata.features?.canBeMandatory || false,
              cloudOnly: doc.metadata.features?.cloudOnly || false,
              userOnly: doc.metadata.features?.userOnly || false,
            },
          });
        })
      );

      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length > 0) {
        console.warn(
          `⚠️  ${failures.length}/${batch.length} failed in batch ${i + 1}`
        );
        failures.forEach((failure, idx) => {
          console.error(`  Failed item ${idx + 1}:`, failure.reason);
        });
      } else {
        console.log(`✅ Batch ${i + 1} completed successfully`);
      }
    } catch (error) {
      console.error(`❌ Error processing batch ${i + 1}:`, error);
      throw error;
    }
  }

  console.log("\n✅ All policy documents processed successfully!");
}
