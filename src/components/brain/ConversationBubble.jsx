import { cn } from "@/lib/utils";

function tryParseConversation(promptText) {
  if (!promptText) return null;
  try {
    const parsed = JSON.parse(promptText);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return null;
}

// Extension format: promptText = JSON array of [{request, response}, ...]
// Plugin format: separate promptText (string) + responseText (string)
export default function ConversationBubble({ promptText, responseText }) {
  const pairs = tryParseConversation(promptText);

  if (pairs) {
    return (
      <div className="space-y-4">
        {pairs.map((pair, i) => (
          <div key={i} className="space-y-3">
            {pair.request && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-500/20 border border-violet-500/30 px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                  {pair.request}
                </div>
              </div>
            )}
            {pair.response && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted border border-border/60 px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                  {pair.response}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Plugin / plain format
  return (
    <div className="space-y-3">
      {promptText && (
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-500/20 border border-violet-500/30 px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
            {promptText}
          </div>
        </div>
      )}
      {responseText && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-muted border border-border/60 px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
            {responseText}
          </div>
        </div>
      )}
    </div>
  );
}
