import {
  conversationDefaults,
  type ConversationContext,
} from "@/agent/contracts/intents";

const contexts = new Map<string, ConversationContext>();

function key(tenantId: string, threadId: string) {
  return `${tenantId}:${threadId}`;
}

export function getConversationContext(
  tenantId: string,
  threadId: string,
): ConversationContext {
  return contexts.get(key(tenantId, threadId)) ?? conversationDefaults();
}

export function saveConversationContext(
  tenantId: string,
  threadId: string,
  context: ConversationContext,
) {
  contexts.set(key(tenantId, threadId), context);
}

export function resetConversationContext(tenantId: string, threadId: string) {
  contexts.delete(key(tenantId, threadId));
}
