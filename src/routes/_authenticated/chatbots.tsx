import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Bot, MessageSquare, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chatbots")({
  component: () => {
    const pathname = useRouterState({ select: s => s.location.pathname });
    // If a child route is active, just render <Outlet />
    if (pathname !== "/chatbots") return <Outlet />;
    return <ChatbotsList />;
  },
});

function ChatbotsList() {
  const qc = useQueryClient();
  const { data: bots } = useQuery({
    queryKey: ["chatbots"],
    queryFn: async () => (await supabase.from("chatbots").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("chatbots").insert({
        user_id: u.user!.id,
        name: "Novo Chatbot",
        system_prompt: "Você é um atendente da minha empresa. Seja educado e útil.",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Chatbot criado"); qc.invalidateQueries({ queryKey: ["chatbots"] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("chatbots").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["chatbots"] }); },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold">Chatbots</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie e configure seus bots.</p>
        </div>
        <Button onClick={() => create.mutate()} className="bg-[image:var(--gradient-neon)] text-primary-foreground border-0"><Plus className="w-4 h-4 mr-2" />Novo chatbot</Button>
      </div>
      {!bots || bots.length === 0 ? (
        <div className="surface rounded-2xl p-12 text-center">
          <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum chatbot ainda.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map(b => (
            <div key={b.id} className="surface rounded-2xl p-5 hover:border-primary/50 transition">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
              <h3 className="mt-3 font-display font-semibold">{b.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description || b.system_prompt}</p>
              <div className="mt-4 flex gap-2">
                <Link to="/chatbots/$id" params={{ id: b.id }} className="flex-1"><Button variant="outline" size="sm" className="w-full"><Settings className="w-3 h-3 mr-1" />Configurar</Button></Link>
                <Link to="/chat/$id" params={{ id: b.id }} className="flex-1"><Button size="sm" className="w-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"><MessageSquare className="w-3 h-3 mr-1" />Conversar</Button></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
