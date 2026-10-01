import { EnergyClinicPicker } from "./EnergyClinicPicker";
import { useEnergyOrder } from "./EnergyOrderContext";

export function EnergyWhereToTest() {
  const { clinic, setClinic } = useEnergyOrder();

  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 md:py-16">
        <EnergyClinicPicker
          confirmed={clinic}
          onConfirm={setClinic}
          renderHeader={(cityTrigger) => (
            <div className="min-w-0">
              <h2 className="font-display text-[2.1rem] leading-tight text-foreground md:text-5xl">
                Сдайте анализы сегодня
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground md:text-xl">
                {cityTrigger ? (
                  <>
                    Выберите отделение {cityTrigger} — записываться заранее не нужно.
                  </>
                ) : (
                  <>Оставьте заявку на сдачу анализов дома — медсестра приедет к вам.</>
                )}
              </p>
            </div>
          )}
        />
      </div>
    </section>
  );
}
