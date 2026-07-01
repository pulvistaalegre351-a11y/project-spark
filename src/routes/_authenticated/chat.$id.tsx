import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendChatMessage } from "@/lib/chat.functions";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Plus, Bot, User, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$id")({ component: ChatPage });

function ChatPage() {
  const { id: chatbotId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const send = useServerFn(sendChatMessage);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: bot } = useQuery({
    queryKey: ["chatbot", chatbotId],
    queryFn: async () => (await supabase.from("chatbots").select("*").eq("id", chatbotId).single()).data,
  });

  const { data: conversations } = useQuery({
    queryKey: ["conversations", chatbotId],
    queryFn: async () => (await supabase.from("conversations").select("*").eq("chatbot_id", chatbotId).order("updated_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (!activeConv && conversations && conversations.length > 0) setActiveConv(conversations[0].id);
  }, [conversations, activeConv]);

  const { data: messages } = useQuery({
    queryKey: ["messages", activeConv],
    enabled: !!activeConv,
    queryFn: async () => (await supabase.from("messages").select("*").eq("conversation_id", activeConv!).order("created_at")).data ?? [],
  });

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  const newConv = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("conversations").insert({
        chatbot_id: chatbotId, user_id: u.user!.id, title: "Nova conversa",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { setActiveConv(data.id); qc.invalidateQueries({ queryKey: ["conversations", chatbotId] }); },
  });

  const delConv = useMutation({
    mutationFn: async (cid: string) => { await supabase.from("conversations").delete().eq("id", cid); },
    onSuccess: () => { setActiveConv(null); qc.invalidateQueries({ queryKey: ["conversations", chatbotId] }); },
  });

  const sendMsg = useMutation({
    mutationFn: async () => {
      let convId = activeConv;
      if (!convId) {
        const c = await newConv.mutateAsync();
        convId = c.id;
      }
      const content = input.trim();
      setInput("");
      // optimistic invalidate to show user msg after server saves
      const res = await send({ data: { conversationId: convId!, chatbotId, content } });
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", activeConv] });
      qc.invalidateQueries({ queryKey: ["conversations", chatbotId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao enviar"),
  });

  return (
    <div className="h-screen flex">
      {/* Sidebar de conversas */}
      <div className="w-64 border-r border-border/50 flex flex-col bg-sidebar/40">
        <div className="p-3 border-b border-border/50">
          <Link to="/chatbots" className="text-xs text-muted-foreground inline-flex items-center gap-1 mb-2"><ArrowLeft className="w-3 h-3" />Chatbots</Link>
          <div className="font-display font-semibold truncate">{bot?.name}</div>
          <Button size="sm" className="w-full mt-3 bg-[image:var(--gradient-neon)] text-primary-foreground border-0" onClick={() => newConv.mutate()}><Plus className="w-3 h-3 mr-1" />Nova conversa</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(conversations ?? []).map(c => (
            <div key={c.id} className={`group px-3 py-2 rounded-lg text-sm cursor-pointer flex items-center justify-between ${activeConv === c.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-card/60"}`} onClick={() => setActiveConv(c.id)}>
              <span className="truncate">{c.title}</span>
              <button onClick={(e) => { e.stopPropagation(); delConv.mutate(c.id); }} className="opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {!messages || messages.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[image:var(--gradient-neon)] flex items-center justify-center mb-4"><Bot className="w-8 h-8 text-primary-foreground" /></div>
                <h2 className="font-display text-2xl font-semibold">Comece a conversar</h2>
                <p className="text-muted-foreground text-sm mt-2">{bot?.widget_greeting || "Envie uma mensagem para começar."}</p>
              </div>
            ) : messages.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-neon/15 text-neon" : "bg-primary/15 text-primary"}`}>
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary/15 border border-primary/30" : "surface"}`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}
            {sendMsg.isPending && <div className="text-xs text-muted-foreground pl-11">gerando resposta…</div>}
          </div>
        </div>

        <div className="border-t border-border/50 p-4">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="min-h-[52px] max-h-40 resize-none"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim() && !sendMsg.isPending) sendMsg.mutate(); }
              }}
            />
            <Button disabled={!input.trim() || sendMsg.isPending} onClick={() => sendMsg.mutate()} className="bg-[image:var(--gradient-neon)] text-primary-foreground border-0 h-[52px]"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
