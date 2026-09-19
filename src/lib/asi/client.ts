import "server-only";
import OpenAI from "openai";

export function getAsiApiKey() {
  return process.env.ASI_ONE_API_KEY ?? process.env.ASI1_API_KEY;
}

export function hasAsiApiKey() {
  return Boolean(getAsiApiKey());
}

export function getAsiModel() {
  return process.env.ASI_ONE_MODEL ?? "asi1-mini";
}

export function createAsiClient() {
  const apiKey = getAsiApiKey();
  if (!apiKey) {
    throw new Error("ASI_ONE_API_KEY is not configured.");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.ASI_ONE_BASE_URL ?? "https://api.asi1.ai/v1",
  });
}
