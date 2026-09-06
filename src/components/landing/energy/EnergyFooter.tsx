import { ThemedLogo } from "@/components/ThemedLogo";

export function EnergyFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto flex w-full max-w-[72rem] flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <ThemedLogo className="h-6 w-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Забота о здоровье людей</p>
        </div>
        <div className="text-sm text-muted-foreground md:text-right">
          <a href="tel:+74951234567" className="block text-foreground hover:underline">
            +7 495 123-45-67
          </a>
          <span className="mt-1 block">Ежедневно 9:00–21:00</span>
        </div>
      </div>
    </footer>
  );
}
