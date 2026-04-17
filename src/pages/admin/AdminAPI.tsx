import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code2, Plus, Trash2, Eye, EyeOff, Copy, CheckCircle,
  AlertCircle, Loader2, Globe, Key, Building2, BarChart3,
  RefreshCw, Webhook, Clock, Zap, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: "basic" | "professional" | "enterprise";
  active: boolean;
  created_at: string;
}

interface ApiKey {
  id: string;
  clinic_id: string;
  name: string;
  key_preview: string;
  environment: "live" | "test";
  plan: string;
  monthly_limit: number | null;
  usage_count: number;
  usage_reset_at: string;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
  clinics?: { name: string };
}

interface WebhookConfig {
  id: string;
  clinic_id: string;
  name: string;
  url: string;
  secret_preview: string;
  active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  last_status: string | null;
  created_at: string;
  clinics?: { name: string };
}

interface UsageLog {
  id: string;
  clinic_id: string;
  endpoint: string;
  status_code: number;
  exam_category: string | null;
  processing_ms: number | null;
  created_at: string;
  clinics?: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  basic:        "bg-gray-100 text-gray-700",
  professional: "bg-blue-100 text-blue-700",
  enterprise:   "bg-purple-100 text-purple-700",
};

const PLAN_LIMITS: Record<string, string> = {
  basic:        "100 análises/mês",
  professional: "500 análises/mês",
  enterprise:   "Ilimitado",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Gera API Key aleatória segura
function generateApiKey(env: "live" | "test"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const suffix = Array.from(arr).map(b => chars[b % chars.length]).join("");
  return `ovpro_${env}_${suffix}`;
}

// SHA256 via WebCrypto
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Component principal ──────────────────────────────────────────────────────

export default function AdminAPI() {
  const navigate = useNavigate();

  const [clinics,   setClinics]   = useState<Clinic[]>([]);
  const [apiKeys,   setApiKeys]   = useState<ApiKey[]>([]);
  const [webhooks,  setWebhooks]  = useState<WebhookConfig[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Dialogs
  const [newClinicOpen,  setNewClinicOpen]  = useState(false);
  const [newKeyOpen,     setNewKeyOpen]     = useState(false);
  const [newWebhookOpen, setNewWebhookOpen] = useState(false);
  const [newKeyResult,   setNewKeyResult]   = useState<string | null>(null);

  // Forms
  const [clinicForm, setClinicForm] = useState({ name: "", email: "", phone: "", plan: "basic" });
  const [keyForm,    setKeyForm]    = useState({ clinic_id: "", name: "", environment: "live", plan: "basic" });
  const [whForm,     setWhForm]     = useState({ clinic_id: "", name: "Webhook Principal", url: "" });
  const [saving,     setSaving]     = useState(false);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, k, w, u] = await Promise.all([
        supabase.from("clinics").select("*").order("created_at", { ascending: false }),
        supabase.from("api_keys").select("*, clinics(name)").order("created_at", { ascending: false }),
        supabase.from("webhook_configs").select("*, clinics(name)").order("created_at", { ascending: false }),
        supabase.from("api_usage").select("*, clinics(name)").order("created_at", { ascending: false }).limit(50),
      ]);
      if (c.data) setClinics(c.data as Clinic[]);
      if (k.data) setApiKeys(k.data as ApiKey[]);
      if (w.data) setWebhooks(w.data as WebhookConfig[]);
      if (u.data) setUsageLogs(u.data as UsageLog[]);
    } catch { toast.error("Erro ao carregar dados"); }
    finally { setLoading(false); }
  };

  // ── Criar clínica ───────────────────────────────────────────────────────────
  const handleCreateClinic = async () => {
    if (!clinicForm.name || !clinicForm.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("clinics").insert([clinicForm]);
      if (error) throw error;
      toast.success("Clínica criada!");
      setNewClinicOpen(false);
      setClinicForm({ name: "", email: "", phone: "", plan: "basic" });
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ── Criar API Key ───────────────────────────────────────────────────────────
  const handleCreateKey = async () => {
    if (!keyForm.clinic_id || !keyForm.name) {
      toast.error("Clínica e nome são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const rawKey = generateApiKey(keyForm.environment as "live" | "test");
      const keyHash = await sha256(rawKey);
      const keyPreview = `${rawKey.substring(0, 16)}...${rawKey.substring(rawKey.length - 4)}`;
      const plan = keyForm.plan;
      const monthly_limit = plan === "enterprise" ? null : plan === "professional" ? 500 : 100;

      const { error } = await supabase.from("api_keys").insert([{
        clinic_id: keyForm.clinic_id,
        name: keyForm.name,
        key_hash: keyHash,
        key_preview: keyPreview,
        environment: keyForm.environment,
        plan,
        monthly_limit,
        usage_reset_at: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1, 1
        ).toISOString(),
      }]);
      if (error) throw error;

      // Exibir a key completa UMA VEZ
      setNewKeyResult(rawKey);
      setKeyForm({ clinic_id: "", name: "", environment: "live", plan: "basic" });
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ── Criar webhook ───────────────────────────────────────────────────────────
  const handleCreateWebhook = async () => {
    if (!whForm.clinic_id || !whForm.url) {
      toast.error("Clínica e URL são obrigatórios");
      return;
    }
    if (!whForm.url.startsWith("https://")) {
      toast.error("URL deve começar com https://");
      return;
    }
    setSaving(true);
    try {
      // Gerar secret
      const rawSecret = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      const secretHash = await sha256(rawSecret);
      const secretPreview = rawSecret.substring(0, 8);

      const { error } = await supabase.from("webhook_configs").insert([{
        clinic_id: whForm.clinic_id,
        name: whForm.name,
        url: whForm.url,
        secret_hash: secretHash,
        secret_preview: secretPreview,
      }]);
      if (error) throw error;

      toast.success(`Webhook criado! Secret: whsec_${rawSecret} — salve agora, não será exibido novamente.`, {
        duration: 15000,
      });
      setNewWebhookOpen(false);
      setWhForm({ clinic_id: "", name: "Webhook Principal", url: "" });
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ── Revogar key ─────────────────────────────────────────────────────────────
  const handleRevokeKey = async (id: string) => {
    await supabase.from("api_keys").update({ active: false }).eq("id", id);
    toast.success("API Key revogada");
    loadAll();
  };

  // ── Reativar webhook ────────────────────────────────────────────────────────
  const handleToggleWebhook = async (id: string, active: boolean) => {
    await supabase.from("webhook_configs").update({ active: !active, failure_count: 0 }).eq("id", id);
    toast.success(!active ? "Webhook reativado" : "Webhook desativado");
    loadAll();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // ── Stats cards ─────────────────────────────────────────────────────────────
  const totalUsageMonth = usageLogs.filter(u =>
    new Date(u.created_at) > new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  ).length;

  const successRate = usageLogs.length > 0
    ? Math.round(usageLogs.filter(u => u.status_code === 200).length / usageLogs.length * 100)
    : 100;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Code2 className="w-8 h-8 text-primary" />
            API & Integrações
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie API Keys, webhooks e integrações com clínicas parceiras
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll}>
          <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Clínicas Ativas", value: clinics.filter(c => c.active).length, icon: Building2, color: "text-blue-600" },
          { label: "API Keys Ativas", value: apiKeys.filter(k => k.active).length, icon: Key, color: "text-green-600" },
          { label: "Análises este mês", value: totalUsageMonth, icon: Zap, color: "text-purple-600" },
          { label: "Taxa de Sucesso", value: `${successRate}%`, icon: CheckCircle, color: "text-emerald-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
                </div>
                <s.icon className={cn("w-8 h-8 opacity-20", s.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="clinics">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="clinics" className="gap-2">
            <Building2 className="w-4 h-4" /> Clínicas
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-2">
            <Key className="w-4 h-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="w-4 h-4" /> Webhooks
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Uso
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Clínicas ── */}
        <TabsContent value="clinics" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{clinics.length} clínicas cadastradas</p>
            <Button onClick={() => setNewClinicOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nova Clínica
            </Button>
          </div>

          <div className="space-y-3">
            {clinics.map(c => (
              <Card key={c.id} className={cn(!c.active && "opacity-60")}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{c.name}</span>
                        <Badge className={cn("text-xs", PLAN_COLORS[c.plan])}>
                          {c.plan.charAt(0).toUpperCase() + c.plan.slice(1)}
                        </Badge>
                        {!c.active && <Badge variant="destructive" className="text-xs">Inativa</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.email} · {PLAN_LIMITS[c.plan]}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{apiKeys.filter(k => k.clinic_id === c.id && k.active).length} keys</span>
                      <span>·</span>
                      <span>{usageLogs.filter(u => u.clinic_id === c.id).length} calls</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {clinics.length === 0 && (
              <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
                Nenhuma clínica cadastrada ainda.
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ── Tab API Keys ── */}
        <TabsContent value="keys" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{apiKeys.filter(k => k.active).length} keys ativas</p>
            <Button onClick={() => setNewKeyOpen(true)} disabled={clinics.length === 0}>
              <Plus className="w-4 h-4 mr-2" /> Gerar API Key
            </Button>
          </div>

          {/* Documentação rápida */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">Como usar a API</p>
              <code className="text-xs text-blue-800 block bg-blue-100 p-2 rounded">
                POST https://[projeto].supabase.co/functions/v1/api-analyze<br />
                x-api-key: ovpro_live_...<br />
                Content-Type: application/json
              </code>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {apiKeys.map(k => (
              <Card key={k.id} className={cn(!k.active && "opacity-60")}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", k.active ? "bg-green-50" : "bg-muted")}>
                      <Key className={cn("w-5 h-5", k.active ? "text-green-600" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{k.name}</span>
                        <Badge variant="outline" className="text-xs font-mono">{k.key_preview}</Badge>
                        <Badge className={cn("text-xs", PLAN_COLORS[k.plan])}>{k.plan}</Badge>
                        {k.environment === "test" && <Badge variant="secondary" className="text-xs">test</Badge>}
                        {!k.active && <Badge variant="destructive" className="text-xs">Revogada</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{k.clinics?.name}</span>
                        <span>·</span>
                        <span>{k.usage_count}{k.monthly_limit ? `/${k.monthly_limit}` : ""} análises</span>
                        {k.last_used_at && <span>· Último uso: {formatDate(k.last_used_at)}</span>}
                      </div>
                    </div>
                    {k.active && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs"
                        onClick={() => handleRevokeKey(k.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Revogar
                      </Button>
                    )}
                  </div>
                  {/* Barra de uso */}
                  {k.monthly_limit && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          k.usage_count / k.monthly_limit > 0.8 ? "bg-red-500" :
                          k.usage_count / k.monthly_limit > 0.5 ? "bg-yellow-500" : "bg-green-500"
                        )}
                        style={{ width: `${Math.min(100, (k.usage_count / k.monthly_limit) * 100)}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {apiKeys.length === 0 && (
              <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
                Nenhuma API Key criada ainda.
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ── Tab Webhooks ── */}
        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{webhooks.filter(w => w.active).length} webhooks ativos</p>
            <Button onClick={() => setNewWebhookOpen(true)} disabled={clinics.length === 0}>
              <Plus className="w-4 h-4 mr-2" /> Novo Webhook
            </Button>
          </div>

          <div className="space-y-3">
            {webhooks.map(w => (
              <Card key={w.id} className={cn(!w.active && "opacity-60")}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg",
                      w.active ? "bg-purple-50" : w.failure_count >= 3 ? "bg-red-50" : "bg-muted"
                    )}>
                      <Webhook className={cn("w-5 h-5",
                        w.active ? "text-purple-600" : w.failure_count >= 3 ? "text-red-600" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{w.name}</span>
                        {w.last_status === "success" && <Badge className="text-xs bg-green-100 text-green-700">✓ OK</Badge>}
                        {w.last_status === "failed" && <Badge variant="destructive" className="text-xs">Falhou</Badge>}
                        {w.failure_count >= 3 && !w.active && (
                          <Badge variant="destructive" className="text-xs">Desativado (3 falhas)</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {w.clinics?.name} · {w.url}
                      </p>
                      {w.last_triggered_at && (
                        <p className="text-xs text-muted-foreground">
                          Último disparo: {formatDate(w.last_triggered_at)}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs"
                      onClick={() => handleToggleWebhook(w.id, w.active)}>
                      {w.active
                        ? <><AlertCircle className="w-3.5 h-3.5 mr-1" /> Desativar</>
                        : <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Reativar</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {webhooks.length === 0 && (
              <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
                Nenhum webhook configurado.
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* ── Tab Uso ── */}
        <TabsContent value="usage" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Últimas 50 chamadas à API</p>

          {/* Uso por clínica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clinics.map(c => {
              const clinicLogs = usageLogs.filter(u => u.clinic_id === c.id);
              const ok = clinicLogs.filter(u => u.status_code === 200).length;
              return (
                <Card key={c.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge className={cn("text-xs", PLAN_COLORS[c.plan])}>{c.plan}</Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{clinicLogs.length} chamadas</span>
                      <span className="text-green-600">{ok} sucesso</span>
                      <span className="text-red-500">{clinicLogs.length - ok} erro</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Log detalhado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Log de Chamadas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {usageLogs.map(u => (
                  <div key={u.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                    <span className={cn(
                      "font-bold w-8 text-center rounded px-1",
                      u.status_code === 200 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {u.status_code}
                    </span>
                    <span className="flex-1 font-mono text-muted-foreground truncate">{u.endpoint}</span>
                    <span className="text-muted-foreground">{u.clinics?.name}</span>
                    {u.processing_ms && <span className="text-muted-foreground">{u.processing_ms}ms</span>}
                    <span className="text-muted-foreground">{formatDate(u.created_at)}</span>
                  </div>
                ))}
                {usageLogs.length === 0 && (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    Nenhuma chamada registrada ainda.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog Nova Clínica ── */}
      <Dialog open={newClinicOpen} onOpenChange={setNewClinicOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Clínica Parceira</DialogTitle>
            <DialogDescription>Cadastre a clínica para gerar API Keys</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nome da Clínica *</Label>
              <Input placeholder="Ex: Clínica Odonto São Paulo" value={clinicForm.name}
                onChange={e => setClinicForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="contato@clinica.com.br" value={clinicForm.email}
                onChange={e => setClinicForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input placeholder="(11) 99999-9999" value={clinicForm.phone}
                onChange={e => setClinicForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Plano</Label>
              <select
                value={clinicForm.plan}
                onChange={e => setClinicForm(p => ({ ...p, plan: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="basic">Básico — 100 análises/mês</option>
                <option value="professional">Profissional — 500 análises/mês</option>
                <option value="enterprise">Enterprise — Ilimitado</option>
              </select>
            </div>
            <Button className="w-full" onClick={handleCreateClinic} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Clínica
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Nova API Key ── */}
      <Dialog open={newKeyOpen} onOpenChange={v => { setNewKeyOpen(v); if (!v) setNewKeyResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar API Key</DialogTitle>
            <DialogDescription>A key completa será exibida apenas uma vez</DialogDescription>
          </DialogHeader>

          {newKeyResult ? (
            <div className="space-y-4 mt-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> API Key gerada com sucesso!
                </p>
                <p className="text-xs text-green-600">Copie agora — esta é a única vez que será exibida:</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-white border rounded p-2 font-mono break-all">
                    {newKeyResult}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(newKeyResult);
                    toast.success("Copiado!");
                  }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setNewKeyOpen(false); setNewKeyResult(null); }}>
                Confirmar — já copiei
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Clínica *</Label>
                <select
                  value={keyForm.clinic_id}
                  onChange={e => setKeyForm(p => ({ ...p, clinic_id: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecionar clínica...</option>
                  {clinics.filter(c => c.active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Nome da Key *</Label>
                <Input placeholder="Ex: Integração Principal" value={keyForm.name}
                  onChange={e => setKeyForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ambiente</Label>
                  <select
                    value={keyForm.environment}
                    onChange={e => setKeyForm(p => ({ ...p, environment: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="live">Live (produção)</option>
                    <option value="test">Test (sandbox)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Plano</Label>
                  <select
                    value={keyForm.plan}
                    onChange={e => setKeyForm(p => ({ ...p, plan: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="basic">Básico</option>
                    <option value="professional">Profissional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <Button className="w-full" onClick={handleCreateKey} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                Gerar API Key
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog Novo Webhook ── */}
      <Dialog open={newWebhookOpen} onOpenChange={setNewWebhookOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Webhook</DialogTitle>
            <DialogDescription>OdontoVision enviará o laudo para esta URL após cada análise</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Clínica *</Label>
              <select
                value={whForm.clinic_id}
                onChange={e => setWhForm(p => ({ ...p, clinic_id: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecionar clínica...</option>
                {clinics.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={whForm.name}
                onChange={e => setWhForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>URL do Webhook * (deve ser HTTPS)</Label>
              <Input placeholder="https://sistema.clinica.com.br/webhook/odontovision"
                value={whForm.url}
                onChange={e => setWhForm(p => ({ ...p, url: e.target.value }))} />
            </div>
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Payload que será enviado:</p>
              <code className="block">{`{ "event": "analysis.completed", "data": { "id", "patient", "analysis", "review_score" } }`}</code>
              <p className="mt-1">Header: <code>x-odontovision-signature: sha256=...</code></p>
            </div>
            <Button className="w-full" onClick={handleCreateWebhook} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Webhook className="w-4 h-4 mr-2" />}
              Criar Webhook
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
