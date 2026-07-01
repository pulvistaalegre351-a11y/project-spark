import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: () => {
    const pathname = useRouterState({ select: s => s.location.pathname });
    if (pathname !== "/chat") return <Outlet />;
    return <ChatIndex />;
  },
});

function ChatIndex() {
  const { data: bots } = useQuery({
    queryKey: ["chatbots"],
    queryFn: async () => (await supabase.from("chatbots").select("*").order("created_at")).data ?? [],
  });
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-2">Conversar</h1>
      <p className="text-muted-foreground text-sm mb-8">Escolha um chatbot para iniciar uma conversa.</p>
      {!bots || bots.length === 0 ? (
        <div className="surface rounded-2xl p-12 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Crie um chatbot primeiro.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {bots.map(b => (
            <Link key={b.id} to="/chat/$id" params={{ id: b.id }} className="surface rounded-xl p-5 hover:border-primary/50 flex items-center gap-4 transition">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
              <div className="min-w-0">
                <div className="font-semibold">{b.name}</div>
                <div className="text-xs text-muted-foreground truncate">{b.description || "Conversar agora"}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
