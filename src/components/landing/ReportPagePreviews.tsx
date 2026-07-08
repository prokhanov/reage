/**
 * Векторные HTML-превью страниц отчёта для лендинга.
 * Рендерятся текстом на нативном размере карточки — текст всегда чёткий,
 * не зависит от dpr и не пикселизируется при даунскейле.
 *
 * Стили изолированы (обычные классы Tailwind + inline). Внешне повторяют
 * визуальный язык настоящего отчёта (reportLab), но без реальных данных.
 */

function PageShell({
  children,
  eyebrow,
  pageLabel,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  pageLabel?: string;
}) {
  return (
    <div
      className="absolute inset-0 bg-[#fdfaf5] text-[#2b2418] flex flex-col"
      style={{ padding: "6% 7% 5%" }}
    >
      {(eyebrow || pageLabel) && (
        <div
          className="flex items-center justify-between uppercase tracking-[0.18em] text-[#8a7a5f]"
          style={{ fontSize: "clamp(7px, 1.1cqw, 10px)" }}
        >
          <span>{eyebrow}</span>
          <span>{pageLabel}</span>
        </div>
      )}
      <div className="flex-1 min-h-0 mt-[4%]">{children}</div>
    </div>
  );
}

/** Титульная страница */
export function PreviewCover() {
  return (
    <div
      className="absolute inset-0 flex flex-col justify-between text-[#f3ead6]"
      style={{
        background:
          "radial-gradient(120% 90% at 15% 10%, #3b2c1a 0%, #1a120a 55%, #0b0805 100%)",
        padding: "8% 8% 7%",
        containerType: "inline-size",
      }}
    >
      <div>
        <div
          className="uppercase tracking-[0.35em] text-[#c9a961]"
          style={{ fontSize: "clamp(8px, 1.4cqw, 12px)" }}
        >
          ReAge · Персональный отчёт
        </div>
        <div
          className="mt-[6%] uppercase tracking-[0.22em] text-[#e7d9b3]/70"
          style={{ fontSize: "clamp(7px, 1.1cqw, 10px)" }}
        >
          Полная оценка состояния организма
        </div>
      </div>

      <div>
        <div
          className="font-serif leading-[1.05]"
          style={{
            fontSize: "clamp(28px, 8cqw, 68px)",
            color: "#f3ead6",
            letterSpacing: "-0.01em",
          }}
        >
          Иванова
          <br />
          Елена
        </div>
        <div
          className="mt-[4%] italic text-[#c9a961]"
          style={{ fontSize: "clamp(10px, 1.8cqw, 15px)" }}
        >
          персонализировано
        </div>
      </div>

      <div
        className="flex items-end justify-between text-[#c9a961]/80"
        style={{ fontSize: "clamp(7px, 1.15cqw, 10px)" }}
      >
        <div className="uppercase tracking-[0.2em]">
          <div>Дата анализов</div>
          <div className="mt-1 text-[#f3ead6]/90">14 марта 2026</div>
        </div>
        <div className="text-right uppercase tracking-[0.2em]">
          <div>Издание</div>
          <div className="mt-1 text-[#f3ead6]/90">01 / 2026</div>
        </div>
      </div>
    </div>
  );
}

