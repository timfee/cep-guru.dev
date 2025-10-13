import dotenv from "dotenv";
import { getSupportedOnText, type PolicyTemplates } from "./crawl-policy-types";

import {
  generatePolicyMarkdown,
  type PolicyDocument,
  processPolicyDocs,
} from "./crawl-utils.js";

dotenv.config({ path: ".env.local" });

const API_URL =
  "https://chromeenterprise.google/static/json/policy_templates_en-US.json";

async function main() {
  console.log("Fetching Chrome Enterprise policy templates...");

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch policies: ${response.status}`);
  }

  const data: PolicyTemplates = await response.json();
  console.log(`Found ${data.policy_definitions.length} policies`);

  const documents: PolicyDocument[] = data.policy_definitions.map((policy) => {
    const policyUrl = `https://chromeenterprise.google/policies/#${policy.name}`;

    return {
      id: policyUrl,
      content: generatePolicyMarkdown(policy),
      kind: "chrome-enterprise-policy",
      url: policyUrl,
      title: policy.caption || policy.name,
      metadata: {
        policyId: policy.id,
        policyName: policy.name,
        deprecated: policy.deprecated,
        deviceOnly: policy.device_only,
        supportedPlatforms: policy.supported_on,
        supportedPlatformsText: getSupportedOnText(policy),
        tags: policy.tags,
        features: {
          dynamicRefresh: policy.features?.dynamic_refresh,
          perProfile: policy.features?.per_profile,
          canBeRecommended: policy.features?.can_be_recommended,
          canBeMandatory: policy.features?.can_be_mandatory,
          cloudOnly: policy.features?.cloud_only,
          userOnly: policy.features?.user_only,
        },
      },
    };
  });

  console.log(
    `Generated ${documents.length} policy documents with rich metadata`
  );

  await processPolicyDocs(documents);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
