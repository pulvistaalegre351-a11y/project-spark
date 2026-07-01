import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Zod validators
const SendMessageInput = z.object({
  conversationId: z.string().uuid(),
  chatbotId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

/**
 * Sends a message: picks the highest-priority active API of the user,
 * falls back to next on error, saves user + assistant messages,
 * returns the assistant reply.
 */
export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SendMessageInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load chatbot config
    const { data: bot, error: botErr } = await supabase
      .from("chatbots").select("*").eq("id", data.chatbotId).eq("user_id", userId).single();
    if (botErr || !bot) throw new Error("Chatbot não encontrado");

    // Load recent messages for context
    const { data: history } = await supabase
      .from("messages").select("role, content")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(bot.memory_max_messages ?? 20);

    // Load knowledge base
    const { data: kb } = await supabase
      .from("knowledge_base").select("title, content")
      .eq("chatbot_id", data.chatbotId).limit(20);

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: data.conversationId, user_id: userId,
      role: "user", content: data.content,
    });

    // Build system prompt
    const kbBlock = kb && kb.length > 0
      ? `\n\nBase de conhecimento:\n${kb.map(k => `[${k.title}]\n${k.content}`).join("\n\n")}`
      : "";
    const systemPrompt = (bot.system_prompt || "Você é um assistente.") + kbBlock;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.content },
    ];

    // Load user's active APIs by priority ASC
    const { data: apis, error: apisErr } = await supabase
      .from("api_providers").select("*")
      .eq("user_id", userId).eq("is_active", true)
      .order("priority", { ascending: true });
    if (apisErr) throw apisErr;
    if (!apis || apis.length === 0) {
      const msg = "Nenhuma API ativa cadastrada. Adicione uma API em Configurações → APIs.";
      await supabase.from("messages").insert({
        conversation_id: data.conversationId, user_id: userId,
        role: "assistant", content: msg,
      });
      return { content: msg, api_used: null };
    }

    // Try each API in priority order (failover)
    let lastError: string | null = null;
    for (const api of apis) {
      const started = Date.now();
      try {
        const model = api.model || bot.model_default || "gpt-4o-mini";
        const body = {
          model,
          messages,
          temperature: Number(bot.temperature ?? 0.7),
          top_p: Number(bot.top_p ?? 1),
          frequency_penalty: Number(bot.frequency_penalty ?? 0),
          presence_penalty: Number(bot.presence_penalty ?? 0),
          max_tokens: bot.max_tokens ?? 2048,
          stream: false,
        };
        const res = await fetch(api.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${api.api_key}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text();
          lastError = `${api.name}: ${res.status} ${txt.slice(0, 200)}`;
          await supabase.from("api_providers").update({ last_error: lastError }).eq("id", api.id);
          continue;
        }
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content
          ?? json.content?.[0]?.text
          ?? json.message?.content
          ?? "(resposta vazia)";
        const tokens = json.usage?.total_tokens ?? 0;
        const elapsed = Date.now() - started;

        // Save assistant message
        await supabase.from("messages").insert({
          conversation_id: data.conversationId, user_id: userId,
          role: "assistant", content, api_provider_id: api.id,
          model_used: model, tokens_used: tokens, response_time_ms: elapsed,
        });

        // Update API stats
        await supabase.from("api_providers").update({
          tokens_used_today: (api.tokens_used_today ?? 0) + tokens,
          tokens_used_month: (api.tokens_used_month ?? 0) + tokens,
          last_used_at: new Date().toISOString(),
          last_error: null,
        }).eq("id", api.id);

        // Update conversation
        await supabase.from("conversations").update({
          total_tokens: tokens,
          updated_at: new Date().toISOString(),
        }).eq("id", data.conversationId);

        return { content, api_used: api.name, tokens };
      } catch (e: any) {
        lastError = `${api.name}: ${e?.message ?? String(e)}`;
        await supabase.from("api_providers").update({ last_error: lastError }).eq("id", api.id);
      }
    }

    const fallbackMsg = `Falha em todas as APIs. Último erro: ${lastError ?? "desconhecido"}`;
    await supabase.from("messages").insert({
      conversation_id: data.conversationId, user_id: userId,
      role: "assistant", content: fallbackMsg,
    });
    return { content: fallbackMsg, api_used: null };
  });
