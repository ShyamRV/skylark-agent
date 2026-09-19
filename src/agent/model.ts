import "server-only";
import { ChatOpenAI } from "@langchain/openai";
import { getServerEnv } from "@/config/env";

export function hasConfiguredModel() {
  return Boolean(getServerEnv().ASI_ONE_API_KEY);
}

export function createBusinessModel(temperature = 0) {
  const env = getServerEnv();
  if (!env.ASI_ONE_API_KEY)
    throw new Error("ASI_ONE_API_KEY is not configured.");
  return new ChatOpenAI({
    model: env.ASI_ONE_MODEL,
    apiKey: env.ASI_ONE_API_KEY,
    temperature,
    maxRetries: 2,
    timeout: 15_000,
    configuration: {
      baseURL: env.ASI_ONE_BASE_URL,
    },
  });
}

export function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (
        typeof part === "object" &&
        part !== null &&
        "text" in part &&
        typeof part.text === "string"
      )
        return part.text;
      return "";
    })
    .join("");
}
