import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot, MessageSquare, KeyRound, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}><Icon className="w-4 h-4" /></div>
      </div>
      <div className="mt-3 text-3xl font-display font-semibold">{value}</div>
    </div>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [bots, msgs, convs, apis] = await Promise.all([
        supabase.from("chatbots").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("tokens_used", { count: "exact" }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("api_providers").select("id, is_active"),
      ]);
      const totalTokens = (msgs.data ?? []).reduce((s: number, m: any) => s + (m.tokens_used ?? 0), 0);
      return {
        chatbots: bots.count ?? 0,
        messages: msgs.count ?? 0,
        conversations: convs.count ?? 0,
        apis: apis.data?.length ?? 0,
        activeApis: (apis.data ?? []).filter((a: any) => a.is_active).length,
        tokens: totalTokens,
      };
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral da sua plataforma.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bot} label="Chatbots" value={data?.chatbots ?? "—"} accent="bg-primary/15 text-primary" />
        <StatCard icon={MessageSquare} label="Mensagens" value={data?.messages ?? "—"} accent="bg-neon/15 text-neon" />
        <StatCard icon={Zap} label="Tokens usados" value={(data?.tokens ?? 0).toLocaleString("pt-BR")} accent="bg-warning/15 text-warning" />
        <StatCard icon={KeyRound} label="APIs ativas" value={`${data?.activeApis ?? 0}/${data?.apis ?? 0}`} accent="bg-success/15 text-success" />
      </div>

      <div className="mt-8 surface rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Começar</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground list-decimal list-inside">
          <li>Cadastre pelo menos uma API em <span className="text-foreground font-medium">APIs</span> (OpenAI, Gemini, Claude...)</li>
          <li>Crie seu primeiro chatbot em <span className="text-foreground font-medium">Chatbots</span></li>
          <li>Adicione conhecimento (opcional) e teste em <span className="text-foreground font-medium">Conversar</span></li>
        </ol>
      </div>
    </div>
  );
}
