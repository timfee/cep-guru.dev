import { CheerioCrawler } from "crawlee";
import {
  type Document,
  extractCleanTitle,
  getStandardId,
  MAX_CONCURRENCY,
  MAX_REQUESTS,
  processDocs,
  turndown,
} from "./crawl-utils.js";

async function main() {
  const documents: Document[] = [];

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: MAX_REQUESTS,
    maxConcurrency: MAX_CONCURRENCY,

    async requestHandler({ request, $, enqueueLinks }) {
      const articleHtml = $("div.devsite-article-body").html() ?? "";
      const articleId = getStandardId(request.url);
      const titleElement = $("h1.devsite-page-title");
      const title = extractCleanTitle(titleElement, request.url);
      const content = turndown.turndown(articleHtml);

      if (title) {
        documents.push({
          id: articleId,
          content,
          kind: "cloud-docs",
          url: articleId,
          title,
        });
        console.log(`✓ Crawled: ${title}`);
      }

      await enqueueLinks({
        globs: ["**/chrome-enterprise-premium/**"],
        transformRequestFunction: (req) => {
          const url = new URL(req.url);
          url.search = "";
          url.hash = "";
          req.url = url.toString();
          return req;
        },
      });
    },
  });

  console.log("Starting crawler...");
  await crawler.run([
    "https://cloud.google.com/chrome-enterprise-premium/docs/overview",
  ]);

  await processDocs(documents);
  await crawler.teardown();
}

main().catch(console.error);
