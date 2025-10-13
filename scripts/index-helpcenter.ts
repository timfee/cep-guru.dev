import { CheerioCrawler } from "crawlee";
import {
  type Document,
  MAX_CONCURRENCY,
  MAX_REQUESTS,
} from "@/lib/vector-types";
import { getStandardId, processDocs, turndown } from "./crawl-utils";

function extractCleanTitle(element: unknown, url: string): string {
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

function extractHelpcenterMetadata(url: string) {
  const urlMatch = url.match(/\/(answer|topic)\/(\d+)/);
  if (urlMatch) {
    return {
      articleType: urlMatch[1] as "answer" | "topic",
      articleId: urlMatch[2],
    };
  }
  return {};
}

function cleanHtml(html: string): string {
  return html.split(/Was this helpful\?/i)[0] || html;
}

const headers = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "max-age=0",
  priority: "u=0, i",
  "sec-ch-ua":
    '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  "x-browser-channel": "stable",
  "x-browser-copyright": "Copyright 2025 Google LLC. All rights reserved.",
  "x-browser-validation": "qSH0RgPhYS+tEktJTy2ahvLDO9s=",
  "x-browser-year": "2025",
  "x-client-data":
    "CKG1yQEIkbbJAQijtskBCKmdygEIhuPKAQiSocsBCLGkywEIhqDNAQjo5M4BCMPxzgEI1IjPAQjKi88BCJeMzwEIpIzPAQiNjs8BCO6OzwEIqI/PARiyhs8BGKWHzwEYmIjPARjGiM8B",
  cookie:
    "SEARCH_SAMESITE=CgQIkp8B; __Secure-GSSO_UberProxy=CAMSEXRpbWZlZUBnb29nbGUuY29tGP_dz-64DyIwdXAuY29ycC5nb29nbGUuY29tOjQ0My91YmVycHJveHkvQTNFTjZnblBmWmlrajYvKAFA3f7s1J0zSMCjhgFQkejbAVpVEgxyZW5ld19nbnViYnkiGAoPSU5tUXNJbmY2SlhkeWdFEOOs1tOcMyorQTNFTjZnblBmWmlrajZTc3VMbEhpL3pyY0M2SWhlOEtJYjZ4MzhyaGlxOGIDSnUzaLb7_4fXE3J2CnQKckVoRjBhVzFtWldWQVoyOXZaMnhsTG1OdmJScEF5MXVkbXFSSzZhdnZ4bnl1NC1qU2tYX0FPSHFCaDluU2hIRkh3VjdiOUF5Sm0yMkpCbzJYQm5Pb0d4Q3lyMVZQcnRfNUN6YVNMYUFyai1ma1hXNVlYQQ.MEQCIB68qFhV-4W2SgZgoU4Ua3nSGXK6pJKcihbxJwCR9YavAiAFwRxhrCx-Q_PHe6QcA2uVbma9sAiENe5J2T3VKOLxEw; _gid=GA1.3.1655216509.1760312987; AEC=AaJma5tj5eBRc5mkWGE2GIJ8tNA7v82sUcObZzIp7qwT81r_kZLNL9Jr8A; S=sso=1QFjh65z-pvABRzveZuaDQbOVuy7jEQa; SID=g.a0002Qj_7r5bZz4h19yG2t7rG73GNi_fHg0ZLJBaexomkytR8ZpLF0jgRiH9CgMKzvLR9eRS6QACgYKAaUSARcSFQHGX2MidH_9cqITRe9NzInl043SExoVAUF8yKqNyuNA1BQDCNrU06HKWBct0076; __Secure-1PSID=g.a0002Qj_7r5bZz4h19yG2t7rG73GNi_fHg0ZLJBaexomkytR8ZpLwL8M2PyA2CcNTK7q3M8tLAACgYKAQ8SARcSFQHGX2Migzfik9keH5jpaKxoTWW-lRoVAUF8yKqUzrghS3HiZ_JH4TPCF-uT0076; __Secure-3PSID=g.a0002Qj_7r5bZz4h19yG2t7rG73GNi_fHg0ZLJBaexomkytR8ZpLRyalktH4iRBPS9NmDhW6ewACgYKAfcSARcSFQHGX2MiubU1s-4eX-DRFapLms7xshoVAUF8yKrNhYLguU6hfheYj-vBFRFO0076; HSID=AmqSe18EsVRSHtNUB; SSID=Ay1sgmjauPBTvykfA; APISID=FVMoBJgTYtVAqikY/AlbXDzGkC4a8Bn_1n; SAPISID=lbdXo5b9ezhlpbuN/AAwCyLLFo87RL8Qtl; __Secure-1PAPISID=lbdXo5b9ezhlpbuN/AAwCyLLFo87RL8Qtl; __Secure-3PAPISID=lbdXo5b9ezhlpbuN/AAwCyLLFo87RL8Qtl; NID=525=lmxe6RXLC4jCzClDU4M_WDDgqhCzUcCF2wBjxeSFKPsjGCCIwtdPDevL4ejvykEQj35Go59_x8Zovz4oRmuj2X88sd5koH1J3S4SuR5S4apmWoxWonRWdoydY62Te8QPpNfogSsNHr3CQ4PICw2CyFPoacXVEvKPV3966G91U7RScbFEOclJRFlgKPa7soLm94eMzxcu_gymnLT9iio_8CPewU0VZBmR_-eIfXKHAY9wpjY0VfEHxVe8O47ZdtV2G21GVQTBnKkxUWk5wCLCQWYFWEluzELEO2W0RuWDbcKle7DVqPIShlylo-bcWBRccwSgSB6J5-Y5x_d6maWzJVrPNyn3iBuGMDZ5CELvvZCMc8cN-abF8-g55b3sFzObcoIH5PGeomeVj8E3feE-J66Zh6NS6g6UdYgM9ds1rztVEJlz_tgEHF5dpSs_RuE2X1PPwUv8tXqHQ0vfhEiXkjpdncjOU8LG4TDnf4J8IUpgnvscu0xQslXCp15B0G7eHTxBH1dc05NCyzGy9Ji-XKbLdT8qE7Be7Y2KjHdI2Sa0kpgSOZl0p2VSNzQEc2oulplfC3wLF7s93Q6G7Jta_c12iUqD7Zs1v-Lx00bxGzu3l7D_6VopLzdv4le_NfumqMidoteUlAsJgvvY_Ga9rRfEwPzLoSB1R_G4KaDNVo9bdkOUTHOW6jzV0oaGlMoBwrwvwQ4OCQydlx-jAxgb8Y_-NLHidRJil4VT1kIDm16SDLX-I2icEQtYG214fBBu12rNW7TaBrkdAYg-R6UjKF7S8DwxC5nSKjve6Bu8hGHoUJK0vc_4Mjc8LEdNOs77xwcNnNuTVR9yeFzHMSNPexiZNPyT8JikUMaRqot_Gv0_bNtppTz7iXQ_x0tlFPuLZ41UgSh1N_46KsYrQ4aBzraq_oyn-j7mYtbFoaqbdyfrdSMPe6-U4-hwgxpMliqZ2nCTEabPu0Bl8I7iLeZHryDsu85SMBpnBw; SUPPORT_CONTENT=638959139939389772-923385937; __Secure-1PSIDTS=sidts-CjEBmkD5SxH9DKFbq57UQFbt_b92l3TEkjHSxfc6w9huxb5oeb4zeoPdzaNN4tzL-qq_EAA; __Secure-3PSIDTS=sidts-CjEBmkD5SxH9DKFbq57UQFbt_b92l3TEkjHSxfc6w9huxb5oeb4zeoPdzaNN4tzL-qq_EAA; GOOGLE_ABUSE_EXEMPTION=ID=c9ff84af86558607:TM=1760318623:C=r:IP=2600:1700:2f71:2350:68c4:7724:2a15:aadf-:S=RbP89DniUYEGO-S2-GSbLv0; _gat_gtag_UA_175894890_5=1; _ga_H30R9PNQFN=GS2.1.s1760317194$o3$g1$t1760318628$j58$l0$h0; _ga=GA1.3.1244057624.1759971320; SIDCC=AKEyXzXTXP7rUaK2tBc3dqOxhugBxjZZ2lVaalYQmG-VN0Zfdc7nmu_OHu0qH0-gY9sPykQNslnh; __Secure-1PSIDCC=AKEyXzWRv1rAiUSDcr_Jsx6VLfNBCy2UkuaAFNSgLQ0KNsAhYcdNcXR_oZYS8Qgoq7GINi3TIaA; __Secure-3PSIDCC=AKEyXzUsTejXq2NIyudmQ6fZpIlCq5YaRfzU02rOq5uzggJovDfCs0VtolP6i6xHQ-LgoZHSBAkU",
  Referer: "https://www.google.com/",
};
async function main() {
  const documents: Document[] = [];

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: MAX_REQUESTS,
    maxConcurrency: MAX_CONCURRENCY,

    preNavigationHooks: [
      ({ request }) => {
        request.headers = headers;
      },
    ],

    failedRequestHandler({ request }) {
      console.log(`❌ Failed to crawl: ${request.url}`);
    },

    async requestHandler({ request, $, enqueueLinks }) {
      // Validate URL structure before processing
      const url = new URL(request.url);
      // Allow: /chrome/a, /chrome/a/answer/123, /chrome/a/topic/123, /a/answer/123, /a/topic/123
      const validPattern = /^\/(chrome\/)?a(\/((answer|topic)\/\d+)?)?$/;

      if (!validPattern.test(url.pathname)) {
        console.log(`⚠️ Skipping malformed URL: ${request.url}`);
        return;
      }

      const articleHtml = $("article").html() ?? "";
      const cleaned = cleanHtml(articleHtml);

      // Only process pages with actual numeric IDs for content extraction
      if (!request.url.match(/\/(answer|topic)\/(\d+)/)) {
        console.log(
          `📁 Topic/category page (no content extraction): ${request.url}`
        );
        // Still enqueue links from topic pages but don't extract content
        await enqueueLinks({
          globs: [
            "https://support.google.com/chrome/a",
            "https://support.google.com/chrome/a/answer/*",
            "https://support.google.com/a/answer/*",
            "https://support.google.com/chrome/a/topic/*",
            "https://support.google.com/a/topic/*",
          ],
          selector: "article a[href]",
          transformRequestFunction: (req) => {
            try {
              const url = new URL(req.url);

              // Validate it's a Google Support URL
              if (!url.hostname.includes("support.google.com")) {
                return false;
              }

              // Validate the URL path structure to prevent malformed URLs
              const path = url.pathname;
              const validPattern =
                /^\/(chrome\/)?a(\/((answer|topic)\/\d+)?)?$/;

              if (!validPattern.test(path)) {
                return false;
              }

              // Clean the URL
              url.search = "";
              url.hash = "";
              req.url = url.toString();
              return req;
            } catch {
              return false;
            }
          },
          limit: 200,
        });
        return;
      }

      const articleId = getStandardId(request.url);
      const title = extractCleanTitle($("h1"), request.url);
      const helpcenterMetadata = extractHelpcenterMetadata(request.url);
      const content = turndown.turndown(cleaned);

      documents.push({
        id: articleId,
        content,
        kind: "admin-docs",
        url: articleId,
        title,
        metadata: helpcenterMetadata,
      });
      console.log(`✓ Crawled: ${title}`);

      // Enqueue links from content pages
      await enqueueLinks({
        globs: [
          "https://support.google.com/chrome/a",
          "https://support.google.com/chrome/a/answer/*",
          "https://support.google.com/a/answer/*",
          "https://support.google.com/chrome/a/topic/*",
          "https://support.google.com/a/topic/*",
        ],
        selector: "article a[href]",
        transformRequestFunction: (req) => {
          try {
            const url = new URL(req.url);

            // Validate it's a Google Support URL
            if (!url.hostname.includes("support.google.com")) {
              return false;
            }

            // Validate the URL path structure to prevent malformed URLs
            const path = url.pathname;
            const validPattern = /^\/(chrome\/)?a(\/((answer|topic)\/\d+)?)?$/;

            if (!validPattern.test(path)) {
              return false;
            }

            // Clean the URL
            url.search = "";
            url.hash = "";
            req.url = url.toString();
            return req;
          } catch {
            return false;
          }
        },
        limit: 200,
      });
    },
  });

  console.log("Starting crawler...");
  await crawler.run([
    "https://support.google.com/chrome/a",
    "https://support.google.com/a/answer/10026322",
    "https://support.google.com/a/answer/10840369",
    "https://support.google.com/a/answer/11068433",
    "https://support.google.com/a/answer/11368990",
    "https://support.google.com/a/answer/11560430",
    "https://support.google.com/a/answer/12642329",
    "https://support.google.com/a/answer/12642752",
    "https://support.google.com/a/answer/12642828",
    "https://support.google.com/a/answer/12643733",
    "https://support.google.com/a/answer/13447476",
    "https://support.google.com/a/answer/13790448",
    "https://support.google.com/a/answer/14914403",
    "https://support.google.com/a/answer/15178509",
    "https://support.google.com/a/answer/16118940",
    "https://support.google.com/a/answer/16244319",
    "https://support.google.com/a/answer/16409481",
    "https://support.google.com/a/answer/16479560",
    "https://support.google.com/a/answer/9184226",
    "https://support.google.com/a/answer/9261439",
    "https://support.google.com/a/answer/9262032",
    "https://support.google.com/a/answer/9275380",
    "https://support.google.com/a/answer/9394107",
    "https://support.google.com/a/answer/9587667",
    "https://support.google.com/a/answer/9668676",
    "https://support.google.com/a/topic/10742486",
    "https://support.google.com/a/topic/11399553",
    "https://support.google.com/a/topic/7492529",
    "https://support.google.com/a/topic/7556597",
    "https://support.google.com/a/topic/7558840",
    "https://support.google.com/a/topic/9061731",
    "https://support.google.com/a/topic/9105077",
  ]);

  await processDocs(documents);
  await crawler.teardown();
}

main().catch(console.error);
