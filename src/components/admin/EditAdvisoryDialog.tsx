/**
 * EditAdvisoryDialog — редактирование блоков «Питание и коррекция образа жизни»
 * и «Дополнительные консультации и обследования» напрямую из страницы
 * «Рекомендации» (Prescriptions.tsx) в режиме View As Patient у админа.
 *
 * Данные лежат в recommendations.content_json у записи type='Назначения'.
 * UI повторяет секцию advisory из EditReportDialog, чтобы поведение и вид
 * совпадали one-to-one.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import {
  Activity,
  ClipboardList,
  Moon,
  Plus,
  Stethoscope,
  Trash2,
  Utensils,
} from "lucide-react";
import {
  sanitizeLifestyle,
  extractFollowUpsFromLifestyle,
  mergeFollowUps,
} from "@/components/prescriptions/AdvisorySections";

type LifestyleBlock = {
  nutrition?: string[];
  activity?: string[];
  sleep?: string[];
};

type FollowUp = {
  specialist?: string;
  goal?: string;
  trigger?: string;
};

type LifestyleKey = "nutrition" | "activity" | "sleep";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * userId владельца записи «Назначения». Дополнительный фильтр — на случай,
   * если у пользователя несколько отчётов; берём самый свежий блок с данными.
   */
  userId: string;
  /** Приоритетный analysis_id (например, активных нутрицевтиков). */
  preferredAnalysisId?: string | null;
  /** Начальный фокус при открытии (для UX-скролла к нужной секции). */
  initialFocus?: "lifestyle" | "followups";
  onSaved?: () => void;
}

