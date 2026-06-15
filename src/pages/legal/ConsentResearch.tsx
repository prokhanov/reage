import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import {
  FlaskConical,
  FileSearch,
  ClipboardList,
  Target,
  CheckCircle2,
  Clock,
  Mail,
  MonitorCheck,
} from "lucide-react";

export default function ConsentResearch() {
  return (
    <>
      <Helmet>
        <title>Согласие на обработку специальных категорий персональных данных — ReAge</title>
        <meta
          name="description"
          content="Согласие на обработку специальных категорий персональных данных в сервисе ReAge."
        />
      </Helmet>
      <LegalPageLayout
        title="Согласие на обработку специальных категорий персональных данных"
        subtitle="Условия передачи и обработки результатов лабораторных исследований"
        icon={<FlaskConical className="w-6 h-6 text-primary" />}
      >
        <div className="mb-10 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-muted-foreground leading-relaxed">
            Настоящим я свободно, своей волей и в своём интересе даю согласие Обществу с ограниченной
            ответственностью «Реэйдж» (ИНН 9704271028, ОГРН 1267700099985) на получение, хранение,
            обработку и отображение результатов моих лабораторных исследований в сервисе ReAge.
          </p>
        </div>

        <Section icon={<FileSearch className="w-5 h-5" />} title="Предмет согласия">
          <p>
            <strong className="text-foreground">1.1.</strong> Я подтверждаю своё согласие на получение
            ООО «Реэйдж» результатов лабораторных исследований, выполненных по моему заказу партнёрскими
            лабораториями и иными организациями, участвующими в оказании соответствующих услуг.
          </p>
          <p>
            <strong className="text-foreground">1.2.</strong> Я разрешаю партнёрским лабораториям передавать
            ООО «Реэйдж» сведения о результатах проведённых исследований, включая сведения, составляющие
            врачебную тайну, на основании настоящего согласия и в объёме, необходимом для функционирования сервиса ReAge и исполнения
            поручения пользователя.
          </p>
          <p>
            <strong className="text-foreground">1.3.</strong> Настоящее согласие распространяется как на результаты
            исследований, выполненных после предоставления согласия, так и на результаты исследований,
            выполненных ранее, если их передача предусмотрена действующим законодательством и моими
            волеизъявлениями.
          </p>
        </Section>

        <Section icon={<ClipboardList className="w-5 h-5" />} title="Перечень передаваемых сведений">
          <p className="mb-3">
            Передаче могут подлежать:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>сведения о назначенных и выполненных исследованиях;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>результаты лабораторных исследований;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>референсные значения показателей;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>даты проведения исследований;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>
                сведения, необходимые для корректной идентификации результатов и их отображения в сервисе ReAge.
              </span>
            </li>
          </ul>
        </Section>

        <Section icon={<Target className="w-5 h-5" />} title="Цели получения данных">
          <p className="mb-3">
            Результаты исследований могут использоваться ООО «Реэйдж» исключительно для:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>формирования личного кабинета пользователя;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>отображения результатов исследований;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>хранения истории показателей;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>формирования аналитических материалов;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>расчёта индексов и производных показателей;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>визуализации динамики изменений показателей;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>предоставления пользователю информационно-аналитических сервисов.</span>
            </li>
          </ul>
          <p>
            <strong className="text-foreground">3.1.</strong> Пользователь понимает и соглашается, что ООО «Реэйдж» использует полученные результаты исследований исключительно для предоставления информационно-аналитических сервисов и не осуществляет ведение медицинской документации, медицинских карт пациентов, постановку диагнозов, назначение лечения либо оказание медицинской помощи.
          </p>
        </Section>

        <Section icon={<CheckCircle2 className="w-5 h-5" />} title="Подтверждение пользователя">
          <p>
            <strong className="text-foreground">4.1.</strong> Я подтверждаю, что понимаю, что ООО «Реэйдж» не
            является исполнителем лабораторных исследований.
          </p>
          <p>
            <strong className="text-foreground">4.2.</strong> Я подтверждаю, что результаты исследований
            формируются и предоставляются соответствующей лабораторией.
          </p>
          <p>
            <strong className="text-foreground">4.3.</strong> Я подтверждаю, что сервис ReAge использует полученные
            данные исключительно в информационно-аналитических целях, включая хранение истории показателей, расчет метрик здоровья, визуализацию динамики изменений и формирование информационных отчетов.
          </p>
        </Section>

        <Section icon={<Clock className="w-5 h-5" />} title="Срок действия согласия">
          <p>
            <strong className="text-foreground">5.1.</strong> Настоящее согласие действует до момента его отзыва
            пользователем либо прекращения использования сервиса ReAge.
          </p>
          <p>
            <strong className="text-foreground">5.2.</strong> Отзыв согласия осуществляется путём направления
            письменного уведомления на адрес электронной почты:{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>.
          </p>
        </Section>

        <Section icon={<MonitorCheck className="w-5 h-5" />} title="Электронная форма согласия">
          <p>
            <strong className="text-foreground">6.1.</strong> Настоящее согласие может быть предоставлено в
            электронной форме путём установки соответствующей отметки на сайте ReAge.
          </p>
          <p>
            <strong className="text-foreground">6.2.</strong> Установка соответствующей отметки признаётся простой
            электронной подписью пользователя и подтверждает его согласие с условиями настоящего документа.
          </p>
        </Section>

        <div className="mt-12 p-6 rounded-2xl bg-muted/30 border border-border/30">
          <p className="text-sm text-muted-foreground leading-relaxed">
            По вопросам, связанным с обработкой данных, обращайтесь по адресу электронной почты:{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>.
          </p>
        </div>
      </LegalPageLayout>
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-3 pb-3 border-b border-border/20">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed pl-8">
        {children}
      </div>
    </div>
  );
}
