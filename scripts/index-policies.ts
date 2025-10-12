import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import { Index } from "@upstash/vector";

// Types for Chrome Enterprise policy templates JSON
type PolicyType =
  | "main"
  | "string"
  | "int"
  | "int-enum"
  | "string-enum"
  | "list"
  | "dict"
  | "external";

type PolicyFeatures = {
  dynamic_refresh?: boolean;
  per_profile?: boolean;
  can_be_recommended?: boolean;
  can_be_mandatory?: boolean;
};

type PolicyItem = {
  value: unknown;
  name?: string;
  caption?: string;
};

type PropertyDef = { type?: string; description?: string };

type PolicyDef = {
  id?: string | number;
  name: string;
  caption?: string;
  deprecated?: boolean;
  desc?: string;
  type?: PolicyType;
  device_only?: boolean;
  features?: PolicyFeatures;
  supported_on?: string[];
  items?: PolicyItem[];
  schema?: unknown;
  example_value?: unknown;
  note?: string;
  tags?: string[];
};

type PolicyGroup = {
  caption?: string;
  name?: string;
  policies?: string[];
};

type TemplatesData = {
  policy_definitions: PolicyDef[];
  policy_atomic_group_definitions?: PolicyGroup[];
};

// Output document shape used later for stats
type DocMetadata = {
  policy_name: string;
  policy_id?: string | number;
  is_deprecated: boolean;
  platforms: string[];
  min_version?: number;
  policy_type?: string;
  per_profile: boolean;
  device_only: boolean;
  dynamic_refresh: boolean;
  can_be_recommended: boolean;
  can_be_mandatory: boolean;
  tags: string[];
  policy_groups?: string[];
  source: string;
  url: string;
  crawledAt: string;
};

type OutputDoc = {
  id: string;
  content: string;
  metadata: DocMetadata;
};

// Constants (avoid no-magic-numbers)
const MAX_DESC_KEYWORDS = 10;

