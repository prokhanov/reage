const riskRows = [
  [
    "Анемия", "Дефицит железа", "Гипотиреоз", "Гипертиреоз", "Дефицит витамина D",
    "Дефицит B12", "Инсулинорезистентность", "Дислипидемия", "Гиперхолестеринемия",
    "Метаболический синдром", "Подагра", "Гиперурикемия", "Дефицит магния",
    "Дефицит цинка", "Дефицит фолиевой кислоты", "Гипергомоцистеинемия",
    "Нарушение функции печени", "Жировой гепатоз", "Хроническое воспаление",
    "Дефицит омега-3", "Нарушение свёртываемости", "Дефицит кальция",
    "Гипергликемия", "Преддиабет", "Нарушение белкового обмена",
    "Дефицит селена", "Оксидативный стресс", "Дефицит витамина А",
    "Нарушение электролитного баланса", "Дефицит йода", "Гиперкалиемия",
    "Гипонатриемия", "Дефицит меди", "Нарушение обмена железа"
  ],
  [
    "Риск атеросклероза", "Риск тромбоза", "Почечная недостаточность",
    "Нефропатия", "Хронический стресс", "Надпочечниковая усталость",
    "Гормональный дисбаланс", "Дефицит тестостерона", "Избыток эстрогенов",
    "Дефицит прогестерона", "Нарушение кортизолового ритма", "Аутоиммунные риски",
    "Дефицит витамина E", "Нарушение кислотно-щелочного баланса",
    "Хроническая усталость", "Саркопения", "Остеопороз",
    "Нарушение микробиома", "Дефицит хрома", "Токсическая нагрузка",
    "Снижение иммунитета", "Хроническая интоксикация", "Нарушение сна",
    "Дефицит витамина K", "Гиперинсулинемия", "Лептинорезистентность",
    "Нарушение обмена мочевой кислоты", "Дефицит CoQ10", "Нарушение детоксикации",
    "Избыток ферритина", "Гемохроматоз", "Дефицит марганца",
    "Нарушение фосфорного обмена", "Дефицит витамина C"
  ],
  [
    "Ускоренное старение", "Системное воспаление", "Эндотелиальная дисфункция",
    "Кардиоваскулярный риск", "Нарушение липидного профиля", "Риск диабета 2 типа",
    "Печёночный стеатоз", "Нарушение минерального обмена", "Дефицит антиоксидантов",
    "Нейродегенеративные риски", "Когнитивное снижение", "Митохондриальная дисфункция",
    "Хроническая гипоксия", "Дисбактериоз", "Нарушение углеводного обмена",
    "Фиброз печени", "Нарушение гемопоэза", "Дефицит витаминов группы B",
    "Гиперпролактинемия", "Нарушение обмена кальция", "Дефицит аминокислот",
    "Нарушение жирового обмена", "Риск остеомаляции", "Периферическая нейропатия",
    "Снижение фертильности", "Ранняя менопауза", "Андрогенный дефицит",
    "Нарушение водно-солевого баланса", "Дефицит пробиотиков",
    "Интестинальная проницаемость", "Риск мочекаменной болезни",
    "Гипофосфатемия", "Нарушение обмена глутатиона", "Клеточное старение"
  ]
];

function RiskBadgesMarquee() {
  const speeds = [400, 360, 380];

  return (
    <div className="space-y-3 overflow-hidden">
      {riskRows.map((row, rowIndex) => {
        const doubled = [...row, ...row];
        return (
          <div key={rowIndex} className="relative">
            <div
              className="flex gap-2 w-max"
              style={{
                animation: `risk-scroll-${rowIndex} ${speeds[rowIndex]}s linear infinite`,
              }}
            >
              {doubled.map((risk, i) => (
                <span
                  key={`${rowIndex}-${i}`}
                  className="inline-flex items-center whitespace-nowrap rounded-full border border-border/60 bg-card/60 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors duration-300"
                >
                  {risk}
                </span>
              ))}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes risk-scroll-0 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes risk-scroll-1 {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes risk-scroll-2 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export function HealthRisksSection() {
  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight animate-fade-in">
            <span className="text-foreground">Выявляем </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">100+ рисков</span>
            <span className="text-foreground"> на ранней стадии</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            AI анализирует биомаркеры и находит скрытые угрозы до появления симптомов
          </p>
        </div>
      </div>
      <RiskBadgesMarquee />
    </section>
  );
}
