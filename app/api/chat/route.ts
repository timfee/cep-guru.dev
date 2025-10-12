import { gateway } from "@ai-sdk/gateway";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { searchPoliciesTool } from "./_tools/search-policies";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: gateway("google/gemini-2.5-flash"),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: { searchPolicies: searchPoliciesTool() },
    onStepFinish: ({ toolResults }) => {
      if (toolResults.length > 0) {
        console.log("Tool results:");
        console.dir(toolResults, { depth: null });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
