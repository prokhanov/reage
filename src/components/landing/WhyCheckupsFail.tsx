import { Camera, FileQuestion, UserX, Unlink, ScanSearch } from "lucide-react";

const problems = [
  { icon: <Camera className="w-4 h-4" />, title: "Один снимок" },
  { icon: <FileQuestion className="w-4 h-4" />, title: "Непонятные цифры" },
  { icon: <UserX className="w-4 h-4" />, title: "Сдал и забыл" },
  { icon: <Unlink className="w-4 h-4" />, title: "Нет связи маркеров" },
  { icon: <ScanSearch className="w-4 h-4" />, title: "Проверяют не всё" },
];

export function WhyCheckupsFail() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            <span className="text-foreground">Почему обычные чекапы </span>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              не работают
            </span>
          </h2>
          <p className="text-muted-foreground">
            Сдать кровь раз в год — это не забота о здоровье
          </p>
        </div>

        {/* Compact chips row */}
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {problems.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm px-5 py-2.5 transition-all duration-300 hover:border-primary/30 hover:bg-card/90 hover:shadow-md animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.06}s` }}
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary">
                {p.icon}
              </span>
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {p.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
