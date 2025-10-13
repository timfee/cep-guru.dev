import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import { Index } from "@upstash/vector";
import { CheerioCrawler } from "crawlee";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

const UPSTASH_MAX_DATA_SIZE = 1024 * 1024; // 1MB

const headers = {
  "sec-ch-ua":
    '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  "sec-ch-ua-arch": '""',
  "sec-ch-ua-bitness": '"64"',
  "sec-ch-ua-form-factors": '"Desktop"',
  "sec-ch-ua-full-version": '"141.0.7390.66"',
  "sec-ch-ua-full-version-list":
    '"Google Chrome";v="141.0.7390.66", "Not?A_Brand";v="8.0.0.0", "Chromium";v="141.0.7390.66"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-model": '"Nexus 5"',
  "sec-ch-ua-platform": '"Android"',
  "sec-ch-ua-platform-version": '"6.0"',
  "sec-ch-ua-wow64": "?0",
  "upgrade-insecure-requests": "1",
  Referer: "https://www.google.com/",
};
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
        .find("a[href*='/chrome-enterprise-premium/']")
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

      // Extract URL path as article ID (no search params, hash, etc.)
      const url = new URL(request.url);
      const articleId = url.pathname;

      // Extract title from h1.devsite-page-title (text only, no nested elements)
      const titleElement = $("h1.devsite-page-title");
      let title = "";
      if (titleElement.length > 0) {
        // Get only direct text nodes, ignoring nested elements
        title = titleElement
          .contents()
          .filter(function () {
            return this.type === "text";
          })
          .text()
          .replace(/\s+/g, " ")
          .trim();
      }
      title = title || `Article ${articleId}`;

      // Convert to markdown
      const content = turndown.turndown(cleanHtml);

      documents.push({
        content: content,
        kind: "cloud-docs",
        url: request.url,
        title: title,
      });
      console.log(`✓ Crawled: ${title}`);
    },
  });

  // Start crawling
  console.log("Starting crawler...");
  await crawler.run([
    "https://cloud.google.com/chrome-enterprise-premium/docs/overview",
  ]);

  // Run all document resource creations concurrently in batches for better performance
  if (documents.length === 0) {
    console.log("No documents to create resources for.");
  } else {
    console.log(
      `Creating resources in database for ${documents.length} documents...`
    );

    // Process in batches of 10 for optimal speed without overwhelming the API
    const BATCH_SIZE = 100;
    const batches: (typeof documents)[] = [];

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

      // Process batch concurrently
      await Promise.all(
        batch.map(async (doc) => {
          console.log(`  Working on: ${doc.title}`);
          // Use URL path as ID (no search params, hash, etc.)
          const url = new URL(doc.url);
          const articleId = url.pathname;

          index.upsert({
            id: articleId,
            data: doc.content.slice(0, UPSTASH_MAX_DATA_SIZE), // Truncate to 1MB
            metadata: {
              kind: doc.kind,
              title: doc.title,
              url: doc.url,
            },
          });
        })
      );
    }

    console.log("\n✅ All resources created successfully!");
    await crawler.teardown();
  }
}

main().catch(console.error);
