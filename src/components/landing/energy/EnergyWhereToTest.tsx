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
          header={
            <div>
              <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
                Сдайте анализы сегодня
              </h2>
              <p className="mt-2 text-base text-muted-foreground md:text-lg">
                Выберите удобное отделение — записываться заранее не нужно.
              </p>
            </div>
          }
        />
        <p className="mt-3 hidden text-xs text-muted-foreground lg:block">
          Клик по группе точек на карте приближает карту к этим отделениям.
        </p>
      </div>
    </section>
  );
}
