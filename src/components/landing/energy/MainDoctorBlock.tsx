import { Clock, CreditCard, Hand, Heart, MessageSquare, UserRound } from "lucide-react";
import { useCheckupSettings } from "@/hooks/useCheckupSettings";
import doctorPhoto from "@/assets/energy/reage-doctor.webp";

const GMC_URL = "https://www.gmc-uk.org/registration-and-licensing";

const ABOUT_LINE =
  "Врач с более чем 7-летним клиническим опытом в терапии, кардиологии, сердечно-сосудистой хирургии и амбулаторной медицине. Зарегистрирована в General Medical Council (GMC), Великобритания. Помогает разобраться в результатах анализов и оценить их в контексте общего состояния здоровья.";

export function MainDoctorBlock({ id }: { id?: string }) {
  const { doctor } = useCheckupSettings();

  const therapist = doctor.credentials.find((c) => /терапевт/i.test(c)) ?? "Врач-терапевт";
  const cardio = doctor.credentials.find((c) => /кардиолог/i.test(c)) ?? "Кардиолог";
  const gmc = doctor.credentials.find((c) => /gmc/i.test(c)) ?? "GMC, Великобритания";
  const experience = doctor.credentials.find((c) => /стаж/i.test(c)) ?? "Стаж 8+ лет";

  const pills = [
    { icon: Hand, label: therapist, href: undefined as string | undefined },
    { icon: Heart, label: cardio, href: undefined },
    { icon: UserRound, label: gmc, href: GMC_URL },
    { icon: Clock, label: experience, href: undefined },
  ];

  return (
    <section id={id} className="border-b hairline py-14 md:py-20">
      <div className="mx-auto w-full max-w-[80rem] px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Врач ReAge
        </p>
        <h2 className="mt-3 font-display text-3xl leading-[1.15] text-foreground sm:text-4xl md:text-[2.75rem]">
          Разберитесь в анализах вместе с врачом
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Терапевт и кардиолог. Смотрит не на отдельные цифры, а на организм целиком
          — и подробно расскажет, что делать дальше.
        </p>

        <div className="mt-8 rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-5 md:mt-10 md:p-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,42%)_minmax(0,1fr)] md:gap-7">
            {/* Photo — on mobile full width with overlay badge, on desktop flush left */}
            <div className="relative overflow-hidden rounded-2xl">
              <img
                src={doctorPhoto}
                alt={doctor.name}
                className="h-72 w-full object-cover object-top sm:h-96 md:h-[24rem] lg:h-[26rem]"
                loading="lazy"
              />
              <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-foreground backdrop-blur-sm md:hidden">
                Эксперт ReAge
              </span>
            </div>

            {/* Info */}
            <div className="min-w-0">
              <span className="hidden items-center rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-foreground md:inline-flex">
                Эксперт ReAge
              </span>
              <h3 className="mt-3 font-display text-2xl leading-tight text-foreground sm:text-3xl">
                Д-р {doctor.name}
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                {pills.map(({ icon: Icon, label, href }) => {
                  const content = (
                    <>
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 truncate">{label}</span>
                    </>
                  );
                  const cls =
                    "inline-flex max-w-full items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm text-foreground transition-colors sm:px-4";
                  return href ? (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${cls} hover:text-primary`}
                      title="Регистрация GMC, Великобритания"
                    >
                      {content}
                    </a>
                  ) : (
                    <span key={label} className={cls}>
                      {content}
                    </span>
                  );
                })}
              </div>

              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                {ABOUT_LINE}
              </p>

              <div className="mt-5 rounded-2xl bg-muted/60 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-[15px] leading-relaxed text-foreground">
                    Консультация по желанию. Врач подробно расскажет по итогам анализов.
                  </p>
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-[15px] leading-relaxed text-foreground">
                    Услуга оплачивается отдельно.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
