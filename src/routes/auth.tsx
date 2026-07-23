import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bot } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-[image:var(--gradient-neon)] flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-xl">AI ChatBot Pro</span>
        </Link>
        <div className="surface rounded-2xl p-6 neon-glow">
          <h2 className="text-2xl font-semibold text-center mb-6">Acesso Restrito</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[image:var(--gradient-neon)] text-primary-foreground border-0 mt-4">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
