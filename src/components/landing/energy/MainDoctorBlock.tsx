import { ArrowUpRight } from "lucide-react";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";
import doctorPhoto from "@/assets/energy/reage-doctor.webp";

const STEPS = [
  { n: 1, title: "До встречи", text: "Изучает отчёт и прошлые сдачи" },
  { n: 2, title: "Консультация", text: "Онлайн, 40 минут: отклонения и ваши вопросы" },
  { n: 3, title: "После", text: "Итоги в кабинете, план на следующую сдачу" },
] as const;

const EXPERIENCE_LINE =
  "Опыт в кардиологии, сердечно-сосудистой хирургии и амбулаторной медицине";

const GMC_URL = "https://www.gmc-uk.org/registration-and-licensing";

function formatPrice(value: number) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

export function MainDoctorBlock({ id }: { id?: string }) {
  const { doctor } = useCheckupSettings();

  const cardio = doctor.credentials.find((c) => /кардиолог/i.test(c));
  const experience = doctor.credentials.find((c) => /стаж/i.test(c));
  const specialtyLine = doctor.specialty.replace(/^Врач-/, "");
  const subtitle = [
    [specialtyLine, cardio?.toLowerCase()].filter(Boolean).join(", "),
    experience ? experience.charAt(0).toLowerCase() + experience.slice(1) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section id={id} className="border-b hairline py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <h2 className="font-display text-3xl leading-[1.15] text-foreground sm:text-4xl md:text-[2.75rem]">
          Врач, который видит всю историю
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-5 md:mt-10 lg:grid-cols-2 lg:gap-6">
          {/* Left card — doctor */}
          <div className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:flex-row sm:gap-6 sm:p-7">
            <img
              src={doctorPhoto}
              alt={doctor.name}
              className="h-36 w-28 shrink-0 rounded-xl object-cover object-top"
              loading="lazy"
            />
            <div className="min-w-0">
              <p className="font-display text-2xl leading-tight text-foreground">{doctor.name}</p>
              {subtitle && (
                <p className="mt-1.5 text-[15px] text-muted-foreground">{subtitle}</p>
              )}
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                {EXPERIENCE_LINE}
              </p>
              <a
                href={GMC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-dotted decoration-1 underline-offset-4 transition-colors hover:text-primary"
              >
                Регистрация GMC, Великобритания
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Right card — steps + pills */}
          <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-7">
            <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                      {step.n}
                    </span>
                    <p className="font-semibold text-foreground">{step.title}</p>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-border/60 pt-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
                  Годовые программы —&nbsp;
                  <span className="font-semibold text-foreground">2–4 консультации входят</span>
                </span>
                {doctor.consultation_enabled && (
                  <span className="inline-flex items-center rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
                    К чекапу —&nbsp;
                    <span className="font-semibold text-foreground">
                      от {formatPrice(doctor.consultation_price)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
