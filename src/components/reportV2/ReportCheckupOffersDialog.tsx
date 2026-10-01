import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notify } from "@/lib/toast";
import {
  decorateReportOffers,
  manageReportOffers,
  type ReportCheckupCandidate,
  type ReportCheckupOffer,
} from "@/lib/reportCheckupOffers";

const money = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;

export function ReportCheckupOffersDialog({
  analysisId,
  open,
  onOpenChange,
  onSaved,
}: {
  analysisId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (offers: ReportCheckupOffer[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState<ReportCheckupCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    manageReportOffers(analysisId, "list")
      .then((payload) => {
        if (cancelled) return;
        setCandidates(payload.candidates);
        setSelected(new Set(payload.selected.map((offer) => offer.advertised_checkup_slug)));
      })
      .catch((error) => notify.error("Не удалось загрузить баннеры", error instanceof Error ? error.message : String(error)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [analysisId, open]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = await manageReportOffers(analysisId, "save", [...selected]);
      const offers = await decorateReportOffers(payload.selected);
      onSaved(offers);
      onOpenChange(false);
      notify.success("Баннеры сохранены", offers.length > 0 ? `Добавлено: ${offers.length}` : "Баннеры убраны");
    } catch (error) {
      notify.error("Не удалось сохранить баннеры", error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Баннеры в конце отчёта</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Загружаю чекапы…
          </div>
        ) : candidates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Для этого отчёта нет доступных предложений.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {candidates.map((candidate) => {
              const checked = selected.has(candidate.slug);
              return (
                <label key={candidate.slug} className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => setSelected((current) => {
                      const next = new Set(current);
                      if (value === true) next.add(candidate.slug);
                      else next.delete(candidate.slug);
                      return next;
                    })}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{candidate.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {money(candidate.listPrice)} → <b className="text-foreground">{money(candidate.finalPrice)}</b>
                      {candidate.pricingMode === "full_upgrade"
                        ? ` · зачёт ${money(candidate.sourcePaid)} и ещё −10%`
                        : " · персональная скидка −10%"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Отмена</Button>
          <Button onClick={save} disabled={loading || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}