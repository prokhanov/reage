import { EnergyClinicPicker } from "./EnergyClinicPicker";

export function MainWhereToTest() {
  return (
    <section className="overflow-x-hidden border-b hairline">
      <div className="mx-auto w-full max-w-[72rem] px-4 py-14 md:px-6 md:py-16">
        <EnergyClinicPicker
          confirmed={null}
          onConfirm={() => {}}
          readOnly
          layout="section"
          header={
            <div>
              <h2 className="font-display text-[1.9rem] leading-tight text-foreground md:text-4xl">
                Сдайте анализы сегодня
              </h2>
              <p className="mt-2 text-base text-muted-foreground md:text-lg">
                Десятки отделений по Москве, СПб и всей России — записываться заранее не нужно.
              </p>
            </div>
          }
        />
      </div>
    </section>
  );
}