export function EditAdvisoryDialog({
  open,
  onOpenChange,
  userId,
  preferredAnalysisId,
  initialFocus = "lifestyle",
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const [lifestyle, setLifestyle] = useState<LifestyleBlock>({});
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [rawMarkdown, setRawMarkdown] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setRecommendationId(null);
      setLifestyle({});
      setFollowUps([]);
      setRawMarkdown(undefined);
      try {
        // Пытаемся привязаться к preferredAnalysisId.
        let row: any = null;
        if (preferredAnalysisId) {
          const { data } = await supabase
            .from("recommendations")
            .select("id, content_json, analysis_id, created_at")
            .eq("user_id", userId)
            .eq("type", "Назначения")
            .eq("analysis_id", preferredAnalysisId)
            .order("created_at", { ascending: false })
            .limit(1);
          row = data?.[0] || null;
        }

        // Fallback — последний блок «Назначения» с данными.
        if (!row) {
          const { data } = await supabase
            .from("recommendations")
            .select("id, content_json, analysis_id, created_at")
            .eq("user_id", userId)
            .eq("type", "Назначения")
            .order("created_at", { ascending: false })
            .limit(10);
          for (const r of data || []) {
            const cj: any = (r as any).content_json;
            const ls = (cj?.lifestyle ?? {}) as LifestyleBlock;
            const fu: FollowUp[] = Array.isArray(cj?.follow_ups) ? cj.follow_ups : [];
            const has =
              (ls.nutrition?.length || 0) +
                (ls.activity?.length || 0) +
                (ls.sleep?.length || 0) >
                0 || fu.length > 0;
            if (has) {
              row = r;
              break;
            }
          }
          if (!row && (data?.length || 0) > 0) row = data![0];
        }

        if (cancelled) return;

        if (!row) {
          toast({
            title: "Блок «Назначения» не найден",
            description:
              "У этого пользователя нет отчёта с блоком «Назначения». Отредактировать нечего.",
            variant: "destructive",
          });
          onOpenChange(false);
          return;
        }

        const cj: any = row.content_json || {};
        const rawLs = (cj.lifestyle ?? {}) as LifestyleBlock;
        const rawFu: FollowUp[] = Array.isArray(cj.follow_ups) ? cj.follow_ups : [];
        const extracted = extractFollowUpsFromLifestyle(rawLs);
        const cleanedLs = sanitizeLifestyle(rawLs) as LifestyleBlock;
        const mergedFu = mergeFollowUps(rawFu, extracted);

        setRecommendationId(row.id);
        setLifestyle({
          nutrition: cleanedLs.nutrition || [],
          activity: cleanedLs.activity || [],
          sleep: cleanedLs.sleep || [],
        });
        setFollowUps(mergedFu);
        setRawMarkdown(
          typeof cj.raw_markdown === "string" ? cj.raw_markdown : undefined,
        );
      } catch (e: any) {
        console.error("[EditAdvisoryDialog] load error", e);
        toast({
          title: "Ошибка загрузки",
          description: e?.message || String(e),
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, userId, preferredAnalysisId, onOpenChange, toast]);

  const updateLifestyleItem = (key: LifestyleKey, idx: number, value: string) => {
    setLifestyle((prev) => {
      const arr = [...(prev[key] || [])];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  };

  const addLifestyleItem = (key: LifestyleKey) => {
    setLifestyle((prev) => ({ ...prev, [key]: [...(prev[key] || []), ""] }));
  };

  const removeLifestyleItem = (key: LifestyleKey, idx: number) => {
    setLifestyle((prev) => {
      const arr = [...(prev[key] || [])];
      arr.splice(idx, 1);
      return { ...prev, [key]: arr };
    });
  };

  const updateFollowUp = (idx: number, field: keyof FollowUp, value: string) => {
    setFollowUps((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [field]: value };
      return arr;
    });
  };

  const addFollowUp = () =>
    setFollowUps((prev) => [...prev, { specialist: "", goal: "", trigger: "" }]);

  const removeFollowUp = (idx: number) =>
    setFollowUps((prev) => {
      const arr = [...prev];
      arr.splice(idx, 1);
      return arr;
    });

  const handleSave = async () => {
    if (!recommendationId) return;
    setSaving(true);
    try {
      const cleanArr = (a?: string[]) =>
        (a || []).map((s) => s.trim()).filter(Boolean);
      const newContentJson: any = {
        lifestyle: {
          nutrition: cleanArr(lifestyle.nutrition),
          activity: cleanArr(lifestyle.activity),
          sleep: cleanArr(lifestyle.sleep),
        },
        follow_ups: followUps
          .map((f) => ({
            specialist: (f.specialist || "").trim(),
            goal: (f.goal || "").trim(),
            trigger: (f.trigger || "").trim(),
          }))
          .filter((f) => f.specialist || f.goal),
      };
      if (rawMarkdown) newContentJson.raw_markdown = rawMarkdown;

      const { error } = await supabase
        .from("recommendations")
        // @ts-ignore content_json может ещё отсутствовать в локальных типах
        .update({ content_json: newContentJson })
        .eq("id", recommendationId);
      if (error) throw error;

      toast({
        title: "Сохранено",
        description: "Блоки образа жизни и консультаций обновлены.",
      });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error("[EditAdvisoryDialog] save error", e);
      toast({
        title: "Не удалось сохранить",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderLifestyleGroup = (key: LifestyleKey, label: string, Icon: any) => {
    const items = lifestyle[key] || [];
    return (
      <div className="p-4 bg-card/50 rounded-xl border border-border">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </h4>
        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Пунктов пока нет
            </p>
          )}
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <Textarea
                value={item}
                onChange={(e) => updateLifestyleItem(key, i, e.target.value)}
                className="flex-1 min-h-[60px] text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeLifestyleItem(key, i)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addLifestyleItem(key)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Добавить пункт
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать образ жизни и консультации</DialogTitle>
          <DialogDescription>
            Изменения сохранятся в блок «Назначения» текущего отчёта и сразу
            отобразятся у пациента.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-sm text-muted-foreground">
            Загрузка…
          </div>
        ) : (
          <div className="space-y-6" data-initial-focus={initialFocus}>
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Питание и коррекция образа жизни
              </h2>
              <div className="space-y-4">
                {renderLifestyleGroup("nutrition", "Питание", Utensils)}
                {renderLifestyleGroup(
                  "activity",
                  "Физическая активность",
                  Activity,
                )}
                {renderLifestyleGroup("sleep", "Сон и восстановление", Moon)}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Дополнительные консультации и обследования
              </h2>
              <div className="space-y-3">
                {followUps.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Консультаций пока нет
                  </p>
                )}
                {followUps.map((f, i) => (
                  <div
                    key={i}
                    className="p-4 bg-card/50 rounded-xl border border-border space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Специалист
                          </label>
                          <Input
                            value={f.specialist || ""}
                            onChange={(e) =>
                              updateFollowUp(i, "specialist", e.target.value)
                            }
                            placeholder="Например: Эндокринолог"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Цель
                          </label>
                          <Textarea
                            value={f.goal || ""}
                            onChange={(e) =>
                              updateFollowUp(i, "goal", e.target.value)
                            }
                            className="min-h-[60px]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Основание
                          </label>
                          <Textarea
                            value={f.trigger || ""}
                            onChange={(e) =>
                              updateFollowUp(i, "trigger", e.target.value)
                            }
                            className="min-h-[50px]"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeFollowUp(i)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addFollowUp}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Добавить консультацию
                </Button>
              </div>
            </section>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={saving || !recommendationId}>
                {saving && <ButtonSpinner />}
                Сохранить
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
