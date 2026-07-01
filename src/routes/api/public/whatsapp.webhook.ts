import { createFileRoute } from "@tanstack/react-router";

// WhatsApp Cloud API webhook (Meta official)
// GET: verification handshake
// POST: receive messages, run chatbot, reply via Graph API
export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        if (!mode || !token || !challenge) {
          return new Response("Missing params", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("whatsapp_integrations")
          .select("id")
          .eq("verify_token", token)
          .limit(1)
          .maybeSingle();

        if (mode === "subscribe" && data) {
          return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Meta webhook payload shape
          const entries = body?.entry ?? [];
          for (const entry of entries) {
            const changes = entry?.changes ?? [];
            for (const change of changes) {
              const value = change?.value;
              if (!value) continue;
              const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
              const messages = value?.messages ?? [];
              if (!phoneNumberId || messages.length === 0) continue;

              // Find integration
              const { data: integ } = await supabaseAdmin
                .from("whatsapp_integrations")
                .select("*")
                .eq("phone_number_id", phoneNumberId)
                .eq("is_active", true)
                .maybeSingle();
              if (!integ) continue;

              for (const msg of messages) {
                if (msg.type !== "text") continue;
                const from: string = msg.from;
                const text: string = msg.text?.body ?? "";
                if (!text) continue;

                // Find or create a conversation for this wa_phone
                let conversationId: string | null = null;
                const { data: waConv } = await supabaseAdmin
                  .from("whatsapp_conversations")
                  .select("conversation_id")
                  .eq("integration_id", integ.id)
                  .eq("wa_phone", from)
                  .maybeSingle();

                if (waConv) {
                  conversationId = waConv.conversation_id;
                } else {
                  const { data: conv } = await supabaseAdmin
                    .from("conversations")
                    .insert({
                      user_id: integ.user_id,
                      chatbot_id: integ.chatbot_id,
                      title: `WhatsApp ${from}`,
                    })
                    .select("id")
                    .single();
                  if (!conv) continue;
                  conversationId = conv.id;
                  await supabaseAdmin.from("whatsapp_conversations").insert({
                    integration_id: integ.id,
                    wa_phone: from,
                    conversation_id: conv.id,
                  });
                }

                // Run chatbot logic (mirrors sendChatMessage)
                const reply = await runBotReply({
                  supabaseAdmin,
                  userId: integ.user_id,
                  chatbotId: integ.chatbot_id,
                  conversationId: conversationId!,
                  userContent: text,
                });

                // Send reply via Meta Graph API
                if (reply) {
                  await sendWhatsAppMessage({
                    phoneNumberId: integ.phone_number_id,
                    accessToken: integ.access_token,
                    to: from,
                    text: reply,
                  });
                }

                await supabaseAdmin
                  .from("whatsapp_integrations")
                  .update({ last_message_at: new Date().toISOString() })
                  .eq("id", integ.id);
              }
            }
          }

          return new Response("ok", { status: 200 });
        } catch (e: any) {
          console.error("whatsapp webhook error", e);
          return new Response("error", { status: 200 }); // Meta retries on non-200
        }
      },
    },
  },
});

async function sendWhatsAppMessage(opts: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}) {
  const url = `https://graph.facebook.com/v21.0/${opts.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: opts.to,
      type: "text",
      text: { body: opts.text.slice(0, 4000) },
    }),
  });
  if (!res.ok) {
    console.error("whatsapp send fail", res.status, await res.text());
  }
}

async function runBotReply(opts: {
  supabaseAdmin: any;
  userId: string;
  chatbotId: string;
  conversationId: string;
  userContent: string;
}): Promise<string | null> {
  const { supabaseAdmin, userId, chatbotId, conversationId, userContent } = opts;

  const { data: bot } = await supabaseAdmin
    .from("chatbots").select("*").eq("id", chatbotId).single();
  if (!bot) return null;

  const { data: history } = await supabaseAdmin
    .from("messages").select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(bot.memory_max_messages ?? 20);

  const { data: kb } = await supabaseAdmin
    .from("knowledge_base").select("title, content")
    .eq("chatbot_id", chatbotId).limit(20);

  await supabaseAdmin.from("messages").insert({
    conversation_id: conversationId, user_id: userId,
    role: "user", content: userContent,
  });

  const kbBlock = kb && kb.length > 0
    ? `\n\nBase de conhecimento:\n${kb.map((k: any) => `[${k.title}]\n${k.content}`).join("\n\n")}`
    : "";
  const systemPrompt = (bot.system_prompt || "Você é um assistente.") + kbBlock;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: userContent },
  ];

  const { data: apis } = await supabaseAdmin
    .from("api_providers").select("*")
    .eq("user_id", userId).eq("is_active", true)
    .order("priority", { ascending: true });

  if (!apis || apis.length === 0) {
    return "Nenhuma API de IA configurada.";
  }

  for (const api of apis) {
    try {
      const model = api.model || "gpt-4o-mini";
      const res = await fetch(api.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api.api_key}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: Number(bot.temperature ?? 0.7),
          max_tokens: bot.max_tokens ?? 2048,
          stream: false,
        }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content
        ?? json.content?.[0]?.text
        ?? "(resposta vazia)";

      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId, user_id: userId,
        role: "assistant", content, api_provider_id: api.id, model_used: model,
      });
      return content;
    } catch (e) {
      continue;
    }
  }
  return "Falha ao gerar resposta.";
}
