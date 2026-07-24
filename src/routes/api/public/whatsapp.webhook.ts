import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/qr/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          console.log("Webhook called with body:", JSON.stringify({ ...body, audioBase64: body.audioBase64 ? "exists (base64 string)" : "null" }));
          let { sessionId, from, text, fromMe, audioBase64 } = body;
          
          if (!sessionId || !from || (!text && !fromMe && !audioBase64)) {
            console.log("Bad request missing fields:", { sessionId, from, text: !!text, audio: !!audioBase64 });
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
          const replyData = await generateReply(supabaseAdmin, integ.user_id, integ.chatbot_id, conversationId, text, bot.data, audioBase64);
          console.log("generateReply returned:", replyData?.reply?.substring(0, 50));

          await supabaseAdmin
            .from("qr_integrations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", integ.id);

          return new Response(JSON.stringify(replyData || { reply: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
  botData: any,
  audioBase64?: string
): Promise<{ reply: string | null; replyAudioBase64?: string | null } | null> {
  if (!botData) return null;

  // Run independent queries concurrently
  const [historyRes, kbRes, apisRes] = await Promise.all([
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
      .order("priority", { ascending: true })
  ]);

  const history = historyRes.data;
  const kb = kbRes.data;
  const apis = apisRes.data;

  if (!apis || apis.length === 0) {
    return { reply: "Nenhuma API de IA configurada no painel." };
  }

  const apiKey = apis[0].api_key;

  // Process Audio (Speech-to-Text) if received
  if (audioBase64) {
    try {
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/ogg' });
      const formData = new FormData();
      formData.append('file', blob, 'audio.ogg');
      formData.append('model', 'whisper-1');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      });
      if (whisperRes.ok) {
        const whisperData = await whisperRes.json();
        userContent = whisperData.text || "[Áudio Incompreensível]";
        console.log("Transcribed Audio:", userContent);
      } else {
        console.error("Whisper Error:", await whisperRes.text());
      }
    } catch (e) {
      console.error("Failed to transcribe audio", e);
    }
  }

  // Save the user's message asynchronously without waiting for it
  supabaseAdmin.from("messages").insert({
    conversation_id: conversationId, user_id: userId,
    role: "user", content: userContent,
  }).then();

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

      let replyAudioBase64 = null;

      // Text-to-Speech se estiver ativado
      if (botData.respond_with_audio) {
        try {
          const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
               'Authorization': `Bearer ${api.api_key}`,
               'Content-Type': 'application/json'
            },
            body: JSON.stringify({
               model: 'tts-1',
               input: content,
               voice: botData.audio_voice || 'alloy'
            })
          });
          if (ttsRes.ok) {
            const arrayBuffer = await ttsRes.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i += 10000) {
                binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 10000)));
            }
            replyAudioBase64 = btoa(binary);
          }
        } catch (e) {
          console.error("TTS error", e);
        }
      }

      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId, user_id: userId,
        role: "assistant", content, api_provider_id: api.id, model_used: model,
      });

      return { reply: content, replyAudioBase64 };
    } catch (e) {
      continue;
    }
  }
  return { reply: "Falha ao gerar resposta pela API." };
}
