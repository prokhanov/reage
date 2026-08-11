import { Check, Minus, X } from "lucide-react";

type Mark = "yes" | "no" | "partial";

interface Row {
  feature: string;
  reage: Mark | string;
  dms: Mark | string;
  checkup: Mark | string;
  none: Mark | string;
}

const rows: Row[] = [
  {
    feature: "Что покупает компания",
    reage: "Управление риском до болезни",
    dms: "Лечение по факту обращения",
    checkup: "Разовый срез показателей",
    none: "—",
  },
  { feature: "Ранние отклонения до диагноза", reage: "yes", dms: "no", checkup: "partial", none: "no" },
  { feature: "Персональный план действий", reage: "yes", dms: "no", checkup: "partial", none: "no" },
  { feature: "Динамика внутри года", reage: "4 раза в год", dms: "no", checkup: "Раз в год", none: "no" },
  { feature: "Вовлечённость сотрудника", reage: "Личный кабинет и ассистент", dms: "Полис в почте", checkup: "PDF с цифрами", none: "no" },
  { feature: "Отчётность для компании", reage: "Обезличенная аналитика", dms: "Убыточность полиса", checkup: "no", none: "no" },
  { feature: "Приватность данных сотрудника", reage: "yes", dms: "partial", checkup: "partial", none: "yes" },
];

function Cell({ value, highlight }: { value: Mark | string; highlight?: boolean }) {
  if (value === "yes")
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
        <Check className="w-4 h-4 text-emerald-500" />
      </div>
    );
  if (value === "no")
    return (
      <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
        <X className="w-4 h-4 text-muted-foreground/60" />
      </div>
    );
  if (value === "partial")
    return (
      <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
        <Minus className="w-4 h-4 text-amber-500" />
      </div>
    );
  return (
    <span className={`text-sm ${highlight ? "text-primary font-medium" : "text-muted-foreground"}`}>
      {value}
    </span>
  );
}

export function VsDmsTable() {
  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      <div className="relative z-10 mx-auto w-full max-w-[74rem] px-4">
        <div className="text-center max-w-3xl mx-auto mb-14 md:mb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="text-foreground">Почему это не заменяет ДМС </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">и не повторяет чекап</span>
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: "0.15s" }}>
            ДМС покрывает лечение, когда проблема уже есть. Корпоративный чекап фиксирует
            состояние один раз в год. ReAge работает в промежутке — там, где риск ещё управляем.
          </p>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <div className="relative min-w-[900px]">
            <div
              aria-hidden
              className="absolute bg-primary/5 rounded-3xl border border-primary/10"
              style={{ left: "34%", width: "16.5%", top: "-1rem", bottom: "-1rem" }}
            />

            <div className="relative grid grid-cols-[34%_16.5%_16.5%_16.5%_16.5%] mb-2">
              <div />
              <div className="text-center py-6 text-lg font-bold text-primary">ReAge</div>
              <div className="text-center py-6 text-lg font-bold text-foreground">ДМС</div>
              <div className="text-center py-6 text-lg font-bold text-foreground">Корп. чекап</div>
              <div className="text-center py-6 text-lg font-bold text-foreground">Ничего</div>
            </div>

            <div className="relative rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 px-6">
              {rows.map((r) => (
                <div
                  key={r.feature}
                  className="grid grid-cols-[34%_16.5%_16.5%_16.5%_16.5%] py-5 border-b border-border/50 last:border-0 items-center"
                >
                  <div className="text-sm font-medium text-foreground pr-4">{r.feature}</div>
                  <div className="text-center"><Cell value={r.reage} highlight /></div>
                  <div className="text-center"><Cell value={r.dms} /></div>
                  <div className="text-center"><Cell value={r.checkup} /></div>
                  <div className="text-center"><Cell value={r.none} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