/** Страница раздела: сердечно-сосудистая система */
export function PreviewSection() {
  return (
    <div className="absolute inset-0" style={{ containerType: "inline-size" }}>
      <PageShell
        eyebrow="Сердечно-сосудистая система"
        pageLabel="ReAge · Report"
      >
        <div className="flex items-start gap-[4%]">
          <div
            className="font-serif text-[#b8935a] leading-none"
            style={{ fontSize: "clamp(28px, 8cqw, 64px)" }}
          >
            02
          </div>
          <div className="flex-1">
            <div
              className="font-serif leading-[1.1] text-[#2b2418]"
              style={{ fontSize: "clamp(14px, 3.6cqw, 28px)", letterSpacing: "-0.01em" }}
            >
              Сердечно-сосудистая
              <br />
              система
            </div>
          </div>
          <div
            className="text-right uppercase tracking-[0.18em] text-[#8a7a5f] pt-[2%]"
            style={{ fontSize: "clamp(6px, 0.95cqw, 9px)" }}
          >
            Раздел 2 из 5
          </div>
        </div>

        <div
          className="mt-[4%] border-t border-[#d9cba9]"
          style={{ height: 1 }}
        />

        <div
          className="mt-[4%] space-y-[2.5%] text-[#3a2f1f]/85"
          style={{ fontSize: "clamp(7px, 1.35cqw, 11px)", lineHeight: 1.55 }}
        >
          <p>
            Ваша сердечно-сосудистая система — это сложная транспортная сеть,
            состоящая из сердца, артерий, вен и капилляров. Её главная задача —
            доставлять к каждой клетке кислород и питательные вещества.
          </p>
          <p>
            Когда в этой системе возникают сбои, это может проявляться не сразу.
            Постепенное сужение сосудов, изменение вязкости крови или хроническое
            воспаление долго остаются незамеченными.
          </p>
          <p>
            Проведённые исследования показывают, что у Вас есть очень сильные
            стороны — в частности превосходный липидный профиль. Вместе с тем
            выявлены отклонения, требующие внимания.
          </p>
        </div>

        <div
          className="mt-[4%] font-semibold text-[#2b2418]"
          style={{ fontSize: "clamp(8px, 1.5cqw, 12px)" }}
        >
          Интерпретация биомаркеров
        </div>

        <div
          className="mt-[2%] rounded-[6px] border border-[#e6d9b8] bg-white/70"
          style={{ padding: "3.5% 4%" }}
        >
          <div className="flex items-center justify-between">
            <div
              className="font-serif text-[#2b2418]"
              style={{ fontSize: "clamp(9px, 1.8cqw, 14px)" }}
            >
              Общий холестерин{" "}
              <span className="text-[#8a7a5f]" style={{ fontSize: "0.75em" }}>
                (TC)
              </span>
            </div>
            <div
              className="flex items-center gap-1 rounded-full text-[#8a6a1a] bg-[#f6e7b8]"
              style={{
                fontSize: "clamp(6px, 1cqw, 9px)",
                padding: "2px 8px",
              }}
            >
              <span
                className="rounded-full bg-[#d8a521]"
                style={{ width: 5, height: 5 }}
              />
              Допустимо
            </div>
          </div>
          <div
            className="mt-[3%] text-[#3a2f1f]"
            style={{ fontSize: "clamp(7px, 1.3cqw, 10px)" }}
          >
            Ваш показатель — <span className="font-semibold">5.04</span> ммоль/л
          </div>

          {/* Шкала */}
          <div
            className="mt-[2%] rounded-full overflow-hidden flex"
            style={{ height: "clamp(6px, 1.1cqw, 9px)" }}
          >
            <div style={{ width: "15%", background: "#c94a3a" }} />
            <div style={{ width: "15%", background: "#d8a521" }} />
            <div style={{ width: "35%", background: "#7db860" }} />
            <div style={{ width: "20%", background: "#d8a521" }} />
            <div style={{ width: "15%", background: "#c94a3a" }} />
          </div>
          <div
            className="mt-[2%] text-[#8a7a5f]"
            style={{ fontSize: "clamp(6px, 1cqw, 9px)" }}
          >
            <span
              className="inline-block rounded-full bg-[#7db860] align-middle mr-1"
              style={{ width: 6, height: 6 }}
            />
            Оптимальный диапазон: 3.80 – 4.80 ммоль/л
          </div>

          <div
            className="mt-[3%] text-[#3a2f1f]/85"
            style={{ fontSize: "clamp(6.5px, 1.15cqw, 9.5px)", lineHeight: 1.5 }}
          >
            Этот показатель отражает общую концентрацию холестерина в крови,
            включая «плохие» и «хорошие» фракции. Ваше значение выше
            оптимального, но само по себе не является признаком высокого риска.
          </div>
        </div>
      </PageShell>
    </div>
  );
}

