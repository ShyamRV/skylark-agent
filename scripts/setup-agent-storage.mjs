import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL, {
  schema: "langgraph",
});

await checkpointer.setup();
console.log("LangGraph checkpoint storage is ready.");