async function main() {
  const index = new Index();

  console.log("Fetching Chrome Enterprise policy definitions...");

  // Fetch the JSON data
  const response = await fetch(
    "https://chromeenterprise.google/static/json/policy_templates_en-US.json",
  );
  const json = (await response.json()) as unknown;
  const isTemplatesData = (u: unknown): u is TemplatesData => {
    if (typeof u !== "object" || u === null) return false;
    const maybe = u as { policy_definitions?: unknown };
    return Array.isArray(maybe.policy_definitions);
  };
  if (!isTemplatesData(json)) {
    throw new Error("Unexpected templates JSON shape");
  }
  const data: TemplatesData = json;

  console.log(`Found ${data.policy_definitions.length} policies to process`);

  const documents: OutputDoc[] = [];

  // Process each policy definition
  for (const policy of data.policy_definitions) {
    if (!policy.name) continue;

    // Transform to markdown
    const markdownContent = formatPolicyToMarkdown(policy);

    // Extract metadata for filtering
    const metadata = extractMetadata(policy);

    // Create document for Vertex AI
    const doc: OutputDoc = {
      id: `chrome-policy-${policy.id ?? policy.name}`,
      content: markdownContent,
      metadata: {
        ...metadata,
        source: "chrome-enterprise-policies",
        url: `https://chromeenterprise.google/policies/#${policy.name}`,
        crawledAt: new Date().toISOString(),
      },
    };

    documents.push(doc);
    console.log(`✓ Processed: ${policy.name}`);
  }

  // Process policy groups and enrich documents
  if (data.policy_atomic_group_definitions) {
    enrichWithPolicyGroups(documents, data.policy_atomic_group_definitions);
  }

  // Process resources in batches for better performance
  console.log(
    `\nCreating resources in database for ${documents.length} policies...`,
  );

  const BATCH_SIZE = 100;
  const batches: (typeof documents)[] = [];

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    batches.push(documents.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `Processing ${batches.length} batches of up to ${BATCH_SIZE} policies each...`,
  );

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\nBatch ${i + 1}/${batches.length}:`);

    // Process batch concurrently
    await Promise.all(
      batch.map(async (doc) => {
        console.log(`  Processing: ${doc.metadata.policy_name}`);

        await index.upsert({
          id: doc.id,
          data: doc.content,
          metadata: {
            "kind:": "chrome-enterprise-policy",
            ...doc.metadata,
          },
        });
      }),
    );
  }

  console.log(`\n✅ Complete! Processed ${documents.length} policies`);

  // Generate summary statistics
  const stats = {
    total_policies: documents.length,
    deprecated_policies: documents.filter((d) => d.metadata.is_deprecated)
      .length,
    device_only_policies: documents.filter((d) => d.metadata.device_only)
      .length,
    per_profile_policies: documents.filter((d) => d.metadata.per_profile)
      .length,
    platforms: [...new Set(documents.flatMap((d) => d.metadata.platforms))],
    policy_types: [...new Set(documents.map((d) => d.metadata.policy_type))],
  };

  console.log("\n📊 Statistics:", JSON.stringify(stats, null, 2));
}

/* eslint-disable sonarjs/cognitive-complexity */
// eslint-disable-next-line complexity
function formatPolicyToMarkdown(policy: PolicyDef): string {
  const lines: string[] = [];

  // Title and caption
  lines.push(`# Policy: ${policy.name}`);
  if (policy.caption) {
    lines.push(`\n**${policy.caption}**`);
  }

  // Deprecation warning
  if (policy.deprecated) {
    lines.push(
      `\n⚠️ **DEPRECATED POLICY**: This policy may no longer be supported or has been replaced. Please check official documentation for alternatives.\n`,
    );
  }

  // Description
  if (policy.desc) {
    lines.push(`\n## Description\n`);
    // Clean up whitespace and format description
    const cleanedDesc = policy.desc
      .trim()
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .join("\n\n");
    lines.push(cleanedDesc);
  }

  // Details section
  lines.push(`\n## Details\n`);
  const details: string[] = [];

  if (policy.type) {
    const typeMap: Record<string, string> = {
      main: "Boolean",
      string: "String",
      int: "Integer",
      "int-enum": "Integer Enum",
      "string-enum": "String Enum",
      list: "List",
      dict: "Dictionary",
      external: "External Data Reference",
    };
    details.push(`* **Policy Type**: ${typeMap[policy.type] ?? policy.type}`);
  }

  if (policy.device_only) {
    details.push(
      `* **Device Only**: Yes (applies to entire device, not per-user)`,
    );
  }

  const features = policy.features ?? {};
  if (features.dynamic_refresh) {
    details.push(`* **Dynamic Refresh**: Yes (changes apply without restart)`);
  }
  if (features.per_profile) {
    details.push(
      `* **Per Profile**: Yes (can be set differently for each user profile)`,
    );
  }
  if (features.can_be_recommended) {
    details.push(
      `* **Can Be Recommended**: Yes (can be set as a recommendation rather than mandatory)`,
    );
  }
  if (features.can_be_mandatory) {
    details.push(`* **Can Be Mandatory**: Yes (can be enforced as mandatory)`);
  }

  // Parse supported platforms
  if (policy.supported_on && policy.supported_on.length > 0) {
    const { platforms, versionInfo } = parseSupportedOn(policy.supported_on);
    const platformNames = platforms.map((p: string) => {
      const nameMap: Record<string, string> = {
        chrome_os: "ChromeOS",
        chrome: "Chrome",
        android: "Android",
        ios: "iOS",
        mac: "macOS",
        win: "Windows",
        linux: "Linux",
        webview_android: "Android WebView",
        fuchsia: "Fuchsia",
      };
      return nameMap[p] ?? p;
    });
    details.push(`* **Supported On**: ${platformNames.join(", ")}`);
    if (versionInfo) {
      details.push(`* **Version Requirements**: ${versionInfo}`);
    }
  }

  lines.push(...details);

  // Allowed values (for enums and boolean types)
  if (policy.items && policy.items.length > 0) {
    lines.push(`\n## Allowed Values\n`);
    for (const item of policy.items) {
      const value =
        item.value !== null && item.value !== undefined
          ? `\`${JSON.stringify(item.value)}\``
          : "`Not Set`";
      const name = item.name ? ` (${item.name})` : "";
      const caption = item.caption ?? "No description";
      lines.push(`* ${value}${name}: ${caption}`);
    }
  }

  // Schema information for complex types
  if (policy.schema && (policy.type === "dict" || policy.type === "list")) {
    lines.push(`\n## Schema\n`);
    const hasProps = (
      s: unknown,
    ): s is { properties: Record<string, PropertyDef>; required?: string[] } =>
      typeof s === "object" &&
      s !== null &&
      // @ts-expect-error - runtime guard only
      typeof s.properties === "object" &&
      // @ts-expect-error - runtime guard only
      s.properties !== null;

    if (hasProps(policy.schema)) {
      lines.push(`Properties:`);
      const requiredList = new Set(policy.schema.required ?? []);
      for (const [key, prop] of Object.entries(policy.schema.properties)) {
        const required = requiredList.has(key) ? " (required)" : "";
        lines.push(`* \`${key}\`: ${prop.type ?? "unknown"}${required}`);
        if (prop.description) {
          lines.push(`  - ${prop.description}`);
        }
      }
    } else {
      lines.push(
        `\`\`\`json\n${JSON.stringify(policy.schema, null, 2)}\n\`\`\``,
      );
    }
  }

  // Example value
  if (policy.example_value !== undefined && policy.example_value !== null) {
    lines.push(`\n## Example Value\n`);
    const exampleStr =
      typeof policy.example_value === "string"
        ? policy.example_value
        : JSON.stringify(policy.example_value, null, 2);
    lines.push(`\`\`\`json\n${exampleStr}\n\`\`\``);
  }

  // Additional notes
  if (policy.note) {
    lines.push(`\n## Note\n`);
    lines.push(policy.note);
  }

  // Tags for searchability
  if (policy.tags && policy.tags.length > 0) {
    lines.push(`\n## Tags\n`);
    lines.push(policy.tags.map((t: string) => `\`${t}\``).join(", "));
  }

  return lines.join("\n");
}
/* eslint-enable sonarjs/cognitive-complexity */

