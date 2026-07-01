import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Zap, Shield, Layers, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[image:var(--gradient-neon)] flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg">AI ChatBot Pro</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost">Entrar</Button></Link>
            <Link to="/auth"><Button className="bg-[image:var(--gradient-neon)] text-primary-foreground border-0">Começar grátis</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/40 text-xs text-muted-foreground mb-8">
          <Sparkles className="w-3 h-3 text-neon" /> Chatbots com IA · Multi-API · 24/7
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] max-w-4xl mx-auto">
          Crie chatbots inteligentes com <span className="gradient-text">qualquer IA</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Conecte OpenAI, Gemini, Claude, DeepSeek, Groq e mais. Treine com seus documentos.
          Publique em seu site ou WhatsApp em minutos.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth"><Button size="lg" className="bg-[image:var(--gradient-neon)] text-primary-foreground border-0 neon-glow">Criar meu chatbot</Button></Link>
          <Link to="/auth"><Button size="lg" variant="outline">Ver demonstração</Button></Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Layers, title: "Multi-API com Failover", desc: "Cadastre APIs ilimitadas. Rotação automática por prioridade e balanceamento." },
            { icon: Bot, title: "Treinamento Fácil", desc: "Envie PDF, TXT, sites e FAQ. O bot responde com base no seu conhecimento." },
            { icon: MessageSquare, title: "Widget Embutível", desc: "Cole em qualquer site. Personalize cor, avatar, mensagem inicial e mais." },
            { icon: Zap, title: "Streaming em Tempo Real", desc: "Respostas fluidas estilo ChatGPT com controle total de tokens e custo." },
            { icon: Shield, title: "Seguro por Padrão", desc: "Suas chaves criptografadas. RLS ativo. Cada usuário só vê seus dados." },
            { icon: Sparkles, title: "8 Personalidades", desc: "Profissional, vendedor, suporte, consultor — ou crie a sua." },
          ].map((f) => (
            <div key={f.title} className="surface rounded-2xl p-6 hover:border-primary/50 transition">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © 2026 AI ChatBot Pro
      </footer>
    </div>
  );
}
