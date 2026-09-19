import "server-only";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { getServerEnv } from "@/config/env";

let checkpointer: PostgresSaver | undefined;

export function getAgentCheckpointer() {
  const url = getServerEnv().DATABASE_URL;
  if (!url) return undefined;
  checkpointer ??= PostgresSaver.fromConnString(url, {
    schema: "langgraph",
  });
  return checkpointer;
}
