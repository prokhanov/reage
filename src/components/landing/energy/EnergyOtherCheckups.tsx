import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const checkups = [
  { title: "Чекап для мужчин", text: "Гормоны, метаболизм, сердце", price: "9 990 ₽" },
  { title: "Чекап для женщин", text: "Железо, щитовидная железа, обмен веществ", price: "9 990 ₽" },
];

export function EnergyOtherCheckups() {
  return (
    <section className="border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-12 md:px-6 md:py-16">
        <h2 className="font-display text-xl text-foreground md:text-2xl">Другие чекапы ReAge</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {checkups.map((c) => (
            <Link
              key={c.title}
              to="/"
              className="group flex items-center justify-between gap-4 rounded-xl border hairline bg-card p-5 transition-colors hover:bg-foreground/[0.02]"
            >
              <span>
                <span className="block text-sm font-medium text-foreground">{c.title}</span>
                <span className="block text-sm text-muted-foreground">{c.text}</span>
                <span className="font-mono-tech mt-2 block text-sm text-foreground">{c.price}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
