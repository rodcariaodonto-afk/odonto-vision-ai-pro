import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Shield, Download, FileSearch, Trash2, FileCheck2, UserCheck, ScrollText, Settings2, AlertTriangle, RefreshCw,
} from "lucide-react";

type Overview = {
  lastExport?: { created_at: string; status: string; scope: string };
  openDsr: number;
  pendingDeletions: number;
  criticalEvents30d: number;
  policy: any;
  counts: { cases: number; cephalo: number; chats: number; supports: number; admins: number };
};

export default function AdminGovernance() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Governança de Dados</h1>
          <p className="text-muted-foreground mt-1">
            Conformidade clínica, retenção, auditoria e direitos dos titulares.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><Shield className="w-4 h-4 mr-1" />Visão geral</TabsTrigger>
          <TabsTrigger value="exports"><Download className="w-4 h-4 mr-1" />Exportações</TabsTrigger>
          <TabsTrigger value="audit"><FileSearch className="w-4 h-4 mr-1" />Auditoria</TabsTrigger>
          <TabsTrigger value="retention"><Trash2 className="w-4 h-4 mr-1" />Retenção</TabsTrigger>
          <TabsTrigger value="compliance"><FileCheck2 className="w-4 h-4 mr-1" />Conformidade</TabsTrigger>
          <TabsTrigger value="dsr"><UserCheck className="w-4 h-4 mr-1" />Titulares</TabsTrigger>
          <TabsTrigger value="consents"><ScrollText className="w-4 h-4 mr-1" />Consentimentos</TabsTrigger>
          <TabsTrigger value="policies"><Settings2 className="w-4 h-4 mr-1" />Políticas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="exports"><ExportsTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
        <TabsContent value="retention"><RetentionTab /></TabsContent>
        <TabsContent value="compliance"><ComplianceTab /></TabsContent>
        <TabsContent value="dsr"><DsrTab /></TabsContent>
        <TabsContent value="consents"><ConsentsTab /></TabsContent>
        <TabsContent value="policies"><PoliciesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- OVERVIEW ---------- */
