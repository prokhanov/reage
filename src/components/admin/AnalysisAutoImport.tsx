import { useContext, useEffect, useMemo, useRef, useState } from "react";

const uuidv4 = () => (typeof crypto !== "undefined" && "randomUUID" in crypto)
  ? (crypto as any).randomUUID() as string
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { useToast } from "@/hooks/use-toast";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import { BiomarkerValueCell } from "@/components/admin/BiomarkerValueCell";
import { calculateAge } from "@/lib/biomarkerNorms";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Trash2,
  Loader2,
} from "lucide-react";

type ItemStatus = "ok" | "unit_mismatch" | "low_confidence" | "value_parse_error";

interface RecognizedItem {
  biomarker_id: string;
  biomarker_code: string;
  biomarker_name: string;
  expected_unit: string;
  printed_name: string;
  value_raw: string;
  value_numeric: number | null;
  value_converted: number | null;
  unit_raw: string;
  unit_matches: boolean;
  page: number | null;
  ref_range_raw: string | null;
  confidence: number;
  status: ItemStatus;
  // local UI state
  include: boolean;
  edited_value: string;
  use_expected_unit: boolean;
}

interface UnknownItem {
  printed_name: string;
  value_raw: string;
  unit_raw: string;
  page: number | null;
  ref_range_raw: string | null;
  confidence: number;
}

interface ParseResult {
  lab_name: string | null;
  collection_date: string | null;
  notes: string | null;
  recognized: RecognizedItem[];
  unknown: UnknownItem[];
}

type FileStatus = "queued" | "uploading" | "parsing" | "done" | "error" | "imported";

interface FileEntry {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
  result?: ParseResult;
  editLab: string;
  editDate: string;
}

interface Props {
  onImported?: () => void;
  onClose?: () => void;
}

const MAX_FILES = 30;
const MAX_SIZE = 50 * 1024 * 1024;
const CONCURRENCY = 1;

function statusBadge(s: ItemStatus) {
  switch (s) {
    case "ok":
      return <Badge className="bg-green-600 hover:bg-green-600">OK</Badge>;
    case "unit_mismatch":
      return <Badge className="bg-amber-500 hover:bg-amber-500">Единицы</Badge>;
    case "low_confidence":
      return <Badge className="bg-amber-500 hover:bg-amber-500">Низкая уверенность</Badge>;
    case "value_parse_error":
      return <Badge variant="destructive">Не парсится</Badge>;
  }
}

