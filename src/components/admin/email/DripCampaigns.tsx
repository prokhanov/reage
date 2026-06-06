import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Trash2, Edit3, Power, HelpCircle, RefreshCw, UserPlus } from "lucide-react";
import EnrollPatientsDialog from "./EnrollPatientsDialog";
import SeriesSubscribersTab from "./SeriesSubscribersTab";

interface Series { id: string; name: string; description: string | null; trigger_type: string; is_active: boolean; }
interface Step {
  id: string; series_id: string; order_index: number;
  subject: string; preheader: string | null;
  body_markdown: string;
  cta_label: string | null; cta_url: string | null;
  delay_value: number; delay_unit: string;
  cancel_conditions: any[]; is_active: boolean;
}

const CANCEL_OPTIONS = [
  { value: 'has_active_subscription', label: 'Уже оплатил подписку' },
  { value: 'has_any_analysis', label: 'Уже сдал хотя бы один анализ' },
  { value: 'email_confirmed', label: 'Email уже подтверждён' },
  { value: 'email_not_confirmed', label: 'Email ещё не подтверждён' },
];

export default function DripCampaigns() {
  const { toast } = useToast();
  const [series, setSeries] = useState<Series[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [tab, setTab] = useState("series");
  const [unsubs, setUnsubs] = useState<any[]>([]);
  const [scheduleStats, setScheduleStats] = useState<any>(null);
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesDesc, setNewSeriesDesc] = useState("");
  const [enrollDialog, setEnrollDialog] = useState<{ id: string; name: string } | null>(null);
  const [seriesInnerTab, setSeriesInnerTab] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: st }] = await Promise.all([
      supabase.from('email_drip_series').select('*').order('created_at'),
      supabase.from('email_drip_steps').select('*').order('order_index'),
    ]);
    setSeries((s as any) ?? []);
    setSteps((st as any) ?? []);

    const [{ data: u }, { data: stats }] = await Promise.all([
      supabase.from('email_unsubscribes').select('*').order('unsubscribed_at', { ascending: false }).limit(200),
      supabase.from('email_drip_schedule').select('status'),
    ]);
    setUnsubs((u as any) ?? []);
    const counts: Record<string, number> = {};
    (stats ?? []).forEach((r: any) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    setScheduleStats(counts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createSeries() {
    if (!newSeriesName.trim()) return;
    const { error } = await supabase.from('email_drip_series').insert({
      name: newSeriesName.trim(),
      description: newSeriesDesc.trim() || null,
      trigger_type: 'registration',
      is_active: false,
    });
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    setNewSeriesName("");
    setNewSeriesDesc("");
    setShowNewSeries(false);
    load();
  }

  async function toggleSeries(id: string, value: boolean) {
    await supabase.from('email_drip_series').update({ is_active: value }).eq('id', id);
    load();
  }

  async function deleteSeries(id: string) {
    if (!confirm('Удалить серию со всеми шагами и запланированными отправками?')) return;
    await supabase.from('email_drip_series').delete().eq('id', id);
    load();
  }

  async function changeTrigger(id: string, trigger: string) {
    await supabase.from('email_drip_series').update({ trigger_type: trigger as 'manual' | 'registration' | 'subscription_paid' }).eq('id', id);
    load();
  }

  async function addStep(seriesId: string) {
    const seriesSteps = steps.filter(s => s.series_id === seriesId);
    const order = seriesSteps.length + 1;
    const { data, error } = await supabase.from('email_drip_steps').insert({
      series_id: seriesId,
      order_index: order,
      subject: 'Новое письмо',
      body_markdown: 'Здравствуйте, {{first_name}}!\n\nТекст письма...',
      delay_value: 1,
      delay_unit: 'days',
      is_active: true,
    }).select().single();
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    setEditingStep(data as any);
    load();
  }

  async function saveStep(step: Step) {
    const { error } = await supabase.from('email_drip_steps').update({
      subject: step.subject,
      preheader: step.preheader,
      body_markdown: step.body_markdown,
      cta_label: step.cta_label,
      cta_url: step.cta_url,
      delay_value: step.delay_value,
      delay_unit: step.delay_unit as any,
      cancel_conditions: step.cancel_conditions,
      is_active: step.is_active,
    }).eq('id', step.id);
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    toast({ title: 'Сохранено' });
    setEditingStep(null);
    load();
  }

  async function deleteStep(id: string) {
    if (!confirm('Удалить шаг?')) return;
    await supabase.from('email_drip_steps').delete().eq('id', id);
    load();
  }

  async function sendTest(stepId: string) {
    if (!testEmail) return toast({ title: 'Укажите email', variant: 'destructive' });
    const { data, error } = await supabase.functions.invoke('drip-admin', {
      body: { action: 'test_send', step_id: stepId, email: testEmail },
    });
    if (error || (data as any)?.error) {
      return toast({ title: 'Ошибка', description: (data as any)?.error || error?.message, variant: 'destructive' });
    }
    toast({ title: 'Тестовое письмо отправлено', description: testEmail });
  }

  async function runProcessorNow() {
    const { data, error } = await supabase.functions.invoke('drip-process', { body: { limit: 100 } });
    if (error) return toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    toast({ title: 'Очередь обработана', description: JSON.stringify(data) });
    load();
  }

  function delayLabel(value: number, unit: string) {
    if (value === 0) return 'сразу';
    const u = unit === 'minutes' ? 'мин' : unit === 'hours' ? 'ч' : 'дн';
    return `через ${value} ${u}`;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Email-рассылки</h2>
            <p className="text-sm text-muted-foreground">Серии писем после регистрации, оплаты и других событий</p>
          </div>
          <Button variant="outline" size="sm" onClick={runProcessorNow}><RefreshCw className="w-4 h-4 mr-2" />Обработать очередь</Button>
        </div>

        {scheduleStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { k: 'pending', l: 'В очереди', c: 'text-blue-500' },
              { k: 'sent', l: 'Отправлено', c: 'text-green-500' },
              { k: 'skipped', l: 'Пропущено', c: 'text-yellow-500' },
              { k: 'failed', l: 'Ошибки', c: 'text-red-500' },
              { k: 'cancelled', l: 'Отменено', c: 'text-muted-foreground' },
            ].map(s => (
              <Card key={s.k}><CardContent className="p-4">
                <div className="text-xs text-muted-foreground">{s.l}</div>
                <div className={`text-2xl font-bold ${s.c}`}>{scheduleStats[s.k] ?? 0}</div>
              </CardContent></Card>
            ))}
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="series">Серии</TabsTrigger>
            <TabsTrigger value="unsubs">Отписавшиеся ({unsubs.length})</TabsTrigger>
            <TabsTrigger value="help">Справка</TabsTrigger>
          </TabsList>

          <TabsContent value="series" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Input placeholder="your-test-email@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="max-w-xs" />
              <span className="text-xs text-muted-foreground">— email для тестовых отправок</span>
              <div className="flex-1" />
              <Button size="sm" onClick={() => setShowNewSeries(true)}><Plus className="w-4 h-4 mr-2" />Новая серия</Button>
            </div>

            {loading ? <p className="text-sm text-muted-foreground">Загрузка...</p> : series.map(sr => {
              const ss = steps.filter(x => x.series_id === sr.id).sort((a, b) => a.order_index - b.order_index);
              return (
                <Card key={sr.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <CardTitle className="text-lg">{sr.name}</CardTitle>
                      <Badge variant={sr.is_active ? 'default' : 'secondary'}>{sr.is_active ? 'Активна' : 'Выключена'}</Badge>
                      <Select value={sr.trigger_type} onValueChange={v => changeTrigger(sr.id, v)}>
                        <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registration">При регистрации</SelectItem>
                          <SelectItem value="subscription_paid">При оплате подписки</SelectItem>
                          <SelectItem value="manual">Только вручную</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex-1" />
                      <Switch checked={sr.is_active} onCheckedChange={v => toggleSeries(sr.id, v)} />
                      <Button size="sm" variant="outline" onClick={() => setEnrollDialog({ id: sr.id, name: sr.name })}>
                        <UserPlus className="w-4 h-4 mr-2" />Добавить пациентов
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteSeries(sr.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    {sr.description && <p className="text-sm text-muted-foreground mt-2">{sr.description}</p>}
                  </CardHeader>
                  <CardContent>
                    <Tabs value={seriesInnerTab[sr.id] ?? 'steps'} onValueChange={(v) => setSeriesInnerTab(prev => ({ ...prev, [sr.id]: v }))}>
                      <TabsList>
                        <TabsTrigger value="steps">Шаги ({ss.length})</TabsTrigger>
                        <TabsTrigger value="subscribers">Подписчики</TabsTrigger>
                      </TabsList>
                      <TabsContent value="steps" className="space-y-2 mt-4">
                        {ss.map(st => (
                          <div key={st.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40">
                            <Badge variant="outline" className="font-mono">{st.order_index}</Badge>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{st.subject}</div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                                <span>{delayLabel(st.delay_value, st.delay_unit)}</span>
                                {(st.cancel_conditions?.length ?? 0) > 0 && <span>· {st.cancel_conditions.length} усл. отмены</span>}
                                {!st.is_active && <Badge variant="secondary" className="text-[10px]">выключен</Badge>}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => sendTest(st.id)}><Send className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingStep(st)}><Edit3 className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteStep(st.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" onClick={() => addStep(sr.id)}><Plus className="w-4 h-4 mr-2" />Добавить шаг</Button>
                      </TabsContent>
                      <TabsContent value="subscribers" className="mt-4">
                        {(seriesInnerTab[sr.id] ?? 'steps') === 'subscribers' && <SeriesSubscribersTab seriesId={sr.id} />}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="unsubs" className="mt-4">
            <Card><CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40"><tr>
                    <th className="text-left p-3">Email</th><th className="text-left p-3">Область</th><th className="text-left p-3">Дата</th><th className="text-left p-3">Причина</th>
                  </tr></thead>
                  <tbody>
                    {unsubs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Никто не отписался</td></tr>}
                    {unsubs.map(u => (
                      <tr key={u.id} className="border-t"><td className="p-3">{u.email}</td><td className="p-3"><Badge variant="outline">{u.scope}</Badge></td><td className="p-3">{new Date(u.unsubscribed_at).toLocaleString('ru-RU')}</td><td className="p-3 text-muted-foreground">{u.reason}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="help" className="mt-4 space-y-3 text-sm">
            <Card><CardContent className="p-4 space-y-2">
              <h3 className="font-semibold">Как это работает</h3>
              <p>Серия — это цепочка писем с задержками. Когда у пациента происходит событие-триггер (регистрация / оплата), он автоматически попадает в очередь и получает письма по расписанию.</p>
              <h3 className="font-semibold mt-3">Задержка</h3>
              <p>Время отсчитывается <b>от момента регистрации/оплаты</b> по нарастающей: шаг 1 — мгновенно, шаг 2 — +1 день, шаг 3 — ещё +3 дня (итого 4 дня после регистрации), и т.д.</p>
              <h3 className="font-semibold mt-3">Плейсхолдеры в теме и теле</h3>
              <code className="text-xs">{`{{first_name}} {{name}} {{email}} {{dashboard_url}} {{site_url}}`}</code>
              <h3 className="font-semibold mt-3">Условия отмены</h3>
              <p>Перед каждой отправкой система проверяет условия. Если хотя бы одно срабатывает — письмо пропускается. Например, не слать напоминание об оплате тому, кто уже оплатил.</p>
              <h3 className="font-semibold mt-3">Markdown</h3>
              <p>Тело письма пишется в Markdown: <code>**жирный**</code>, <code>*курсив*</code>, списки через дефис, ссылки <code>[текст](url)</code>.</p>
              <h3 className="font-semibold mt-3">Безопасность доставки</h3>
              <p>В каждое письмо автоматически добавляются ссылки отписки от этой серии и от всех маркетинговых писем. Системные письма (регистрация, оплата) никогда не блокируются маркетинговой отпиской.</p>
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        {/* New series dialog */}
        <Dialog open={showNewSeries} onOpenChange={setShowNewSeries}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Новая серия рассылок</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Название серии</Label>
                <Input value={newSeriesName} onChange={e => setNewSeriesName(e.target.value)} placeholder="Например, Онбординг новых пользователей" />
              </div>
              <div>
                <Label>Описание (необязательно)</Label>
                <Textarea value={newSeriesDesc} onChange={e => setNewSeriesDesc(e.target.value)} rows={3} placeholder="Краткое описание назначения серии" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewSeries(false)}>Отмена</Button>
              <Button onClick={createSeries} disabled={!newSeriesName.trim()}>Создать серию</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Step editor */}
        <Dialog open={!!editingStep} onOpenChange={(o) => !o && setEditingStep(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Редактор шага</DialogTitle></DialogHeader>
            {editingStep && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Задержка</Label><Input type="number" value={editingStep.delay_value} onChange={e => setEditingStep({ ...editingStep, delay_value: Number(e.target.value) })} /></div>
                  <div><Label>Единица</Label>
                    <Select value={editingStep.delay_unit} onValueChange={v => setEditingStep({ ...editingStep, delay_unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">минут</SelectItem>
                        <SelectItem value="hours">часов</SelectItem>
                        <SelectItem value="days">дней</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2"><Switch checked={editingStep.is_active} onCheckedChange={v => setEditingStep({ ...editingStep, is_active: v })} /><Label>Включён</Label></div>
                </div>
                <div><Label>Тема письма</Label><Input value={editingStep.subject} onChange={e => setEditingStep({ ...editingStep, subject: e.target.value })} /></div>
                <div><Label>Прехедер (короткий превью-текст)</Label><Input value={editingStep.preheader ?? ''} onChange={e => setEditingStep({ ...editingStep, preheader: e.target.value })} /></div>
                <div>
                  <Label className="flex items-center gap-2">Тело письма (Markdown)
                    <Tooltip><TooltipTrigger><HelpCircle className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">Плейсхолдеры: {`{{first_name}}, {{name}}, {{email}}, {{dashboard_url}}, {{site_url}}`}</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Textarea rows={10} className="font-mono text-sm" value={editingStep.body_markdown} onChange={e => setEditingStep({ ...editingStep, body_markdown: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Кнопка — текст</Label><Input value={editingStep.cta_label ?? ''} onChange={e => setEditingStep({ ...editingStep, cta_label: e.target.value })} /></div>
                  <div><Label>Кнопка — ссылка</Label><Input value={editingStep.cta_url ?? ''} placeholder="{{dashboard_url}}" onChange={e => setEditingStep({ ...editingStep, cta_url: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Условия отмены (если хоть одно срабатывает — письмо не отправляется)</Label>
                  <div className="space-y-1 mt-2">
                    {CANCEL_OPTIONS.map(opt => {
                      const checked = (editingStep.cancel_conditions ?? []).some((c: any) => c.type === opt.value);
                      return (
                        <label key={opt.value} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={checked} onChange={e => {
                            const next = e.target.checked
                              ? [...(editingStep.cancel_conditions ?? []), { type: opt.value }]
                              : (editingStep.cancel_conditions ?? []).filter((c: any) => c.type !== opt.value);
                            setEditingStep({ ...editingStep, cancel_conditions: next });
                          }} />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => editingStep && sendTest(editingStep.id)}><Send className="w-4 h-4 mr-2" />Отправить тест</Button>
              <Button onClick={() => editingStep && saveStep(editingStep)}>Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
