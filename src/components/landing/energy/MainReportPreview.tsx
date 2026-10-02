import { useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkerCard, markers as MARKERS } from "@/components/landing/energy/EnergyExpertResult";

const STATS = [
  { value: "60", label: "страниц" },
  { value: "116", label: "показателей с разбором" },
  { value: "5", label: "систем организма" },
  { value: "1", label: "план действий на всё" },
];

const TOC: { label: string; note?: string; count?: number; active?: boolean }[] = [
  { label: "Сводка и биовозраст" },
  { label: "Энергия и восстановление", count: 28, active: true },
  { label: "Сердце и сосуды", count: 22 },
  { label: "Воспаление и иммунитет", count: 17 },
  { label: "Гормоны и стресс", count: 10 },
  { label: "Метаболизм, печень и почки", count: 39 },
  { label: "План действий" },
  { label: "Динамика", note: "со 2-й сдачи" },
];

export function MainReportPreview({ id }: { id?: string }) {
  const [opened, setOpened] = useState<Set<number>>(() => new Set([0]));
  const toggle = (i: number) =>
    setOpened((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  return (
    <section id={id} className="border-b hairline py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl leading-[1.15] text-foreground sm:text-4xl md:text-[2.75rem]">
            Отчёт полного чекапа — 60 страниц о вашем организме
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Каждый из 116 показателей разобран так, как ниже: значение, оптимум, что это значит для вас и что делать дальше.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:mt-10 md:grid-cols-4 md:gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/70 bg-card px-5 py-4 sm:px-6 sm:py-5">
              <p className="font-display text-3xl text-foreground sm:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground sm:text-[15px]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem] lg:gap-8">
          <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Фрагмент · раздел «Энергия и восстановление»
              </p>
              <p className="text-xs text-muted-foreground">1 из 116 показателей</p>
            </div>
            <div className="space-y-3">
              {MARKERS.map((m, i) => (
                <MarkerCard
                  key={m.code}
                  marker={m}
                  defaultOpen={false}
                  description={m.fallbackDescription}
                  open={opened.has(i)}
                  onToggle={() => toggle(i)}
                />
              ))}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/40 px-5 py-4 sm:px-6">
                <p className="text-[15px] text-foreground">…и ещё 113 показателей в 5 разделах</p>
                <p className="shrink-0 text-sm text-muted-foreground">в полном отчёте</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6">
              <h3 className="mb-3 font-display text-2xl text-foreground">Что внутри отчёта</h3>
              <ul>
                {TOC.map((t) => (
                  <li
                    key={t.label}
                    className={cn(
                      "flex items-center justify-between gap-3 border-b border-border/60 px-3 py-3 text-[15px] last:border-b-0",
                      t.active && "rounded-xl border-transparent bg-primary/10 font-semibold text-foreground",
                    )}
                  >
                    <span className="text-foreground">
                      {t.label}
                      {t.note && <span className="ml-1 text-sm text-muted-foreground">{t.note}</span>}
                    </span>
                    {t.count != null && <span className="tabular-nums text-muted-foreground">{t.count}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 px-3 text-xs text-muted-foreground">Цифры справа — показателей в разделе</p>
            </div>
            <Button asChild size="lg" className="w-full">
              <Link to="/example-report">Скачать пример отчёта · PDF, 60 стр.</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link to="/demo-report">Открыть демо-кабинет</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              В тематических чекапах отчёт короче — только по выбранным показателям.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
