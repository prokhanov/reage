import { Check } from "lucide-react";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";
import doctorPhoto from "@/assets/energy/reage-doctor.webp";

const GMC_URL = "https://www.gmc-uk.org/registration-and-licensing";

const ABOUT_LINE =
  "Врач с более чем 7-летним клиническим опытом в терапии, кардиологии, сердечно-сосудистой хирургии и амбулаторной медицине. Зарегистрирована в General Medical Council (GMC), Великобритания. Помогает разобраться в результатах анализов и оценить их в контексте общего состояния здоровья.";

const DOCTOR_STEPS = [
  {
    title: "Составляет ваш отчёт",
    text: "разбирает каждый показатель и связи между ними",
  },
  {
    title: "Объясняет простым языком",
    text: "что значат отклонения и почему они важны",
  },
  {
    title: "Подсказывает, что делать",
    text: "что изменить в питании и образе жизни, что пересдать",
  },
  {
    title: "Консультирует онлайн",
    text: "разбирает результаты вместе с вами и отвечает на вопросы",
  },
  {
    title: "Ведёт весь год",
    text: "в годовой программе сравнивает сдачи и корректирует план",
  },
];

export function MainDoctorBlock({ id }: { id?: string }) {
  const { doctor } = useCheckupSettings();

  const therapist = doctor.credentials.find((c) => /терапевт/i.test(c)) ?? "Врач-терапевт";
  const cardio = doctor.credentials.find((c) => /кардиолог/i.test(c)) ?? "Кардиолог";
  const gmc = doctor.credentials.find((c) => /gmc/i.test(c)) ?? "GMC, Великобритания";
  const experience = doctor.credentials.find((c) => /стаж/i.test(c)) ?? "Стаж 8+ лет";

  const pills = [
    { label: therapist, href: undefined as string | undefined },
    { label: cardio, href: undefined },
    { label: gmc, href: GMC_URL },
    { label: experience, href: undefined },
  ];

  return (
    <section id={id} className="border-b hairline py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
          {/* Doctor card */}
          <div className="rounded-3xl bg-muted/50 p-5 sm:p-6 lg:self-start">
            <img
              src={doctorPhoto}
              alt={doctor.name}
              className="w-full max-w-[300px] aspect-[4/3] object-cover object-[50%_20%] rounded-2xl md:aspect-[4/5] md:object-[50%_15%] md:rounded-[20px]"
              loading="lazy"
            />

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h3 className="font-display text-2xl leading-tight text-foreground">
                Д-р {doctor.name}
              </h3>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-foreground">
                Эксперт ReAge
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {pills.map(({ label, href }) => {
                const cls =
                  "inline-flex max-w-full items-center rounded-full bg-card px-3.5 py-2 text-sm text-foreground transition-colors";
                return href ? (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${cls} hover:text-primary`}
                    title="Регистрация GMC, Великобритания"
                  >
                    {label}
                  </a>
                ) : (
                  <span key={label} className={cls}>
                    {label}
                  </span>
                );
              })}
            </div>

            <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
              {ABOUT_LINE}
            </p>
          </div>

          {/* Content */}
          <div className="rounded-3xl bg-card p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-3xl leading-[1.15] text-foreground sm:text-4xl">
              Ваш отчёт составляет врач — и ведёт вас дальше
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Наша команда специалистов разбирает ваши анализы, пишет отчёт и остаётся на связи:
              разово — после чекапа, весь год — в годовой программе.
            </p>

            <ul className="mt-7 space-y-5">
              {DOCTOR_STEPS.map((step) => (
                <li key={step.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold leading-snug text-foreground">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[15px] leading-snug text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted/60 p-5">
                <p className="text-sm text-muted-foreground">Разовый чекап</p>
                <p className="mt-1.5 text-lg font-semibold text-foreground">Отчёт от врача</p>
                <p className="mt-1.5 text-[15px] leading-snug text-muted-foreground">
                  Консультация по желанию, оплачивается отдельно
                </p>
              </div>
              <div className="rounded-2xl bg-primary p-5">
                <p className="text-sm text-primary-foreground/70">Годовая программа</p>
                <p className="mt-1.5 text-lg font-semibold text-primary-foreground">
                  Врач ведёт весь год
                </p>
                <p className="mt-1.5 text-[15px] leading-snug text-primary-foreground/80">
                  Консультации входят в программу
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
