import { Helmet } from "react-helmet-async";
import { LegalPageLayout, DocumentCard } from "@/components/legal/LegalPageLayout";
import { BookOpen, Building2, Shield, ScrollText, ClipboardCheck, FlaskConical } from "lucide-react";

export default function Documents() {
  const documents = [
    {
      title: "Реквизиты",
      description: "Юридические реквизиты ООО «Реэйдж»: ИНН, ОГРН, адрес, банковские реквизиты и контактная информация.",
      icon: <Building2 className="w-6 h-6 text-primary" />,
      to: "/legal/requisites",
    },
    {
      title: "Политика обработки персональных данных",
      description: "Принципы и условия сбора, хранения, использования и защиты персональных данных пользователей сервиса.",
      icon: <Shield className="w-6 h-6 text-primary" />,
      to: "/legal/privacy",
    },
    {
      title: "Пользовательское соглашение",
      description: "Условия использования сервиса ReAge, права и обязанности пользователей и Оператора.",
      icon: <ScrollText className="w-6 h-6 text-primary" />,
      to: "/legal/terms",
    },
    {
      title: "Согласие на обработку персональных данных",
      description: "Форма информированного добровольного согласия на обработку персональных данных.",
      icon: <ClipboardCheck className="w-6 h-6 text-primary" />,
      to: "/legal/consent-data",
    },
    {
      title: "Согласие на получение и обработку исследований",
      description: "Условия передачи, обработки и хранения результатов лабораторных исследований в сервисе.",
      icon: <FlaskConical className="w-6 h-6 text-primary" />,
      to: "/legal/consent-research",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Все документы — ReAge</title>
        <meta name="description" content="Юридические документы сервиса ReAge. Реквизиты, политики, соглашения и формы согласий." />
      </Helmet>
      <LegalPageLayout
        title="Юридические документы"
        subtitle="Ознакомьтесь с официальными документами сервиса ReAge"
        icon={<BookOpen className="w-6 h-6 text-primary" />}
      >
        <div className="mb-8">
          <p className="text-muted-foreground leading-relaxed">
            Ниже представлены все юридические документы, регламентирующие использование сервиса ReAge.
            Мы стремимся к максимальной прозрачности в отношениях с нашими пользователями.
          </p>
        </div>

        <div className="grid gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.to}
              title={doc.title}
              description={doc.description}
              icon={doc.icon}
              to={doc.to}
            />
          ))}
        </div>

        <div className="mt-12 p-6 rounded-2xl bg-muted/30 border border-border/30">
          <h3 className="text-lg font-semibold text-foreground mb-3">Контакты для связи</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            По вопросам, связанным с юридическими документами, вы можете обратиться к нам:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Email: <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Телефон: <a href="tel:+79967897404" className="text-primary hover:underline">+7 (996) 789-74-04</a>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              Юридический адрес: 121099, г. Москва, пер. 1-й Смоленский, 22/10, помещ. 3/П
            </li>
          </ul>
        </div>
      </LegalPageLayout>
    </>
  );
}
