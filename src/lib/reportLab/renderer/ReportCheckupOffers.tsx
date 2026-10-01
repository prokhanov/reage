import type { ReportCheckupOffer } from "@/lib/reportCheckupOffers";

const money = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;
const date = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));

export function ReportCheckupOffers({ offers }: { offers: ReportCheckupOffer[] }) {
  return (
    <>
      {offers.map((offer) => {
        const extraTenPercent = offer.pricing_mode === "full_upgrade"
          ? Math.round((offer.advertised_list_price - offer.source_paid_amount) * 0.1)
          : offer.discount_amount;
        return (
          <section className="rl-page rl-offer-page" key={offer.id} data-section-title="Следующий шаг">
            <div className="rl-offer">
              <div className="rl-offer-rings" aria-hidden />
              <div className="rl-offer-eyebrow">Следующий шаг</div>
              <h2>{offer.advertised_checkup_name} за {money(offer.final_price)}</h2>
              <p className="rl-offer-lead">
                {offer.pricing_mode === "full_upgrade"
                  ? "Стоимость вашего чекапа засчитаем — и дадим ещё −10%."
                  : "Персональная скидка −10% на следующий чекап."}
              </p>
              <div className="rl-offer-grid">
                <div className="rl-offer-breakdown">
                  <div><span>{offer.advertised_checkup_name}</span><strong>{money(offer.advertised_list_price)}</strong></div>
                  {offer.pricing_mode === "full_upgrade" && (
                    <div><span>Ваш чекап засчитаем</span><strong>−{money(offer.source_paid_amount)}</strong></div>
                  )}
                  <div><span>Ещё −10%</span><strong>−{money(extraTenPercent)}</strong></div>
                  <div className="rl-offer-total"><span>Для вас</span><strong>{money(offer.final_price)}</strong></div>
                </div>
                <div className="rl-offer-side">
                  <div className="rl-offer-code">
                    <span>Ваш промокод</span>
                    <strong>{offer.code}</strong>
                    <div><b>−{money(offer.discount_amount)}</b><span>до {date(offer.display_until)}</span></div>
                  </div>
                  <div className="rl-offer-qr">
                    {offer.qr_data_url && <img src={offer.qr_data_url} alt="QR-код для оформления" />}
                    <span>Наведите камеру,<br />чтобы оформить</span>
                  </div>
                </div>
              </div>
              <div className="rl-offer-footer">
                <a href={offer.checkout_url} target="_blank" rel="noreferrer">Оформить на reage.life →</a>
                <span>Промокод не суммируется<br />с другими скидками</span>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}