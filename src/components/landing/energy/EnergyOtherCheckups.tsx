import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const checkups = [
  { title: "Чекап для мужчин", text: "Гормоны, метаболизм, сердце", price: "9 990 ₽" },
  { title: "Чекап для женщин", text: "Железо, щитовидная железа, обмен веществ", price: "9 990 ₽" },
];

export function EnergyOtherCheckups() {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-12 md:px-6 md:py-16">
        <h2 className="font-display text-xl text-foreground md:text-2xl">Другие чекапы ReAge</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-5 sm:gap-3 md:grid-cols-2">
          {checkups.map((c) => (
            <Link
              key={c.title}
              to="/"
              className="group flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-foreground/[0.02] md:p-5"
            >
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium text-foreground md:text-sm">
                  {c.title}
                </span>
                <span className="hidden text-sm text-muted-foreground md:block">{c.text}</span>
                <span className="font-mono-tech mt-0.5 block text-sm text-muted-foreground md:mt-2 md:text-foreground">
                  {c.price}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
