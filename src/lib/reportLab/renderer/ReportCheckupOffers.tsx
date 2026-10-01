import type { ReportCheckupOffer } from "@/lib/reportCheckupOffers";

const money = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₽`;
const date = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));

const PER_PAGE = 3;

export function ReportCheckupOffers({ offers }: { offers: ReportCheckupOffer[] }) {
  const pages: ReportCheckupOffer[][] = [];
  for (let i = 0; i < offers.length; i += PER_PAGE) pages.push(offers.slice(i, i + PER_PAGE));
  return (
    <>
      {pages.map((group, pageIndex) => (
      <section className={`rl-page rl-offer-page${group.length > 1 ? " rl-offer-page--multi" : ""}`} key={pageIndex}>
      {group.map((offer, index) => {
        const extraTenPercent = offer.pricing_mode === "full_upgrade"
          ? Math.round((offer.advertised_list_price - offer.source_paid_amount) * 0.1)
          : offer.discount_amount;
        const discountPercent = offer.advertised_list_price > 0
          ? Math.round((offer.discount_amount / offer.advertised_list_price) * 100)
          : 0;
        return (
            <div className="rl-offer" key={offer.id}>
              <div className="rl-offer-layout">
                <div className="rl-offer-copy">
                  <div>
                    <div className="rl-offer-eyebrow" {...(index === 0 ? { "data-section-title": "Следующий шаг" } : {})}>Следующий шаг</div>
                    <h2>{offer.advertised_checkup_name}</h2>
                    {offer.advertised_checkup_summary && (
                      <p className="rl-offer-summary">{offer.advertised_checkup_summary}</p>
                    )}
                    <p className="rl-offer-lead">
                      {offer.pricing_mode === "full_upgrade"
                        ? "Стоимость вашего чекапа засчитаем — и дадим скидку −10%."
                        : "Персональная скидка −10% на следующий чекап."}
                    </p>
                  </div>
                  <div className="rl-offer-footer">
                    <a href={offer.checkout_url} target="_blank" rel="noreferrer">Оформить на reage.life →</a>
                    <span>Промокод не суммируется<br />с другими скидками</span>
                  </div>
                </div>
                <div className="rl-offer-ticket">
                  <div className="rl-offer-breakdown">
                    <div><span>Стоимость</span><strong>{money(offer.advertised_list_price)}</strong></div>
                    {offer.pricing_mode === "full_upgrade" && (
                      <div><span>Зачёт вашего чекапа</span><strong>−{money(offer.source_paid_amount)}</strong></div>
                    )}
                    <div><span>Скидка −10%</span><strong>−{money(extraTenPercent)}</strong></div>
                    <div className="rl-offer-total">
                      <span>Для вас<strong>{money(offer.final_price)}</strong></span>
                      <b>Выгода {discountPercent}%</b>
                    </div>
                  </div>
                  <div className="rl-offer-voucher">
                    <div className="rl-offer-code">
                      <span>Ваш промокод</span>
                      <strong>{offer.code}</strong>
                      <div><b>−{money(offer.discount_amount)}</b><span>до {date(offer.display_until)}</span></div>
                    </div>
                    <div className="rl-offer-qr">
                      {offer.qr_data_url && <img src={offer.qr_data_url} alt="QR-код для оформления" />}
                      <span>Отсканируйте, чтобы оформить</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        );
      })}
      </section>
      ))}
    </>
  );
}