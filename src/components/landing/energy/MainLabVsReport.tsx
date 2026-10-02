type Item = {
  lead: string;
  text: string;
};

const LAB_ITEMS: Item[] = [
  {
    lead: "Норма для «среднего человека».",
    text: "В референс попадают и люди с заболеваниями, поэтому «в норме» не значит «хорошо».",
  },
  {
    lead: "Каждый показатель отдельно.",
    text: "Нормальный гемоглобин не скажет, что запасы железа на исходе.",
  },
  {
    lead: "Таблица без выводов.",
    text: "Что делать с отклонениями — непонятно.",
  },
  {
    lead: "Каждый раз с нуля.",
    text: "Прошлые бланки лежат в почте и ни с чем не сравниваются.",
  },
];

const REAGE_ITEMS: Item[] = [
  {
    lead: "Оптимальный диапазон.",
    text: "Видно, где показатель формально в норме, но уже требует внимания.",
  },
  {
    lead: "Связи между показателями.",
    text: "Ферритин, гемоглобин и витамин D считаются вместе, а не по отдельности.",
  },
  {
    lead: "План действий.",
    text: "Что изменить в питании и образе жизни, что обсудить с врачом.",
  },
  {
    lead: "История.",
    text: "Каждая новая сдача сравнивается с предыдущими.",
  },
];

function Card({
  title,
  items,
  tone,
}: {
  title: string;
  items: Item[];
  tone: "lab" | "reage";
}) {
  return (
    <div
      className={
        tone === "reage"
          ? "rounded-2xl bg-primary/10 p-7 sm:p-9 lg:p-10"
          : "rounded-2xl border border-border/70 bg-card p-7 sm:p-9 lg:p-10"
      }
    >
      <p className="text-[0.95rem] font-semibold text-foreground/70">{title}</p>
      <div className="mt-6 space-y-5">
        {items.map((item) => (
          <p
            key={item.lead}
            className="text-[15px] leading-relaxed text-muted-foreground sm:text-base"
          >
            <span className="font-semibold text-foreground">{item.lead}</span>{" "}
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export function MainLabVsReport({ id }: { id?: string }) {
  return (
    <section id={id} className="border-b hairline bg-muted/40 py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <h2 className="font-display max-w-[760px] text-balance text-3xl leading-[1.15] text-foreground sm:text-4xl md:text-[2.75rem]">
          Лаборатория даёт цифры. ReAge объясняет, что с&nbsp;ними делать
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-2 md:gap-6">
          <Card title="Бланк из лаборатории" items={LAB_ITEMS} tone="lab" />
          <Card title="Отчёт ReAge" items={REAGE_ITEMS} tone="reage" />
        </div>
      </div>
    </section>
  );
}
