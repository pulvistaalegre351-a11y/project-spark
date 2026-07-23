import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PERSONALITIES } from "@/lib/personalities";
import { ArrowLeft, Trash2, Plus, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chatbots/$id")({ component: EditBot });

function EditBot() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);

  const { data: bot } = useQuery({
    queryKey: ["chatbot", id],
    queryFn: async () => (await supabase.from("chatbots").select("*").eq("id", id).single()).data,
  });
  useEffect(() => { if (bot) setForm(bot); }, [bot]);

  const save = useMutation({
    mutationFn: async () => {
      const { user_id, id: _, created_at, updated_at, ...patch } = form;
      const { error } = await supabase.from("chatbots").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["chatbot", id] }); qc.invalidateQueries({ queryKey: ["chatbots"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Knowledge base
  const { data: kb } = useQuery({
    queryKey: ["kb", id],
    queryFn: async () => (await supabase.from("knowledge_base").select("*").eq("chatbot_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const [kbTitle, setKbTitle] = useState("");
  const [kbContent, setKbContent] = useState("");
  const addKb = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("knowledge_base").insert({
        user_id: u.user!.id, chatbot_id: id, title: kbTitle, content: kbContent, source_type: "text",
      });
      if (error) throw error;
    },
    onSuccess: () => { setKbTitle(""); setKbContent(""); toast.success("Conhecimento adicionado"); qc.invalidateQueries({ queryKey: ["kb", id] }); },
  });
  const delKb = useMutation({
    mutationFn: async (kid: string) => { await supabase.from("knowledge_base").delete().eq("id", kid); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb", id] }),
  });

  // WhatsApp integrations
  const { data: waList } = useQuery({
    queryKey: ["wa", id],
    queryFn: async () => (await supabase.from("whatsapp_integrations").select("*").eq("chatbot_id", id).order("created_at", { ascending: false })).data ?? [],
  });
  const [wa, setWa] = useState({ display_name: "WhatsApp", phone_number_id: "", waba_id: "", access_token: "", verify_token: "" });
  const addWa = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("whatsapp_integrations").insert({
        user_id: u.user!.id, chatbot_id: id, ...wa,
      });
      if (error) throw error;
    },
    onSuccess: () => { setWa({ display_name: "WhatsApp", phone_number_id: "", waba_id: "", access_token: "", verify_token: "" }); toast.success("Integração adicionada"); qc.invalidateQueries({ queryKey: ["wa", id] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delWa = useMutation({
    mutationFn: async (wid: string) => { await supabase.from("whatsapp_integrations").delete().eq("id", wid); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa", id] }),
  });
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/whatsapp/webhook` : "";
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copiado"); };


  if (!form) return <div className="p-8">Carregando…</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link to="/chatbots" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"><ArrowLeft className="w-3 h-3" />Voltar</Link>
      <h1 className="font-display text-3xl font-semibold mb-6">{form.name}</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="knowledge">Conhecimento</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp Cloud</TabsTrigger>
          <TabsTrigger value="whatsapp-qr">WhatsApp QR</TabsTrigger>
          <TabsTrigger value="widget">Widget</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Prompt Mestre (System)</Label><Textarea rows={10} value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })} /></div>
          <div><Label>Personalidade</Label>
            <Select value={form.personality} onValueChange={v => {
              const p = PERSONALITIES.find(x => x.value === v);
              setForm({ ...form, personality: v, system_prompt: p && p.prompt ? p.prompt : form.system_prompt });
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PERSONALITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Texto para Desativar IA</Label>
            <Input placeholder="Ex: desativar ia" value={form.pause_keyword ?? ""} onChange={e => setForm({ ...form, pause_keyword: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">Quando alguém digitar esse texto, o robô será pausado e não responderá mais.</p>
          </div>
          <div>
            <Label>Texto para Ativar IA</Label>
            <Input placeholder="Ex: ativar ia" value={form.resume_keyword ?? ""} onChange={e => setForm({ ...form, resume_keyword: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">Quando alguém digitar esse texto, o robô voltará a responder automaticamente.</p>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6 mt-4">
          <div><Label>Temperatura: {form.temperature}</Label><Slider value={[Number(form.temperature)]} min={0} max={2} step={0.1} onValueChange={([v]) => setForm({ ...form, temperature: v })} /></div>
          <div><Label>Top P: {form.top_p}</Label><Slider value={[Number(form.top_p)]} min={0} max={1} step={0.05} onValueChange={([v]) => setForm({ ...form, top_p: v })} /></div>
          <div><Label>Frequency Penalty: {form.frequency_penalty}</Label><Slider value={[Number(form.frequency_penalty)]} min={-2} max={2} step={0.1} onValueChange={([v]) => setForm({ ...form, frequency_penalty: v })} /></div>
          <div><Label>Presence Penalty: {form.presence_penalty}</Label><Slider value={[Number(form.presence_penalty)]} min={-2} max={2} step={0.1} onValueChange={([v]) => setForm({ ...form, presence_penalty: v })} /></div>
          <div><Label>Max Tokens</Label><Input type="number" value={form.max_tokens} onChange={e => setForm({ ...form, max_tokens: parseInt(e.target.value) || 2048 })} /></div>
          <div><Label>Memória (últimas mensagens)</Label><Input type="number" value={form.memory_max_messages} onChange={e => setForm({ ...form, memory_max_messages: parseInt(e.target.value) || 20 })} /></div>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4 mt-4">
          <div className="surface rounded-xl p-4 space-y-2">
            <Label>Novo item</Label>
            <Input placeholder="Título" value={kbTitle} onChange={e => setKbTitle(e.target.value)} />
            <Textarea rows={6} placeholder="Cole texto, FAQ, informações da empresa..." value={kbContent} onChange={e => setKbContent(e.target.value)} />
            <Button onClick={() => addKb.mutate()} disabled={!kbTitle || !kbContent} className="bg-[image:var(--gradient-neon)] text-primary-foreground border-0"><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
          </div>
          <div className="space-y-2">
            {(kb ?? []).map(k => (
              <div key={k.id} className="surface rounded-lg p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{k.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{k.content}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => delKb.mutate(k.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <div className="surface rounded-xl p-4 space-y-3 text-sm">
            <p className="font-medium">Como conectar (WhatsApp Cloud API oficial da Meta):</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
              <li>Acesse <a className="text-primary underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com</a> e crie um App do tipo "Business".</li>
              <li>Adicione o produto <b>WhatsApp</b>. A Meta te dá um número de teste grátis.</li>
              <li>Copie o <b>Phone Number ID</b>, o <b>WhatsApp Business Account ID</b> e o <b>Access Token</b>.</li>
              <li>Invente um <b>Verify Token</b> (qualquer texto secreto) e cole abaixo.</li>
              <li>No painel Meta, em Webhooks, cole a URL e o Verify Token, assine em <b>messages</b>.</li>
            </ol>
            <div>
              <Label className="text-xs">URL do Webhook (cole no painel Meta)</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={() => copy(webhookUrl)}><Copy className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>

          <div className="surface rounded-xl p-4 space-y-2">
            <Label>Nova integração</Label>
            <Input placeholder="Nome (ex: Atendimento)" value={wa.display_name} onChange={e => setWa({ ...wa, display_name: e.target.value })} />
            <Input placeholder="Phone Number ID" value={wa.phone_number_id} onChange={e => setWa({ ...wa, phone_number_id: e.target.value })} />
            <Input placeholder="WhatsApp Business Account ID (opcional)" value={wa.waba_id} onChange={e => setWa({ ...wa, waba_id: e.target.value })} />
            <Input placeholder="Access Token (permanente recomendado)" type="password" value={wa.access_token} onChange={e => setWa({ ...wa, access_token: e.target.value })} />
            <Input placeholder="Verify Token (você inventa)" value={wa.verify_token} onChange={e => setWa({ ...wa, verify_token: e.target.value })} />
            <Button onClick={() => addWa.mutate()} disabled={!wa.phone_number_id || !wa.access_token || !wa.verify_token} className="bg-[image:var(--gradient-neon)] text-primary-foreground border-0"><Plus className="w-3 h-3 mr-1" />Conectar</Button>
          </div>

          <div className="space-y-2">
            {(waList ?? []).map(w => (
              <div key={w.id} className="surface rounded-lg p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{w.display_name}</div>
                  <div className="text-xs text-muted-foreground">Phone ID: {w.phone_number_id} · {w.is_active ? "Ativo" : "Inativo"}</div>
                  {w.last_error && <div className="text-xs text-destructive mt-1">{w.last_error}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => delWa.mutate(w.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="whatsapp-qr" className="space-y-4 mt-4">
          <div className="surface rounded-xl p-4 space-y-3 text-sm">
            <p className="font-medium">Motor de WhatsApp via QR Code</p>
            <p className="text-xs text-muted-foreground">O sistema cria uma sessão única para o seu robô. Clique no botão, espere o QR Code aparecer, e escaneie com o seu celular.</p>
          </div>
          <div className="surface rounded-xl p-4 flex flex-col items-center justify-center space-y-4">
            <Button onClick={async () => {
              const loadingToast = toast.loading("Conectando ao motor...");
              try {
                // In production, this URL should be the Koyeb/Render URL from env vars
                const engineUrl = import.meta.env.VITE_QR_ENGINE_URL || "http://localhost:3001";
                const { data: u } = await supabase.auth.getUser();
                const sessionName = `bot-${id}`;
                
                // Ensure integration exists in Supabase
                await (supabase as any).from("qr_integrations").upsert({
                  user_id: u.user!.id,
                  chatbot_id: id,
                  session_name: sessionName
                }, { onConflict: "session_name" });
                
                await fetch(`${engineUrl}/session/start`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId: sessionName })
                });
                
                toast.dismiss(loadingToast);
                toast.success("Solicitação enviada. Aguarde o QR Code...");
              } catch (e: any) {
                toast.dismiss(loadingToast);
                toast.error("Falha ao contatar o motor. Ele está ligado?");
              }
            }} className="bg-[image:var(--gradient-neon)] text-primary-foreground border-0">Iniciar / Atualizar QR Code</Button>
          </div>

          <WaQrStatus chatbotId={id} />
        </TabsContent>


        <TabsContent value="widget" className="space-y-4 mt-4">
          <div><Label>Cor do widget</Label><Input type="color" value={form.widget_color} onChange={e => setForm({ ...form, widget_color: e.target.value })} className="w-24 h-10" /></div>
          <div><Label>Mensagem inicial</Label><Input value={form.widget_greeting ?? ""} onChange={e => setForm({ ...form, widget_greeting: e.target.value })} /></div>
          <div className="surface rounded-xl p-4">
            <Label>Código de incorporação</Label>
            <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto"><code>{`<script>window.CHATBOT_ID="${form.id}"</script>\n<script src="https://seu-dominio/widget.js" async></script>`}</code></pre>
            <p className="text-xs text-muted-foreground mt-2">Widget completo em breve.</p>
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="mt-6 bg-[image:var(--gradient-neon)] text-primary-foreground border-0">Salvar alterações</Button>
    </div>
  );
}

function WaQrStatus({ chatbotId }: { chatbotId: string }) {
  const sessionName = `bot-${chatbotId}`;
  
  const { data: statusData, refetch } = useQuery({
    queryKey: ["qr_status", sessionName],
    queryFn: async () => {
      const { data } = await (supabase as any).from("qr_integrations").select("*").eq("session_name", sessionName).maybeSingle();
      return data;
    },
    refetchInterval: 3000 // Poll every 3s
  });

  if (!statusData) return <div className="text-sm text-muted-foreground text-center">Nenhuma sessão iniciada.</div>;

  return (
    <div className="surface rounded-xl p-4 flex flex-col items-center space-y-4">
      <div className="text-sm font-medium">Status: <span className={statusData.status === 'connected' ? 'text-green-500' : 'text-yellow-500'}>{statusData.status}</span></div>
      
      {statusData.status === 'qr_ready' && statusData.qr_code && (
         <div className="bg-white p-4 rounded-lg">
           {/* Display QR code if we get the base64 string from the engine */}
           <img src={statusData.qr_code} alt="WhatsApp QR Code" className="w-64 h-64" />
         </div>
      )}

      {statusData.status === 'connected' && (
        <div className="text-green-500 flex flex-col items-center">
          <p>WhatsApp conectado com sucesso!</p>
          <p className="text-sm font-semibold mt-1">{statusData.display_name !== 'WhatsApp QR' ? statusData.display_name : ''}</p>
          <p className="text-xs text-muted-foreground mt-2">Última mensagem: {statusData.last_message_at ? new Date(statusData.last_message_at).toLocaleString() : 'Nenhuma'}</p>
        </div>
      )}
    </div>
  );
}

