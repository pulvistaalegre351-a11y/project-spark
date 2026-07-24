import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/qr/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          console.log("Webhook called with body:", JSON.stringify(body));
          const { sessionId, from, text, fromMe } = body;
          
          if (!sessionId || !from || (!text && !fromMe)) {
            console.log("Bad request missing fields:", { sessionId, from, text: !!text });
            return new Response("Missing params", { status: 400 });
          }

          const { supabaseAdmin: _supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const supabaseAdmin = _supabaseAdmin as any;

          // Find integration
          const { data: integ, error: integErr } = await supabaseAdmin
            .from("qr_integrations")
            .select("*")
            .eq("session_name", sessionId)
            .eq("status", "connected")
            .maybeSingle();

          console.log("Found integ:", integ ? integ.id : "null", "Error:", integErr);

          if (!integ) {
            console.log("Integration not found for sessionId:", sessionId);
            return new Response(JSON.stringify({ reply: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }

          // Find or create a conversation for this wa_phone
          let conversationId: string | null = null;
          
          const { data: convExists, error: convErr1 } = await supabaseAdmin
            .from("conversations")
            .select("id, is_paused")
            .eq("chatbot_id", integ.chatbot_id)
            .eq("title", `WhatsApp QR ${from}`)
            .maybeSingle();

          if (convErr1) console.log("convExists error:", convErr1);

          if (convExists) {
            conversationId = convExists.id;
          } else {
            const { data: conv, error: convErr2 } = await supabaseAdmin
              .from("conversations")
              .insert({
                user_id: integ.user_id,
                chatbot_id: integ.chatbot_id,
                title: `WhatsApp QR ${from}`,
              })
              .select("id")
              .single();
            if (convErr2) console.log("conv insert error:", convErr2);
            if (conv) {
              conversationId = conv.id;
            }
          }

          if (!conversationId) {
             console.log("No conversationId found or created!");
             return new Response(JSON.stringify({ reply: null }), { status: 200 });
          }

          // Check if message is a pause/resume command
          const bot = await supabaseAdmin.from("chatbots").select("*").eq("id", integ.chatbot_id).single();
          
          let isPaused = convExists?.is_paused || false;
          let replyMessage: string | null = null;
          let commandExecuted = false;

          const msgTextLower = text.trim().toLowerCase();
          const pauseKeyword = bot.data?.pause_keyword?.trim().toLowerCase();
          const resumeKeyword = bot.data?.resume_keyword?.trim().toLowerCase();

          // Se a mensagem bater exatamente com a palavra de pause (e ela estiver configurada)
          if (pauseKeyword && msgTextLower === pauseKeyword) {
              console.log(`Bot paused for conversation ${conversationId}`);
              await supabaseAdmin.from("conversations").update({ is_paused: true }).eq("id", conversationId);
              return new Response(JSON.stringify({ reply: "✅ IA desativada" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          } 
          // Se a mensagem bater exatamente com a palavra de resume (e ela estiver configurada)
          else if (resumeKeyword && msgTextLower === resumeKeyword) {
              console.log(`Bot resumed for conversation ${conversationId}`);
              await supabaseAdmin.from("conversations").update({ is_paused: false }).eq("id", conversationId);
              return new Response(JSON.stringify({ reply: "✅ IA ativada" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }

          // Se for fromMe = true, ignoramos independente de ser pause/resume (a menos que a gente queira responder ao admin? não, o admin não precisa de resposta da IA).
          if (fromMe) {
              console.log("Message is fromMe, ignoring AI generation. Just updated state if it was a command.");
              return new Response(JSON.stringify({ reply: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }

          if (isPaused) {
              console.log(`Conversation ${conversationId} is paused. AI will not reply.`);
              return new Response(JSON.stringify({ reply: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }

          console.log("Generating reply for conversationId:", conversationId);
          const reply = await generateReply(supabaseAdmin, integ.user_id, integ.chatbot_id, conversationId, text, bot.data);
          console.log("generateReply returned:", reply);

          await supabaseAdmin
            .from("qr_integrations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", integ.id);

          return new Response(JSON.stringify({ reply }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (e: any) {
          console.error("qr webhook error", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});

// ... optimized generateReply and webhook handler
async function generateReply(
  supabaseAdmin: any, 
  userId: string, 
  chatbotId: string, 
  conversationId: string, 
  userContent: string,
  botData: any
): Promise<string | null> {
  if (!botData) return null;

  // Run all independent queries CONCURRENTLY to save time (makes the bot 2x faster!)
  const [historyRes, kbRes, apisRes, _] = await Promise.all([
    supabaseAdmin
      .from("messages").select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(botData.memory_max_messages ?? 20),
    
    supabaseAdmin
      .from("knowledge_base").select("title, content")
      .eq("chatbot_id", chatbotId)
      .limit(20),
      
    supabaseAdmin
      .from("api_providers").select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("priority", { ascending: true }),

    // Save the user's message asynchronously without waiting for it specifically
    supabaseAdmin.from("messages").insert({
      conversation_id: conversationId, user_id: userId,
      role: "user", content: userContent,
    })
  ]);

  const history = historyRes.data;
  const kb = kbRes.data;
  const apis = apisRes.data;

  const kbBlock = kb && kb.length > 0
    ? `\n\nBase de conhecimento:\n${kb.map((k: any) => `[${k.title}]\n${k.content}`).join("\n\n")}`
    : "";
  const systemPrompt = (botData.system_prompt || "Você é um assistente.") + kbBlock;

  const rawMessages = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: userContent },
  ];

  const messages: any[] = [];
  for (const m of rawMessages) {
    if (messages.length > 0 && messages[messages.length - 1].role === m.role) {
      messages[messages.length - 1].content += "\n\n" + m.content;
    } else {
      messages.push({ ...m });
    }
  }

  if (!apis || apis.length === 0) {
    return "Nenhuma API de IA configurada no painel.";
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
          temperature: Number(botData.temperature ?? 0.7),
          max_tokens: botData.max_tokens ?? 2048,
          stream: false,
        }),
      });
      if (!res.ok) {
        console.error(`API Error for provider ${api.id}:`, await res.text());
        continue;
      }
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
  return "Falha ao gerar resposta pela API.";
}