/** Страница персональных рекомендаций */
export function PreviewPrescriptions() {
  const items = [
    {
      title: "Омега-3 (EPA + DHA)",
      dose: "2000 мг / сут",
      note: "во время еды, курс 3 месяца",
      tone: "#7db860",
    },
    {
      title: "Витамин D3",
      dose: "5000 МЕ / сут",
      note: "утром, с жирной пищей",
      tone: "#c9a961",
    },
    {
      title: "Магний (глицинат)",
      dose: "400 мг / сут",
      note: "вечером, за 1 ч до сна",
      tone: "#7db860",
    },
    {
      title: "Коэнзим Q10",
      dose: "200 мг / сут",
      note: "с завтраком",
      tone: "#c9a961",
    },
  ];
  return (
    <div className="absolute inset-0" style={{ containerType: "inline-size" }}>
      <PageShell eyebrow="Персональные рекомендации" pageLabel="ReAge · Report">
        <div className="flex items-start gap-[4%]">
          <div
            className="font-serif text-[#b8935a] leading-none"
            style={{ fontSize: "clamp(28px, 8cqw, 64px)" }}
          >
            06
          </div>
          <div className="flex-1">
            <div
              className="font-serif leading-[1.1] text-[#2b2418]"
              style={{ fontSize: "clamp(14px, 3.6cqw, 28px)", letterSpacing: "-0.01em" }}
            >
              Персональные
              <br />
              назначения
            </div>
          </div>
          <div
            className="text-right uppercase tracking-[0.18em] text-[#8a7a5f] pt-[2%]"
            style={{ fontSize: "clamp(6px, 0.95cqw, 9px)" }}
          >
            Раздел 6 из 6
          </div>
        </div>

        <div
          className="mt-[4%] border-t border-[#d9cba9]"
          style={{ height: 1 }}
        />

        <p
          className="mt-[4%] text-[#3a2f1f]/85"
          style={{ fontSize: "clamp(7px, 1.35cqw, 11px)", lineHeight: 1.55 }}
        >
          Ниже — точные дозировки и режим приёма, подобранные с учётом Ваших
          биомаркеров, возраста и цели по продлению здоровой активности.
        </p>

        <div className="mt-[4%] space-y-[2%]">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-[5px] border border-[#e6d9b8] bg-white/70 flex items-center gap-[3%]"
              style={{ padding: "2.5% 3.5%" }}
            >
              <div
                className="rounded-full shrink-0"
                style={{
                  width: "clamp(7px, 1.4cqw, 11px)",
                  height: "clamp(7px, 1.4cqw, 11px)",
                  background: it.tone,
                }}
              />
              <div className="flex-1 min-w-0">
                <div
                  className="font-serif text-[#2b2418] truncate"
                  style={{ fontSize: "clamp(9px, 1.7cqw, 13px)" }}
                >
                  {it.title}
                </div>
                <div
                  className="text-[#8a7a5f] truncate"
                  style={{ fontSize: "clamp(6.5px, 1.1cqw, 9.5px)" }}
                >
                  {it.note}
                </div>
              </div>
              <div
                className="font-semibold text-[#2b2418] shrink-0 text-right"
                style={{ fontSize: "clamp(8px, 1.5cqw, 12px)" }}
              >
                {it.dose}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-[4%] rounded-[5px]"
          style={{
            padding: "3% 4%",
            background: "linear-gradient(135deg, #2b2418, #4a3a22)",
            color: "#f3ead6",
          }}
        >
          <div
            className="uppercase tracking-[0.2em] text-[#c9a961]"
            style={{ fontSize: "clamp(6px, 1cqw, 9px)" }}
          >
            Пересмотр протокола
          </div>
          <div
            className="mt-[1%] font-serif"
            style={{ fontSize: "clamp(9px, 1.7cqw, 13px)" }}
          >
            Через 3 месяца — контрольная сдача 8 маркеров.
          </div>
        </div>
      </PageShell>
    </div>
  );
}
