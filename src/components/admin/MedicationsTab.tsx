import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notify as toast } from "@/lib/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, CheckCircle2, Link2, RefreshCw, Search, Sparkles, Trash2 } from "lucide-react";

interface LabEffect {
  biomarker_code: string;
  direction: "up" | "down" | "variable";
  strength?: string;
  note?: string;
}

interface MedicationRow {
  id: string;
  inn: string;
  inn_en: string | null;
  drug_class: string;
  brand_names: string[];
  search_terms: string[];
  lab_effects: LabEffect[];
  clinical_note: string | null;
  source: string;
  verified: boolean;
}

interface UnresolvedRow {
  id: string;
  raw_text: string;
  normalized: string;
  hits: number;
  resolved: boolean;
  last_seen_at: string;
}

const DirectionIcon = ({ direction }: { direction: string }) => {
  if (direction === "up") return <ArrowUp className="w-3 h-3 text-destructive" />;
  if (direction === "down") return <ArrowDown className="w-3 h-3 text-primary" />;
  return <span className="text-xs">↕</span>;
};

export function MedicationsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [linkTarget, setLinkTarget] = useState<UnresolvedRow | null>(null);
  const [linkInn, setLinkInn] = useState<string>("");
  const [editing, setEditing] = useState<MedicationRow | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data: meds, isLoading } = useQuery({
    queryKey: ["medication-dictionary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_dictionary")
        .select("*")
        .order("inn");
      if (error) throw error;
      return (data || []) as unknown as MedicationRow[];
    },
  });

  const { data: unresolved } = useQuery({
    queryKey: ["medication-unresolved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_unresolved")
        .select("*")
        .eq("resolved", false)
        .order("hits", { ascending: false })
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as UnresolvedRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meds || [];
    return (meds || []).filter(
      (m) =>
        m.inn.toLowerCase().includes(q) ||
        (m.inn_en || "").toLowerCase().includes(q) ||
        m.drug_class.toLowerCase().includes(q) ||
        m.brand_names.some((b) => b.toLowerCase().includes(q)),
    );
  }, [meds, search]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["medication-dictionary"] });
    queryClient.invalidateQueries({ queryKey: ["medication-unresolved"] });
  };

  const retryAi = useMutation({
    mutationFn: async (row: UnresolvedRow) => {
      setResolvingId(row.id);
      const { data, error } = await supabase.functions.invoke("resolve-medications", {
        body: { medications: [row.raw_text] },
      });
      if (error) throw error;
      return data as { resolved?: Array<{ inn: string | null }> };
    },
    onSuccess: (data, row) => {
      const inn = data?.resolved?.[0]?.inn;
      if (inn) {
        toast.success(`«${row.raw_text}» распознан как ${inn}`);
      } else {
        toast.error(`ИИ снова не смог распознать «${row.raw_text}»`);
      }
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setResolvingId(null),
  });

  const linkMutation = useMutation({
    mutationFn: async ({ row, medId }: { row: UnresolvedRow; medId: string }) => {
      const target = (meds || []).find((m) => m.id === medId);
      if (!target) throw new Error("Препарат не найден");
      const terms = Array.from(new Set([...target.search_terms, row.normalized]));
      const brands = Array.from(new Set([...target.brand_names, row.raw_text.trim()]));
      const { error } = await supabase
        .from("medication_dictionary")
        .update({ search_terms: terms, brand_names: brands })
        .eq("id", medId);
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("medication_unresolved")
        .update({ resolved: true })
        .eq("id", row.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Название привязано к препарату");
      setLinkTarget(null);
      setLinkInn("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("medication_unresolved")
        .update({ resolved: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Скрыто из списка");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMed = useMutation({
    mutationFn: async (row: MedicationRow) => {
      const { error } = await supabase
        .from("medication_dictionary")
        .update({
          inn: row.inn.trim(),
          drug_class: row.drug_class.trim(),
          brand_names: row.brand_names,
          clinical_note: row.clinical_note,
          verified: row.verified,
        })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Сохранено");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medication_dictionary").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Препарат удалён");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Нераспознанные препараты
            {unresolved && unresolved.length > 0 && (
              <Badge variant="destructive">{unresolved.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Названия, которые пациенты ввели вручную, но система не смогла сопоставить с
            действующим веществом. Такие препараты не учитываются в отчётах, пока их не привязать.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!unresolved || unresolved.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Всё распознано — нераспознанных названий нет.
            </p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead className="w-24">Встреч</TableHead>
                    <TableHead className="w-40">Последний раз</TableHead>
                    <TableHead className="w-[320px] text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unresolved.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.raw_text}</TableCell>
                      <TableCell>{row.hits}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.last_seen_at).toLocaleDateString("ru-RU")}
                      </TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resolvingId === row.id}
                          onClick={() => retryAi.mutate(row)}
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          {resolvingId === row.id ? "Распознаю…" : "ИИ"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLinkTarget(row);
                            setLinkInn("");
                          }}
                        >
                          <Link2 className="w-3.5 h-3.5 mr-1" />
                          Привязать
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissMutation.mutate(row.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Скрыть
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Справочник препаратов ({meds?.length || 0})</CardTitle>
              <CardDescription>
                Действующие вещества, торговые названия и влияние на биомаркеры
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Поиск по названию или группе"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Действующее вещество</TableHead>
                    <TableHead>Группа</TableHead>
                    <TableHead>Торговые названия</TableHead>
                    <TableHead>Влияние на биомаркеры</TableHead>
                    <TableHead className="w-32">Источник</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.inn}
                        {m.inn_en && (
                          <div className="text-xs text-muted-foreground">{m.inn_en}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{m.drug_class}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[220px]">
                        {m.brand_names.slice(0, 4).join(", ")}
                        {m.brand_names.length > 4 && ` +${m.brand_names.length - 4}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[320px]">
                          {(m.lab_effects || []).map((e, i) => (
                            <Badge
                              key={`${m.id}-${e.biomarker_code}-${i}`}
                              variant="secondary"
                              className="gap-1"
                              title={e.note}
                            >
                              <DirectionIcon direction={e.direction} />
                              {e.biomarker_code}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.verified ? "default" : "outline"}>
                          {m.verified ? "проверено" : m.source === "ai_runtime" ? "ИИ (на лету)" : "ИИ"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>
                          Изменить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Привязка нераспознанного названия */}
      <Dialog open={!!linkTarget} onOpenChange={(o) => !o && setLinkTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Привязать «{linkTarget?.raw_text}»</DialogTitle>
            <DialogDescription>
              Выберите действующее вещество — название будет добавлено в его синонимы и в
              дальнейшем распознается автоматически.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Действующее вещество</Label>
            <Select value={linkInn} onValueChange={setLinkInn}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите препарат" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {(meds || []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.inn} — {m.drug_class}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkTarget(null)}>
              Отмена
            </Button>
            <Button
              disabled={!linkInn || linkMutation.isPending}
              onClick={() =>
                linkTarget && linkMutation.mutate({ row: linkTarget, medId: linkInn })
              }
            >
              Привязать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Редактирование препарата */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.inn}</DialogTitle>
            <DialogDescription>Данные препарата в справочнике</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Действующее вещество</Label>
                <Input
                  value={editing.inn}
                  onChange={(e) => setEditing({ ...editing, inn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Фармакологическая группа</Label>
                <Input
                  value={editing.drug_class}
                  onChange={(e) => setEditing({ ...editing, drug_class: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Торговые названия (через запятую)</Label>
                <Input
                  value={editing.brand_names.join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      brand_names: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Клиническая заметка</Label>
                <Textarea
                  rows={3}
                  value={editing.clinical_note || ""}
                  onChange={(e) => setEditing({ ...editing, clinical_note: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Влияние на биомаркеры</Label>
                <div className="space-y-1 rounded-md border p-3">
                  {(editing.lab_effects || []).map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <DirectionIcon direction={e.direction} />
                      <span className="font-medium w-20 shrink-0">{e.biomarker_code}</span>
                      <span className="text-muted-foreground">{e.note}</span>
                    </div>
                  ))}
                  {(!editing.lab_effects || editing.lab_effects.length === 0) && (
                    <p className="text-sm text-muted-foreground">Эффекты не указаны</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={editing.verified ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditing({ ...editing, verified: !editing.verified })}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {editing.verified ? "Проверено врачом" : "Отметить как проверенное"}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => editing && deleteMed.mutate(editing.id)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Удалить
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Отмена
            </Button>
            <Button disabled={saveMed.isPending} onClick={() => editing && saveMed.mutate(editing)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
