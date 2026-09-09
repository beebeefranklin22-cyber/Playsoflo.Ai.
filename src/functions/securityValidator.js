// Lightweight prompt-injection / abuse pattern check for messages headed
// to the AI assistant — a simple denylist, not a model call, since the
// thing it's guarding is itself an LLM call.
const BLOCKED_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /system prompt/i,
  /reveal.*(api key|password|secret|credentials)/i,
  /you are now (in )?(dan|jailbreak)/i,
];

export async function securityValidator({ input } = {}) {
  const blocked = BLOCKED_PATTERNS.some((p) => p.test(input || ''));
  return { data: { blocked, reason: blocked ? 'Message matched a blocked pattern' : null } };
}