function OverviewTab() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const [exp, dsr, del, crit, policy, cases, ceph, chats, supports, admins] = await Promise.all([
      supabase.from("data_exports").select("created_at,status,scope").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("data_subject_requests").select("id", { count: "exact", head: true }).in("status", ["open","in_progress"]),
      supabase.from("deletion_queue").select("id", { count: "exact", head: true }).in("status", ["pending","confirmed"]),
      supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("severity","critical").gte("created_at", since30),
      supabase.from("retention_policies").select("*").eq("singleton", true).maybeSingle(),
      supabase.from("cases").select("id", { count: "exact", head: true }),
      supabase.from("cephalometric_analyses").select("id", { count: "exact", head: true }),
      supabase.from("chat_conversations").select("id", { count: "exact", head: true }),
      supabase.from("support_chats").select("id", { count: "exact", head: true }),
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role","admin"),
    ]);
    setData({
      lastExport: exp.data ?? undefined,
      openDsr: dsr.count ?? 0,
      pendingDeletions: del.count ?? 0,
      criticalEvents30d: crit.count ?? 0,
      policy: policy.data,
      counts: {
        cases: cases.count ?? 0,
        cephalo: ceph.count ?? 0,
        chats: chats.count ?? 0,
        supports: supports.count ?? 0,
        admins: admins.count ?? 0,
      },
    });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading || !data) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  const cards = [
    { title: "Última exportação", value: data.lastExport ? new Date(data.lastExport.created_at).toLocaleString("pt-BR") : "Nenhuma" },
    { title: "Pedidos de titulares abertos", value: String(data.openDsr) },
    { title: "Exclusões pendentes", value: String(data.pendingDeletions) },
    { title: "Eventos críticos (30d)", value: String(data.criticalEvents30d) },
    { title: "Casos clínicos", value: String(data.counts.cases) },
    { title: "Análises de cefalometria", value: String(data.counts.cephalo) },
    { title: "Conversas de suporte", value: String(data.counts.supports) },
    { title: "Conversas de IA", value: String(data.counts.chats) },
    { title: "Administradores", value: String(data.counts.admins) },
    { title: "Retenção pós-cancelamento", value: `${data.policy?.case_retention_days ?? "—"} dias` },
    { title: "Expiração de exportações", value: `${data.policy?.export_expiration_days ?? "—"} dias` },
    { title: "Logging de acesso clínico", value: data.policy?.clinical_access_logging ? "Ativo" : "Inativo" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Atualizar</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{c.title}</div>
              <div className="text-xl font-semibold mt-1 truncate">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- EXPORTS ---------- */
function ExportsTab() {
  const [scope, setScope] = useState<"user"|"account"|"case">("user");
  const [userId, setUserId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("data_exports").select("*").order("created_at", { ascending: false }).limit(50);
    setList(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    if (!userId) { toast.error("Informe o ID do usuário"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("governance-export", {
        body: { scope, user_id: userId, case_id: caseId || undefined },
      });
      if (error) throw error;
      toast.success("Exportação gerada");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao exportar");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nova exportação JSON</CardTitle>
          <CardDescription>Imagens e anexos binários NÃO são incluídos — apenas referências e metadados.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Escopo</Label>
            <Select value={scope} onValueChange={(v: any) => setScope(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="account">Conta/Clínica</SelectItem>
                <SelectItem value="case">Caso individual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>User ID</Label><Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid" /></div>
          <div><Label>Case ID (opcional)</Label><Input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="uuid" /></div>
          <div className="flex items-end"><Button onClick={generate} disabled={busy} className="w-full">{busy ? "Gerando..." : "Gerar JSON"}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? <p className="text-muted-foreground">Sem exportações.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Escopo</TableHead><TableHead>Status</TableHead>
                <TableHead>Expira</TableHead><TableHead>Arquivo</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{r.scope}</TableCell>
                    <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell>{new Date(r.expires_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      {r.file_url ? <a className="text-primary underline" href={r.file_url} target="_blank" rel="noreferrer">Baixar</a> : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- AUDIT ---------- */
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState({ event_type: "", severity: "all" });

  async function load() {
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter.event_type) q = q.ilike("event_type", `%${filter.event_type}%`);
    if (filter.severity !== "all") q = q.eq("severity", filter.severity as any);
    const { data } = await q;
    setLogs(data ?? []);
  }
  useEffect(() => { load(); }, [filter]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-logs-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div>
            <CardTitle>Logs de Auditoria</CardTitle>
            <CardDescription>Eventos sensíveis sem exposição de conteúdo clínico.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Filtrar por evento..." value={filter.event_type} onChange={(e) => setFilter({ ...filter, event_type: e.target.value })} className="w-56" />
            <Select value={filter.severity} onValueChange={(v) => setFilter({ ...filter, severity: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportJson}>Exportar JSON</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? <p className="text-muted-foreground">Nenhum log.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Evento</TableHead><TableHead>Severidade</TableHead>
              <TableHead>Ator</TableHead><TableHead>Recurso</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="font-mono text-xs">{l.event_type}</TableCell>
                  <TableCell><Badge variant={l.severity === "critical" ? "destructive" : l.severity === "warn" ? "secondary" : "outline"}>{l.severity}</Badge></TableCell>
                  <TableCell className="text-xs">{l.actor_email ?? l.actor_id ?? "—"}</TableCell>
                  <TableCell className="text-xs">{l.resource_type}{l.resource_id ? ` · ${l.resource_id.slice(0,8)}` : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- RETENTION & DELETION ---------- */
function RetentionTab() {
  const [queue, setQueue] = useState<any[]>([]);
  const [resourceType, setResourceType] = useState("case");
  const [resourceId, setResourceId] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    const { data } = await supabase.from("deletion_queue").select("*").order("created_at", { ascending: false }).limit(100);
    setQueue(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function schedule() {
    if (!resourceId) { toast.error("Informe o ID do recurso"); return; }
    const { error } = await supabase.functions.invoke("governance-delete", {
      body: { action: "schedule", resource_type: resourceType, resource_id: resourceId, reason },
    });
    if (error) toast.error(error.message); else { toast.success("Exclusão agendada"); setResourceId(""); setReason(""); load(); }
  }
  async function confirmDelete(id: string) {
    const { error } = await supabase.functions.invoke("governance-delete", { body: { action: "confirm", id } });
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  }
  async function cancel(id: string) {
    const { error } = await supabase.functions.invoke("governance-delete", { body: { action: "cancel", id } });
    if (error) toast.error(error.message); else { toast.success("Cancelado"); load(); }
  }

  return (
    <div className="space-y-4">
      <Card className="border-warning/40">
        <CardContent className="p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
          <div className="text-sm">
            <strong>Atenção:</strong> imagens clínicas e anexos exigem dupla confirmação. A exclusão remove dados do banco e arquivos do storage. Esta ação é irreversível e auditada como evento crítico.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Agendar exclusão</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Tipo</Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="case">Caso clínico</SelectItem>
                <SelectItem value="cephalometric_analysis">Cefalometria</SelectItem>
                <SelectItem value="user_account">Conta de usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>ID do recurso</Label><Input value={resourceId} onChange={(e) => setResourceId(e.target.value)} placeholder="uuid" /></div>
          <div className="flex items-end"><Button variant="destructive" onClick={schedule} className="w-full">Agendar</Button></div>
          <div className="md:col-span-4"><Label>Motivo</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fila de exclusão</CardTitle></CardHeader>
        <CardContent>
          {queue.length === 0 ? <p className="text-muted-foreground">Vazia.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Recurso</TableHead><TableHead>ID</TableHead><TableHead>Status</TableHead>
                <TableHead>Agendado p/</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {queue.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.resource_type}</TableCell>
                    <TableCell className="font-mono text-xs">{q.resource_id.slice(0,12)}</TableCell>
                    <TableCell><Badge variant={q.status === "executed" ? "default" : q.status === "cancelled" ? "outline" : "destructive"}>{q.status}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(q.scheduled_for).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="space-x-2">
                      {q.status === "pending" && (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">Confirmar exclusão</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão definitiva?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Os dados clínicos e arquivos relacionados serão removidos permanentemente. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => confirmDelete(q.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button size="sm" variant="ghost" onClick={() => cancel(q.id)}>Cancelar</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- COMPLIANCE ---------- */
function ComplianceTab() {
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("governance-compliance-report", { body: {} });
      if (error) throw error;
      setReport(data);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { generate(); }, []);

  function exportJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `compliance-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Relatório de Conformidade</CardTitle>
          <CardDescription>Snapshot de RLS, retenção, dados clínicos, IA, suporte e riscos.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generate} disabled={busy}>{busy ? "Gerando..." : "Atualizar"}</Button>
          <Button onClick={exportJson} disabled={!report}>Exportar JSON</Button>
        </div>
      </CardHeader>
      <CardContent>
        {!report ? <p className="text-muted-foreground">Gerando...</p> : (
          <div className="space-y-4">
            {report.risks?.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                <strong>Riscos identificados:</strong>
                <ul className="list-disc ml-5 text-sm mt-1">
                  {report.risks.map((r: string) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            )}
            <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-[500px]">{JSON.stringify(report, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- DSR ---------- */
function DsrTab() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ subject_email: "", request_type: "access", description: "" });

  async function load() {
    const { data } = await supabase.from("data_subject_requests").select("*").order("created_at", { ascending: false }).limit(100);
    setList(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.subject_email) { toast.error("E-mail obrigatório"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("data_subject_requests").insert({
      subject_email: form.subject_email,
      request_type: form.request_type as any,
      description: form.description,
      user_id: u.user?.id,
    });
    if (error) toast.error(error.message); else { toast.success("Pedido criado"); setForm({ subject_email: "", request_type: "access", description: "" }); load(); }
  }

  async function updateStatus(id: string, status: string) {
    const patch: any = { status };
    if (status === "completed") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("data_subject_requests").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Novo pedido de titular</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2"><Label>E-mail do titular</Label><Input value={form.subject_email} onChange={(e) => setForm({ ...form, subject_email: e.target.value })} /></div>
          <div><Label>Tipo</Label>
            <Select value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["access","rectification","portability","deletion","anonymization","restriction","consent_revocation"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button onClick={create} className="w-full">Criar</Button></div>
          <div className="md:col-span-4"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pedidos</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? <p className="text-muted-foreground">Nenhum pedido.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Titular</TableHead><TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead><TableHead>Prazo</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{r.subject_email}</TableCell>
                    <TableCell className="text-xs">{r.request_type}</TableCell>
                    <TableCell><Badge>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(r.due_date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["open","in_progress","completed","rejected"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- CONSENTS ---------- */
function ConsentsTab() {
  const [list, setList] = useState<any[]>([]);
  async function load() {
    const { data } = await supabase.from("consents").select("*").order("updated_at", { ascending: false }).limit(200);
    setList(data ?? []);
  }
  useEffect(() => { load(); }, []);

  const summary = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const c of list) {
      m[c.consent_type] = m[c.consent_type] || {};
      m[c.consent_type][c.consent_status] = (m[c.consent_type][c.consent_status] || 0) + 1;
    }
    return m;
  }, [list]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(summary).length === 0 ? <p className="text-muted-foreground">Sem registros.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(summary).map(([type, st]) => (
                <Card key={type} variant="glass">
                  <CardContent className="p-3">
                    <div className="font-semibold text-sm">{type}</div>
                    <div className="text-xs text-muted-foreground">
                      {Object.entries(st).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? <p className="text-muted-foreground">Sem registros.</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Usuário</TableHead><TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead><TableHead>Base legal</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{new Date(c.updated_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-xs">{c.user_id.slice(0,8)}</TableCell>
                    <TableCell className="text-xs">{c.consent_type}</TableCell>
                    <TableCell><Badge variant={c.consent_status === "granted" ? "default" : "outline"}>{c.consent_status}</Badge></TableCell>
                    <TableCell className="text-xs">{c.legal_basis}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- POLICIES ---------- */
function PoliciesTab() {
  const [policy, setPolicy] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("retention_policies").select("*").eq("singleton", true).maybeSingle();
    setPolicy(data);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("retention_policies").update({
      case_retention_days: policy.case_retention_days,
      image_retention_days: policy.image_retention_days,
      export_expiration_days: policy.export_expiration_days,
      support_retention_days: policy.support_retention_days,
      clinical_access_logging: policy.clinical_access_logging,
      ai_clinical_use_allowed: policy.ai_clinical_use_allowed,
      anonymization_strategy: policy.anonymization_strategy,
      notes: policy.notes,
      updated_by: u.user?.id,
      updated_at: new Date().toISOString(),
    }).eq("singleton", true);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Política salva");
    load();
  }

  if (!policy) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Políticas de Retenção e Tratamento</CardTitle>
        <CardDescription>Aplicado a todo o sistema. Alterações são auditadas.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Retenção de casos pós-cancelamento (dias)</Label>
          <Input type="number" value={policy.case_retention_days} onChange={(e) => setPolicy({ ...policy, case_retention_days: Number(e.target.value) })} /></div>
        <div><Label>Retenção de imagens clínicas (dias)</Label>
          <Input type="number" value={policy.image_retention_days} onChange={(e) => setPolicy({ ...policy, image_retention_days: Number(e.target.value) })} /></div>
        <div><Label>Expiração de exportações (dias)</Label>
          <Input type="number" value={policy.export_expiration_days} onChange={(e) => setPolicy({ ...policy, export_expiration_days: Number(e.target.value) })} /></div>
        <div><Label>Retenção de suporte (dias)</Label>
          <Input type="number" value={policy.support_retention_days} onChange={(e) => setPolicy({ ...policy, support_retention_days: Number(e.target.value) })} /></div>
        <div className="flex items-center gap-3"><Switch checked={policy.clinical_access_logging} onCheckedChange={(v) => setPolicy({ ...policy, clinical_access_logging: v })} /><Label>Logging de acesso clínico</Label></div>
        <div className="flex items-center gap-3"><Switch checked={policy.ai_clinical_use_allowed} onCheckedChange={(v) => setPolicy({ ...policy, ai_clinical_use_allowed: v })} /><Label>Uso de IA em dados clínicos permitido</Label></div>
        <div className="md:col-span-2"><Label>Estratégia de anonimização</Label>
          <Input value={policy.anonymization_strategy ?? ""} onChange={(e) => setPolicy({ ...policy, anonymization_strategy: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Notas</Label>
          <Textarea value={policy.notes ?? ""} rows={3} onChange={(e) => setPolicy({ ...policy, notes: e.target.value })} /></div>
        <div className="md:col-span-2"><Button onClick={save} disabled={busy}>{busy ? "Salvando..." : "Salvar política"}</Button></div>
      </CardContent>
    </Card>
  );
}