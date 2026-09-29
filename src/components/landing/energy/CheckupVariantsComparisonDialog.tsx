import { Fragment, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Minus } from "lucide-react";
import { money, markersLabel } from "@/data/checkups";
import { useResolvedCheckups } from "@/hooks/useResolvedCheckups";
import { DIRECTIONS, renderLevel } from "@/components/landing/BiomarkerComparisonDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** slug любого варианта чекапа (или самого чекапа) */
  checkupSlug: string;
}

function renderCell(included: boolean) {
  return included ? (
    <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
      <Check className="h-4 w-4 text-primary" />
    </div>
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
  );
}

/** Кому подойдёт / что покрывает — по позиции варианта: 0 базовый, 1 оптимальный, 2 премиум. */
const VARIANTS_AUDIENCE: Record<"basic" | "plus" | "expert", { who: string; gain: string }> = {
  basic: {
    who: "Тем, кто впервые сдаёт расширенный чекап и хочет получить общую картину по всем системам",
    gain: "Базовая оценка всех систем организма за один визит и выявление явных отклонений",
  },
  plus: {
    who: "Тем, у кого есть жалобы или факторы риска и кто хочет разобрать ключевые системы глубже",
    gain: "Расширенная глубина по сердцу, гормонам, дефицитам и воспалению",
  },
  expert: {
    who: "Тем, кто хочет максимально полную картину старения и осознанно управлять биологическим возрастом",
    gain: "Максимальный охват показателей по всем направлениям и контроль маркеров старения",
  },
};

/** Сравнение вариантов одного чекапа: цены и состав показателей. */
export function CheckupVariantsComparisonDialog({ open, onOpenChange, checkupSlug }: Props) {
  const { variantsFor, groupsOf } = useResolvedCheckups();

  const variants = useMemo(() => variantsFor(checkupSlug), [variantsFor, checkupSlug]);

  const columns = useMemo(
    () =>
      variants.map((v) => {
        const groups = groupsOf(v.checkup.slug);
        const names = new Set(groups.flatMap((g) => g.markers));
        const count = groups.reduce((n, g) => n + g.markers.length, 0);
        return { variant: v.variant, checkup: v.checkup, names, count };
      }),
    [variants, groupsOf],
  );

  const categories = useMemo(() => {
    const seen = new Map<string, string[]>();
    for (const col of columns) {
      for (const g of groupsOf(col.checkup.slug)) {
        const arr = seen.get(g.title) ?? [];
        for (const m of g.markers) {
          if (!arr.includes(m)) arr.push(m);
        }
        seen.set(g.title, arr);
      }
    }
    return Array.from(seen.entries()).map(([name, markers]) => ({ name, markers }));
  }, [columns, groupsOf]);

  const popularSlug = columns.find((c) => c.variant.is_popular)?.checkup.slug;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl">Сравнение вариантов чекапа</DialogTitle>
          <DialogDescription>Что входит в каждый вариант и сколько он стоит</DialogDescription>
        </DialogHeader>

        {columns.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">Варианты пока не настроены</div>
        ) : (
          <Tabs defaultValue="overview" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="self-start flex-wrap">
              <TabsTrigger value="overview">Что отслеживаем</TabsTrigger>
              <TabsTrigger value="markers">Показатели</TabsTrigger>
            </TabsList>

            {/* ===== Tab 1: Что отслеживаем ===== */}
            <TabsContent value="overview" className="-mx-6 mt-4 flex-1 overflow-auto px-6">
              <p className="sticky top-0 z-10 mb-3 bg-background py-2 text-xs text-muted-foreground">
                Шкала: <span className="font-semibold text-primary">●</span> базово ·{" "}
                <span className="font-semibold text-primary">●●</span> хорошо ·{" "}
                <span className="font-semibold text-primary">●●●</span> максимально · — не входит
              </p>
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border">
                    <th className="min-w-[180px] px-2 py-3 text-left text-sm font-semibold text-foreground">
                      Направление
                    </th>
                    {columns.map((c) => (
                      <th
                        key={c.checkup.slug}
                        className={`min-w-[110px] px-2 py-3 text-center align-top ${
                          c.checkup.slug === popularSlug ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="text-base font-bold text-primary">{c.variant.label}</div>
                        <div className="mt-1 text-sm font-bold text-foreground">{money(c.checkup.price)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DIRECTIONS.map((d) => (
                    <tr
                      key={d.title}
                      className="border-b border-border/50 align-top transition-colors hover:bg-muted/30"
                    >
                      <td className="px-2 py-2.5 text-sm text-foreground">
                        <div className="font-medium">{d.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{d.hint}</div>
                      </td>
                      {columns.map((c, idx) => {
                        const slug = idx === 0 ? "basic" : idx === 1 ? "plus" : "expert";
                        return (
                          <td
                            key={c.checkup.slug}
                            className={`px-2 py-2.5 text-center ${
                              c.checkup.slug === popularSlug ? "bg-primary/5" : ""
                            }`}
                          >
                            {renderLevel(d.levels[slug])}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>

            {/* ===== Tab 2: Показатели ===== */}
            <TabsContent value="markers" className="-mx-6 mt-2 flex-1 overflow-auto px-6">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border">
                  <th className="min-w-[180px] px-2 py-3 text-left text-sm font-semibold text-foreground">
                    Показатель
                  </th>
                  {columns.map((c) => (
                    <th
                      key={c.checkup.slug}
                      className={`min-w-[110px] px-2 py-3 text-center align-top ${
                        c.checkup.slug === popularSlug ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="text-base font-bold text-primary">{c.variant.label}</div>
                      {c.variant.is_popular && (
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
                          Популярный
                        </div>
                      )}
                      <div className="mt-1 text-sm font-bold text-foreground">{money(c.checkup.price)}</div>
                      <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                        {markersLabel(c.count)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <Fragment key={cat.name}>
                    <tr className="bg-muted/40">
                      <td
                        colSpan={columns.length + 1}
                        className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-primary"
                      >
                        {cat.name}
                      </td>
                    </tr>
                    {cat.markers.map((name) => (
                      <tr key={name} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                        <td className="px-2 py-2.5 text-sm text-foreground">{name}</td>
                        {columns.map((c) => (
                          <td
                            key={c.checkup.slug}
                            className={`px-2 py-2.5 text-center ${
                              c.checkup.slug === popularSlug ? "bg-primary/5" : ""
                            }`}
                          >
                            {renderCell(c.names.has(name))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
