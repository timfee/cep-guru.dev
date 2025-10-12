import "dotenv/config";

import { Index } from "@upstash/vector";
import { CheerioCrawler } from "crawlee";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

const headers = {}; // copy and paste from Chrome when off corp to bypass rate limits

// Keep tables in HTML format
turndown.keep(["table", "thead", "tbody", "tr", "td", "th"]);

async function main() {
  const documents: {
    content: string;
    kind: string;
    url: string;
    title: string;
  }[] = [];

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 300,
    maxConcurrency: 10,
    preNavigationHooks: [
      ({ request }) => {
        request.headers = headers;
      },
    ],
    async requestHandler({ request, $, enqueueLinks }) {
      const articleHtml = $("article").html() ?? "";

      // Remove "Was this helpful?" section
      const cleanHtml =
        articleHtml.split(/Was this helpful\?/i)[0] || articleHtml;

      // Find and enqueue Chrome answer links
      const links: string[] = [];
      // Type guard to safely read attribs.href without unsafe casts
      const getHref = (node: unknown): string | null => {
        if (typeof node !== "object" || node === null) return null;
        const maybe = node as { attribs?: Record<string, unknown> };
        const href = maybe.attribs?.href;
        return typeof href === "string" ? href : null;
      };

      $("article")
        .find("a[href*='/chrome/a/answer/']")
        .each((_, el: unknown) => {
          const href = getHref(el);
          if (href) links.push(href);
        });

      if (links.length > 0) {
        await enqueueLinks({
          urls: links,
          transformRequestFunction: (req) => {
            try {
              const url = new URL(req.url);
              url.search = "";
              url.hash = "";
              return { ...req, url: url.toString() };
            } catch {
              return req;
            }
          },
        });
      }

      // Extract article ID
      const match = request.url.match(/\/answer\/(\d+)/);
      if (!match) return;
      const articleId = match[1];

      // Convert to markdown
      const content = turndown.turndown(cleanHtml);

      // Extract title (first heading or first line)
      const firstLine = content.split("\n").find((line) => line.trim());
      const title = firstLine?.replace(/^#+\s+/, "") ?? `Article ${articleId}`;

      documents.push({
        content: content,
        kind: "admin-docs",
        url: request.url,
        title: title,
      });
      console.log(`✓ Crawled: ${title}`);
    },
  });

  // Start crawling
  console.log("Starting crawler...");
  await crawler.run(["https://support.google.com/chrome/a#topic=7679105"]);

  // Run all document resource creations concurrently in batches for better performance
  if (documents.length === 0) {
    console.log("No documents to create resources for.");
  } else {
    console.log(
      `Creating resources in database for ${documents.length} documents...`,
    );

    // Process in batches of 10 for optimal speed without overwhelming the API
    const BATCH_SIZE = 100;
    const batches: (typeof documents)[] = [];

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }

    console.log(
      `Processing ${batches.length} batches of up to ${BATCH_SIZE} documents each...`,
    );

    const index = new Index();

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\nBatch ${i + 1}/${batches.length}:`);

      // Process batch concurrently
      await Promise.all(
        batch.map(async (doc) => {
          console.log(`  Working on: ${doc.title}`);
          index.upsert({
            id: doc.url,
            data: doc.content,
            metadata: {
              kind: doc.kind,
              title: doc.title,
              url: doc.url,
            },
          });
        }),
      );
    }

    console.log("\n✅ All resources created successfully!");
    await crawler.teardown();
  }
}

main().catch(console.error);