export function AnalysisAutoImport({ onImported, onClose }: Props) {
  const { viewAsUserId } = useContext(ViewAsPatientContext);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [patient, setPatient] = useState<{ age: number | null; gender: "male" | "female" | null }>({ age: null, gender: null });
  const [biomarkersMap, setBiomarkersMap] = useState<Record<string, any>>({});

  // Load patient profile (age/gender) once for status colouring
  useEffect(() => {
    if (!viewAsUserId) return;
    let aborted = false;
    (async () => {
      const { data } = await (supabase
        .from("profiles") as any)
        .select("birth_date, gender")
        .eq("id", viewAsUserId)
        .maybeSingle();
      if (aborted || !data) return;
      const age = data.birth_date ? calculateAge(data.birth_date as string) : null;
      const g = data.gender === "female" ? "female" : data.gender === "male" ? "male" : null;
      setPatient({ age, gender: g });
    })();
    return () => { aborted = true; };
  }, [viewAsUserId]);

  // Load biomarker norms for any newly recognized biomarker ids
  useEffect(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (e.result) for (const r of e.result.recognized) ids.add(r.biomarker_id);
    }
    const missing = Array.from(ids).filter(id => !biomarkersMap[id]);
    if (!missing.length) return;
    (async () => {
      const { data } = await (supabase
        .from("biomarkers") as any)
        .select("id, name, code, unit, range_mode, age_ranges, normal_min, normal_max, normal_min_male, normal_max_male, normal_min_female, normal_max_female, optimal_min, optimal_max, optimal_min_male, optimal_max_male, optimal_min_female, optimal_max_female, critical_min, critical_max, critical_min_male, critical_max_male, critical_min_female, critical_max_female")
        .in("id", missing);
      if (!data) return;
      setBiomarkersMap(prev => {
        const next = { ...prev };
        for (const b of data) next[(b as any).id] = b;
        return next;
      });
    })();
  }, [entries, biomarkersMap]);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!arr.length) {
      toast({ title: "Не PDF", description: "Поддерживаются только PDF-файлы", variant: "destructive" });
      return;
    }
    const next: FileEntry[] = [];
    for (const f of arr) {
      if (f.size > MAX_SIZE) {
        toast({ title: "Файл слишком большой", description: `${f.name}: больше 50 МБ`, variant: "destructive" });
        continue;
      }
      next.push({
        id: uuidv4(),
        file: f,
        status: "queued",
        editLab: "",
        editDate: "",
      });
    }
    setEntries(prev => {
      const combined = [...prev, ...next];
      if (combined.length > MAX_FILES) {
        toast({ title: "Лимит", description: `Максимум ${MAX_FILES} файлов за раз`, variant: "destructive" });
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function updateEntry(id: string, patch: Partial<FileEntry>) {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
  }

  function updateItem(entryId: string, idx: number, patch: Partial<RecognizedItem>) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId || !e.result) return e;
      const recognized = e.result.recognized.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      return { ...e, result: { ...e.result, recognized } };
    }));
  }

  async function processOne(entry: FileEntry): Promise<void> {
    if (!viewAsUserId) throw new Error("Нет ID пациента");
    const tag = `[auto-import ${entry.file.name}]`;
    try {
      console.log(`${tag} start`, { size: entry.file.size, type: entry.file.type, viewAsUserId });
      updateEntry(entry.id, { status: "parsing" });
      console.log(`${tag} sending PDF to parser directly`);

      // Ретраи на сетевые сбои (Failed to fetch / TypeError / 5xx через прокси).
      // Большие PDF и параллельные загрузки иногда обрывают коннект на fly-proxy.
      const MAX_ATTEMPTS = 4;
      let lastErr: any = null;
      let data: any = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const t0 = performance.now();
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) throw new Error("Сессия не найдена. Войдите заново.");

          const formData = new FormData();
          formData.append("file", entry.file, entry.file.name);
          formData.append("patientId", viewAsUserId);

          const response = await fetch(edgeFunctionUrl("parse-analysis-pdf"), {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          });

          const payload = await response.json().catch(() => null);
          console.log(`${tag} direct parse attempt ${attempt} finished in ${Math.round(performance.now() - t0)}ms`, {
            status: response.status,
            ok: response.ok,
            hasPayload: !!payload,
          });

          if (response.ok && payload?.success) {
            data = payload;
            lastErr = null;
            break;
          }

          const msg = payload?.error || payload?.details || `HTTP ${response.status}`;
          const retriable = response.status >= 500 || /failed to fetch|network|fetch|timeout|aborted|load failed|5\d\d/i.test(String(msg));
          lastErr = new Error(String(msg));
          if (!retriable || attempt === MAX_ATTEMPTS) throw lastErr;
        } catch (e: any) {
          lastErr = e;
          const msg = String(e?.message || e);
          const retriable = /failed to fetch|network|fetch|timeout|aborted|load failed/i.test(msg);
          console.log(`${tag} direct parse attempt ${attempt} threw`, { msg, retriable });
          if (!retriable || attempt === MAX_ATTEMPTS) throw e instanceof Error ? e : new Error(msg);
        }
        const backoff = 800 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 400);
        updateEntry(entry.id, { error: `Сеть нестабильна, повтор ${attempt + 1}/${MAX_ATTEMPTS} через ${Math.round(backoff/100)/10}s` });
        await new Promise(r => setTimeout(r, backoff));
      }
      if (lastErr || !data) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr?.message || lastErr || "Распознавание не удалось"));
      updateEntry(entry.id, { error: undefined });

      if (!data?.success) {
        console.log(`${tag} non-success data`, data);
        throw new Error(data?.error || "Распознавание не удалось");
      }

      const recognized: RecognizedItem[] = (data.recognized || []).map((r: any) => ({
        ...r,
        include: r.status === "ok" || r.status === "low_confidence",
        edited_value: r.value_numeric !== null ? String(r.value_numeric) : r.value_raw,
        use_expected_unit: r.unit_matches || r.value_converted !== null,
      }));

      console.log(`${tag} done`, { recognized: recognized.length, unknown: data.unknown?.length || 0 });
      updateEntry(entry.id, {
        status: "done",
        result: {
          lab_name: data.lab_name,
          collection_date: data.collection_date,
          notes: data.notes,
          recognized,
          unknown: data.unknown || [],
        },
        editLab: data.lab_name || "",
        editDate: data.collection_date || new Date().toISOString().slice(0, 10),
      });
    } catch (e: any) {
      console.error(`${tag} FAILED`, e);
      updateEntry(entry.id, { status: "error", error: e?.message || "Ошибка" });
    }
  }

  async function recognizeAll() {
    const queue = entries.filter(e => e.status === "queued" || e.status === "error");
    if (!queue.length) return;
    setParsing(true);
    try {
      // run with concurrency
      let idx = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        while (idx < queue.length) {
          const cur = queue[idx++];
          await processOne(cur);
        }
      });
      await Promise.all(workers);
    } finally {
      setParsing(false);
    }
  }

  async function importAll() {
    if (!viewAsUserId) return;
    const ready = entries.filter(e => e.status === "done" && e.result);
    if (!ready.length) {
      toast({ title: "Нечего импортировать", variant: "destructive" });
      return;
    }
    setImporting(true);
    let created = 0;
    let failed = 0;
    try {
      for (const e of ready) {
        try {
          if (!e.editDate) throw new Error("Не указана дата");
          const selected = e.result!.recognized.filter(r => r.include);
          if (!selected.length) continue;

          const { data: analysis, error: aErr } = await supabase
            .from("analyses")
            .insert({
              user_id: viewAsUserId,
              date: e.editDate,
              lab_name: e.editLab || null,
              status: "on_review" as const,
            })
            .select()
            .single();
          if (aErr) throw aErr;

          // Dedupe by biomarker_id (keep last)
          const byBm = new Map<string, RecognizedItem>();
          for (const r of selected) byBm.set(r.biomarker_id, r);

          const values = Array.from(byBm.values()).map(r => {
            const numericEdited = parseFloat((r.edited_value || "").replace(",", "."));
            const value = Number.isFinite(numericEdited)
              ? numericEdited
              : (r.use_expected_unit && r.value_converted !== null
                ? r.value_converted
                : r.value_numeric ?? 0);
            const unit_override = r.use_expected_unit ? null : (r.unit_raw || null);
            return {
              analysis_id: analysis.id,
              biomarker_id: r.biomarker_id,
              value,
              unit_override,
            };
          }).filter(v => Number.isFinite(v.value));

          if (values.length) {
            const { error: vErr } = await supabase.from("analysis_values").insert(values);
            if (vErr) throw vErr;
          }

          updateEntry(e.id, { status: "imported" });
          created++;
        } catch (err: any) {
          console.error("import error", err);
          updateEntry(e.id, { status: "error", error: err?.message || "Не удалось импортировать" });
          failed++;
        }
      }
      toast({
        title: "Импорт завершён",
        description: `Создано анализов: ${created}${failed ? `, ошибок: ${failed}` : ""}`,
      });
      if (created > 0) {
        onImported?.();
        if (failed === 0) onClose?.();
      }
    } finally {
      setImporting(false);
    }
  }

  const readyCount = entries.filter(e => e.status === "done").length;
  const queuedCount = entries.filter(e => e.status === "queued" || e.status === "error").length;

  return (
    <div className="space-y-4 py-2">
      <Alert>
        <AlertDescription className="text-sm">
          Загрузите PDF-файлы с результатами лабораторных анализов. ИИ распознает показатели,
          сопоставит с панелью биомаркеров и предложит импортировать. Можно загрузить до {MAX_FILES} файлов за раз.
        </AlertDescription>
      </Alert>

      <div
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40 transition"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <div className="text-sm">Перетащите PDF сюда или нажмите, чтобы выбрать</div>
        <div className="text-xs text-muted-foreground mt-1">До {MAX_FILES} файлов, по 50 МБ</div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </div>

      {entries.length > 0 && (
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={recognizeAll}
            disabled={parsing || importing || queuedCount === 0}
          >
            {parsing ? <><ButtonSpinner className="mr-2" />Распознаём...</> : `Распознать (${queuedCount})`}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={importAll}
            disabled={importing || parsing || readyCount === 0}
          >
            {importing ? <><ButtonSpinner className="mr-2" />Импортируем...</> : `Импортировать (${readyCount})`}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {entries.map(entry => (
          <Card key={entry.id} className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0 truncate text-sm font-medium">{entry.file.name}</div>
              {entry.status === "uploading" && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Загрузка</Badge>}
              {entry.status === "parsing" && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Распознавание</Badge>}
              {entry.status === "queued" && <Badge variant="outline">В очереди</Badge>}
              {entry.status === "done" && <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Готово</Badge>}
              {entry.status === "imported" && <Badge className="bg-blue-600 hover:bg-blue-600"><CheckCircle2 className="h-3 w-3 mr-1" />Импортировано</Badge>}
              {entry.status === "error" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Ошибка</Badge>}
              {(entry.status === "queued" || entry.status === "error" || entry.status === "done") && (
                <Button type="button" size="icon" variant="ghost" onClick={() => removeEntry(entry.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {entry.status === "error" && entry.error && (
              <Alert variant="destructive" className="mb-2">
                <AlertDescription className="text-xs">{entry.error}</AlertDescription>
              </Alert>
            )}

            {entry.status === "done" && entry.result && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Дата сдачи</Label>
                    <Input
                      type="date"
                      value={entry.editDate}
                      onChange={e => updateEntry(entry.id, { editDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Лаборатория</Label>
                    <Input
                      value={entry.editLab}
                      onChange={e => updateEntry(entry.id, { editLab: e.target.value })}
                      placeholder="—"
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Распознано: {entry.result.recognized.length} • Не в нашей панели: {entry.result.unknown.length}
                  {entry.result.notes && <span> • {entry.result.notes}</span>}
                </div>

                {entry.result.recognized.length > 0 && (
                  <div className="border rounded overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="p-2 text-left w-8"></th>
                          <th className="p-2 text-left">Показатель</th>
                          <th className="p-2 text-left">Значение</th>
                          <th className="p-2 text-left">Единица</th>
                          <th className="p-2 text-left">Стр.</th>
                          <th className="p-2 text-left">Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.result.recognized.map((r, idx) => (
                          <tr key={idx} className="border-t align-top">
                            <td className="p-2">
                              <Checkbox
                                checked={r.include}
                                onCheckedChange={(v) => updateItem(entry.id, idx, { include: !!v })}
                              />
                            </td>
                            <td className="p-2">
                              <div className="font-medium">{r.biomarker_name}</div>
                              <div className="text-muted-foreground">в PDF: {r.printed_name}</div>
                            </td>
                            <td className="p-2">
                              <BiomarkerValueCell
                                value={r.edited_value}
                                onChange={(v) => updateItem(entry.id, idx, { edited_value: v })}
                                biomarker={biomarkersMap[r.biomarker_id] || null}
                                age={patient.age}
                                gender={patient.gender}
                                hint={r.value_converted !== null && r.use_expected_unit
                                  ? `пересчёт из ${r.value_raw} ${r.unit_raw}`
                                  : undefined}
                              />
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  className={`px-1.5 py-0.5 rounded border text-[10px] ${r.use_expected_unit ? "bg-primary text-primary-foreground" : ""}`}
                                  onClick={() => {
                                    const next = !r.use_expected_unit;
                                    const newVal = next && r.value_converted !== null
                                      ? String(r.value_converted)
                                      : String(r.value_numeric ?? r.value_raw);
                                    updateItem(entry.id, idx, { use_expected_unit: next, edited_value: newVal });
                                  }}
                                  disabled={r.unit_matches && r.value_converted === null}
                                  title={r.unit_matches ? "Единица совпадает" : "Переключить ожидаемая / из PDF"}
                                >
                                  {r.expected_unit}
                                </button>
                                {!r.unit_matches && (
                                  <span className="text-[10px] text-muted-foreground">
                                    / {r.unit_raw || "—"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-muted-foreground">{r.page ?? "—"}</td>
                            <td className="p-2">{statusBadge(r.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {entry.result.unknown.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="text-xs h-7">
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Не сопоставлено с панелью ({entry.result.unknown.length})
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border rounded mt-1 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="p-2 text-left">Показатель в PDF</th>
                              <th className="p-2 text-left">Значение</th>
                              <th className="p-2 text-left">Единица</th>
                              <th className="p-2 text-left">Стр.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.result.unknown.map((u, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2">{u.printed_name}</td>
                                <td className="p-2">{u.value_raw}</td>
                                <td className="p-2">{u.unit_raw}</td>
                                <td className="p-2 text-muted-foreground">{u.page ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 px-1">
                        Эти показатели в файле есть, но в нашей панели биомаркеров их пока нет — они не импортируются.
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
