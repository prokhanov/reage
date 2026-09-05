import { ArrowRight, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemedLogo } from "@/components/ThemedLogo";
import { useRegisterGuard } from "@/components/RegisterGuard";

const capabilities = [
  ["01", "Расширенный чекап", "До четырёх исследований в год: на дому или в клинике, без разрозненных результатов."],
  ["02", "100+ показателей", "Собираем ключевые маркеры организма в единую, понятную картину здоровья."],
  ["03", "Персональный отчёт", "Объясняем значения, взаимосвязи и причины изменений простым языком."],
  ["04", "Рекомендации врача", "Формируем конкретный план питания, образа жизни и приёма нутрицевтиков."],
  ["05", "Динамика здоровья", "Сравниваем результаты чекапов и показываем, что действительно меняется со временем."],
  ["06", "Личный ассистент", "Храним историю, назначения и следующие шаги в одном личном кабинете."],
] as const;

const reportRows = [
  ["Биологический возраст", "34.2 года", "−3.8"],
  ["Индекс здоровья", "87%", "Оптимально"],
  ["Показателей изучено", "104", "Полный чекап"],
] as const;

export function ConsiliumStyleShowcase() {
  const { requestRegister } = useRegisterGuard();

  return (
    <div className="consilium-v2">
      <style>{`
        .consilium-v2 {
          --cv2-paper: 43 35% 96%;
          --cv2-surface: 42 24% 91%;
          --cv2-ink: 75 25% 14%;
          --cv2-muted: 65 10% 38%;
          --cv2-line: 48 15% 80%;
          --cv2-green: 151 34% 24%;
          --cv2-green-foreground: 43 35% 96%;
          --cv2-ochre: 31 68% 48%;
          background: hsl(var(--cv2-paper));
          color: hsl(var(--cv2-ink));
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .consilium-v2 .cv2-display {
          font-family: Fraunces, Georgia, serif;
          font-weight: 400;
          letter-spacing: 0;
        }
        .consilium-v2 .cv2-label {
          font-family: "JetBrains Mono", ui-monospace, monospace;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        .consilium-v2 .cv2-rule-grid {
          background-image: linear-gradient(to right, hsl(var(--cv2-line)) 1px, transparent 1px);
          background-size: 25% 100%;
        }
        .consilium-v2 .cv2-rise { animation: cv2-rise .7s cubic-bezier(.22,1,.36,1) both; }
        @keyframes cv2-rise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .consilium-v2 .cv2-rise { animation: none; }
        }
      `}</style>

      <header className="border-b border-[hsl(var(--cv2-line))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-6">
          <ThemedLogo className="h-9 w-auto" />
          <Button
            variant="outline"
            onClick={() => window.location.assign("/auth")}
            className="border-[hsl(var(--cv2-line))] bg-transparent text-[hsl(var(--cv2-ink))] hover:bg-[hsl(var(--cv2-surface))] hover:text-[hsl(var(--cv2-ink))]"
          >
            Войти
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 md:px-6">
        <section className="cv2-rule-grid border-b border-[hsl(var(--cv2-line))] py-14 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.12fr_.88fr] lg:items-center">
            <div className="cv2-rise max-w-3xl">
              <p className="cv2-label text-[11px] text-[hsl(var(--cv2-muted))]">
                Превентивная медицина · Москва и Санкт-Петербург
              </p>
              <h1 className="cv2-display mt-6 text-[42px] leading-[1.03] sm:text-6xl md:text-[68px]">
                Ваше здоровье
                <span className="block text-[hsl(var(--cv2-ochre))]">как ясная система,</span>
                <span className="block text-[hsl(var(--cv2-muted))]">а не набор анализов</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-[hsl(var(--cv2-muted))] md:text-[17px]">
                Регулярные чекапы, понятная расшифровка показателей и персональная стратегия — вся история здоровья в одном месте.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  onClick={requestRegister}
                  className="bg-[hsl(var(--cv2-green))] text-[hsl(var(--cv2-green-foreground))] hover:bg-[hsl(var(--cv2-green)/.9)]"
                >
                  Посмотреть демо-аккаунт
                  <ArrowRight />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-feedback-dialog"))}
                  className="border-[hsl(var(--cv2-line))] bg-[hsl(var(--cv2-paper))] text-[hsl(var(--cv2-ink))] hover:bg-[hsl(var(--cv2-surface))] hover:text-[hsl(var(--cv2-ink))]"
                >
                  Оставить заявку
                </Button>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-[hsl(var(--cv2-muted))]">
                <MapPin className="h-4 w-4 text-[hsl(var(--cv2-green))]" />
                Анализы на дому или в клинике
              </p>
            </div>

            <div className="cv2-rise border border-[hsl(var(--cv2-line))] bg-[hsl(var(--cv2-paper))] p-5 shadow-[0_18px_50px_-34px_hsl(var(--cv2-ink)/.45)] md:p-7" style={{ animationDelay: ".12s" }}>
              <div className="flex items-center justify-between border-b border-[hsl(var(--cv2-line))] pb-5">
                <div>
                  <p className="cv2-label text-[10px] text-[hsl(var(--cv2-muted))]">Персональный отчёт</p>
                  <p className="cv2-display mt-2 text-2xl">Картина здоровья</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--cv2-green))] text-[hsl(var(--cv2-green-foreground))]">
                  <Check className="h-5 w-5" />
                </div>
              </div>
              <div className="divide-y divide-[hsl(var(--cv2-line))]">
                {reportRows.map(([label, value, note]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto] gap-5 py-5">
                    <div>
                      <p className="text-sm text-[hsl(var(--cv2-muted))]">{label}</p>
                      <p className="cv2-display mt-1 text-2xl">{value}</p>
                    </div>
                    <span className="self-end text-right text-xs font-medium text-[hsl(var(--cv2-green))]">{note}</span>
                  </div>
                ))}
              </div>
              <div className="mt-1 border-t border-[hsl(var(--cv2-line))] pt-5">
                <div className="flex items-center justify-between text-xs text-[hsl(var(--cv2-muted))]">
                  <span>Динамика за 6 месяцев</span>
                  <span className="font-medium text-[hsl(var(--cv2-green))]">Улучшение</span>
                </div>
                <div className="mt-3 grid grid-cols-12 items-end gap-1" aria-hidden="true">
                  {[28, 35, 31, 48, 44, 57, 51, 63, 67, 72, 78, 86].map((height, index) => (
                    <span
                      key={index}
                      className="block bg-[hsl(var(--cv2-green))] opacity-80"
                      style={{ height }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[hsl(var(--cv2-line))] py-16 md:py-24">
          <div className="mb-10 max-w-2xl md:mb-14">
            <p className="cv2-label text-[11px] text-[hsl(var(--cv2-muted))]">Всё необходимое</p>
            <h2 className="cv2-display mt-5 text-4xl leading-tight md:text-5xl">Контроль здоровья — от анализа до результата</h2>
          </div>
          <div className="grid overflow-hidden rounded-lg border border-[hsl(var(--cv2-line))] bg-[hsl(var(--cv2-line))] sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(([number, title, text]) => (
              <article
                key={number}
                className="m-px min-h-56 bg-[hsl(var(--cv2-paper))] px-6 py-8 transition-colors duration-300 hover:bg-[hsl(var(--cv2-surface))] md:px-8 md:py-10"
              >
                <span className="cv2-label text-[11px] text-[hsl(var(--cv2-ochre))]">{number}</span>
                <h3 className="cv2-display mt-5 text-2xl">{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--cv2-muted))]">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}