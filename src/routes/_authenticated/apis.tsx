import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, KeyRound } from "lucide-react";
import { PROVIDER_PRESETS } from "@/lib/personalities";

export const Route = createFileRoute("/_authenticated/apis")({ component: ApisPage });

function ApisPage() {
  const qc = useQueryClient();
  const { data: apis } = useQuery({
    queryKey: ["api_providers"],
    queryFn: async () => (await supabase.from("api_providers").select("*").order("priority")).data ?? [],
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(defaultForm());

  function defaultForm() {
    return { name: "", company: "", provider_type: "openai_compatible", api_key: "", endpoint: "", model: "", daily_limit: null, monthly_limit: null, priority: 100, is_active: true };
  }

  function openNew() { setEditing(null); setForm(defaultForm()); setOpen(true); }
  function openEdit(api: any) { setEditing(api); setForm({ ...api }); setOpen(true); }

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const payload = { ...form, user_id: u.user!.id };
      if (editing) {
        const { error } = await supabase.from("api_providers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("api_providers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("API salva"); setOpen(false); qc.invalidateQueries({ queryKey: ["api_providers"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("api_providers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("API removida"); qc.invalidateQueries({ queryKey: ["api_providers"] }); },
  });

  function applyPreset(type: string) {
    const p = PROVIDER_PRESETS.find(x => x.value === type);
    if (!p) return;
    setForm((f: any) => ({ ...f, provider_type: type, endpoint: p.endpoint || f.endpoint, model: p.defaultModel || f.model, company: p.label }));
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold">APIs de IA</h1>
          <p className="text-muted-foreground text-sm mt-1">Cadastre chaves de OpenAI, Gemini, Claude e outros. Rotação por prioridade (menor = maior prioridade).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-[image:var(--gradient-neon)] text-primary-foreground border-0"><Plus className="w-4 h-4 mr-2" />Nova API</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar API" : "Nova API"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Provedor</Label>
                <Select value={form.provider_type} onValueChange={applyPreset}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROVIDER_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="OpenAI Principal" /></div>
              <div><Label>Empresa</Label><Input value={form.company ?? ""} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
              <div className="col-span-2"><Label>Endpoint</Label><Input value={form.endpoint} onChange={e => setForm({ ...form, endpoint: e.target.value })} placeholder="https://api.openai.com/v1/chat/completions" /></div>
              <div className="col-span-2"><Label>API Key</Label><Input type="password" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} /></div>
              <div><Label>Modelo</Label><Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="gpt-4o-mini" /></div>
              <div><Label>Prioridade</Label><Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 100 })} /></div>
              <div><Label>Limite diário (tokens)</Label><Input type="number" value={form.daily_limit ?? ""} onChange={e => setForm({ ...form, daily_limit: e.target.value ? parseInt(e.target.value) : null })} /></div>
              <div><Label>Limite mensal</Label><Input type="number" value={form.monthly_limit ?? ""} onChange={e => setForm({ ...form, monthly_limit: e.target.value ? parseInt(e.target.value) : null })} /></div>
              <div className="col-span-2 flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Ativa</Label></div>
            </div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="mt-4 bg-[image:var(--gradient-neon)] text-primary-foreground border-0">Salvar</Button>
          </DialogContent>
        </Dialog>
      </div>

      {!apis || apis.length === 0 ? (
        <div className="surface rounded-2xl p-12 text-center">
          <KeyRound className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma API cadastrada ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {apis.map(api => (
            <div key={api.id} className="surface rounded-xl p-5 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{api.name}</span>
                  <span className="text-xs text-muted-foreground">· {api.company || api.provider_type}</span>
                  {api.is_active ? <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success">Ativa</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Inativa</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{api.model} · prioridade {api.priority} · {(api.tokens_used_month ?? 0).toLocaleString("pt-BR")} tokens/mês</div>
                {api.last_error && <div className="text-xs text-destructive mt-1 truncate">⚠ {api.last_error}</div>}
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => openEdit(api)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del.mutate(api.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
