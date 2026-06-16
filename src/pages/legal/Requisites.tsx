import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { Building2, User, Phone, Mail, Landmark, Hash, FileCheck } from "lucide-react";

export default function Requisites() {
  const details = [
    { label: "Полное наименование", value: 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "РЕЭЙДЖ"', icon: <Building2 className="w-5 h-5" /> },
    { label: "ИНН", value: "9704271028", icon: <Hash className="w-5 h-5" /> },
    { label: "КПП", value: "770401001", icon: <Hash className="w-5 h-5" /> },
    { label: "ОГРН", value: "1267700099985", icon: <FileCheck className="w-5 h-5" /> },
    { label: "Юридический адрес", value: "121099, г. Москва, вн.тер.г. муниципальный округ Арбат, пер. 1-й Смоленский, д. 22/10, помещ. 3/П", icon: <Building2 className="w-5 h-5" /> },
    { label: "Генеральный директор", value: "Святодумов Владислав Артурович", icon: <User className="w-5 h-5" /> },
    { label: "Телефон", value: "+7 (995) 998-46-38", icon: <Phone className="w-5 h-5" /> },
    { label: "Электронная почта", value: "team@reage.life", icon: <Mail className="w-5 h-5" /> },
  ];

  const bankDetails = [
    { label: "Расчётный счёт", value: "40702810620000299478" },
    { label: "Банк", value: 'ООО "Банк Точка"' },
    { label: "БИК", value: "044525104" },
    { label: "Корреспондентский счёт", value: "30101810745374525104" },
  ];

  return (
    <>
      <Helmet>
        <title>Реквизиты — ReAge</title>
        <meta name="description" content="Юридические реквизиты ООО Реэйдж. ИНН, ОГРН, банковские реквизиты и контактная информация." />
      </Helmet>
      <LegalPageLayout
        title="Реквизиты"
        subtitle="Юридическая информация и платёжные данные ООО «Реэйдж»"
        icon={<Building2 className="w-6 h-6 text-primary" />}
      >
        {/* Company Info */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            Общие сведения
          </h2>
          <div className="grid gap-4">
            {details.map((item) => (
              <div
                key={item.label}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-3 text-muted-foreground sm:w-56 flex-shrink-0">
                  <span className="text-primary/70">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="text-foreground font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Details */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Landmark className="w-6 h-6 text-primary" />
            Банковские реквизиты
          </h2>
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
            <div className="relative p-6 md:p-8 border border-border/40 rounded-2xl bg-card/40">
              <div className="grid gap-4">
                {bankDetails.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                  >
                    <span className="text-sm text-muted-foreground font-medium sm:w-56 flex-shrink-0">
                      {item.label}
                    </span>
                    <span className="text-foreground font-mono-tech text-sm sm:text-base">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Данные реквизиты актуальны на текущий момент. При необходимости получения актуальных данных
            рекомендуем обращаться напрямую по электронной почте{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>.
          </p>
        </div>
      </LegalPageLayout>
    </>
  );
}