function extractMetadata(policy: PolicyDef): DocMetadata {
  const { platforms, minVersion } = parseSupportedOn(policy.supported_on ?? []);

  // Extract keywords from caption and description
  const keywords: string[] = [];
  if (policy.caption) {
    keywords.push(...extractKeywords(policy.caption));
  }
  if (policy.desc) {
    keywords.push(...extractKeywords(policy.desc).slice(0, MAX_DESC_KEYWORDS));
  }

  return {
    policy_name: policy.name,
    policy_id: policy.id,
    is_deprecated: policy.deprecated ?? false,
    platforms: platforms,
    min_version: minVersion,
    policy_type: policy.type,
    per_profile: policy.features?.per_profile ?? false,
    device_only: policy.device_only ?? false,
    dynamic_refresh: policy.features?.dynamic_refresh ?? false,
    can_be_recommended: policy.features?.can_be_recommended ?? false,
    can_be_mandatory: policy.features?.can_be_mandatory ?? false,
    tags: [...(policy.tags ?? []), ...keywords],
    has_example: policy.example_value !== undefined,
    // The following fields are added later
    source: "",
    url: "",
    crawledAt: new Date(0).toISOString(),
  } as unknown as DocMetadata; // Will be completed when constructing OutputDoc
}

function parseSupportedOn(supportedOn: string[]): {
  platforms: string[];
  minVersion?: number;
  versionInfo?: string;
} {
  const platforms = new Set<string>();
  let minVersion: number | undefined;
  const versionDetails: string[] = [];

  for (const item of supportedOn) {
    // Format examples: "chrome_os:29-", "chrome.*:87-", "android:83-"
    const parts = item.split(":");
    let platform = parts[0];

    // Handle chrome.* pattern
    if (platform.includes("chrome.")) {
      platform = platform.replace("chrome.", "");
    }

    // Clean up platform name
    platform = platform.replace(".*", "");
    platforms.add(platform);

    // Extract version info
    if (parts.length > 1) {
      const versionStr = parts[1];
      const versionMatch = versionStr.match(/(\d+)/);
      if (versionMatch) {
        const version = parseInt(versionMatch[1], 10);
        if (!minVersion || version < minVersion) {
          minVersion = version;
        }
        const platformName = platform.replace("_", " ");
        versionDetails.push(`${platformName} v${version}+`);
      }
    }
  }

  return {
    platforms: Array.from(platforms),
    minVersion,
    versionInfo:
      versionDetails.length > 0 ? versionDetails.join(", ") : undefined,
  };
}

function extractKeywords(text: string): string[] {
  // Extract meaningful keywords (nouns and important terms)
  const MIN_WORD_LEN = 4;
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= MIN_WORD_LEN); // Skip short words

  // Filter out common stop words
  const stopWords = new Set([
    "this",
    "that",
    "with",
    "from",
    "have",
    "will",
    "your",
    "when",
    "what",
    "which",
    "their",
    "would",
    "there",
    "could",
    "should",
    "about",
    "after",
    "before",
  ]);

  return [...new Set(words.filter((word) => !stopWords.has(word)))];
}

/* eslint-disable sonarjs/cognitive-complexity */
function enrichWithPolicyGroups(
  documents: OutputDoc[],
  groups: PolicyGroup[],
): void {
  // Create a map of policy names to their groups
  const policyToGroups = new Map<string, string[]>();

  for (const group of groups) {
    if (!group.policies) continue;
    for (const policyName of group.policies) {
      if (!policyToGroups.has(policyName)) {
        policyToGroups.set(policyName, []);
      }
      const arr = policyToGroups.get(policyName);
      if (arr) {
        const label = group.caption ?? group.name ?? "";
        if (label) arr.push(label);
      }
    }
  }

  // Add group information to documents
  for (const doc of documents) {
    const policyName = doc.metadata.policy_name;
    const groups = policyToGroups.get(policyName);
    if (groups && groups.length > 0) {
      doc.content += `\n\n## Policy Groups\n\nThis policy is part of: ${groups.join(", ")}`;
      doc.metadata.policy_groups = groups;
    }
  }
}

main().catch(console.error);
