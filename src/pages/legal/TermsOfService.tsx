import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { ScrollText, Users, Handshake, Ban, Scale, AlertCircle } from "lucide-react";

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Пользовательское соглашение — ReAge</title>
        <meta name="description" content="Пользовательское соглашение сервиса ReAge. Условия использования, права и обязанности сторон." />
      </Helmet>
      <LegalPageLayout
        title="Пользовательское соглашение"
        subtitle="Условия использования сервиса ReAge"
        icon={<ScrollText className="w-6 h-6 text-primary" />}
      >
        <div className="mb-10 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-muted-foreground leading-relaxed">
            Настоящее Пользовательское соглашение (далее — Соглашение) является публичной офертой и определяет
            условия использования сервиса ReAge. Регистрация и использование Сервиса означает полное и
            безоговорочное принятие условий настоящего Соглашения.
          </p>
        </div>

        <Section icon={<ScrollText className="w-5 h-5" />} title="1. Термины и определения">
          <p>
            <strong className="text-foreground">1.1. Сервис (ReAge)</strong> — информационно-аналитический сервис,
            доступный через веб-сайт reage.life и связанные с ним поддомены, предоставляющий пользователям инструменты
            для анализа биомаркеров и управления здоровьем.
          </p>
          <p>
            <strong className="text-foreground">1.2. Пользователь</strong> — физическое лицо, достигшее 18 лет,
            использующее Сервис в соответствии с настоящим Соглашением.
          </p>
          <p>
            <strong className="text-foreground">1.3. Оператор</strong> — Общество с ограниченной ответственностью
            «Реэйдж» (ИНН 9704271028, ОГРН 1267700099985).
          </p>
          <p>
            <strong className="text-foreground">1.4. Контент</strong> — любые материалы, доступные в Сервисе:
            тексты, графики, отчёты, рекомендации, аналитические данные.
          </p>
        </Section>

        <Section icon={<Users className="w-5 h-5" />} title="2. Регистрация и доступ">
          <p>
            2.1. Для использования полного функционала Сервиса Пользователю необходимо пройти регистрацию
            и создать учётную запись.
          </p>
          <p>
            2.2. Пользователь обязуется предоставить достоверную и актуальную информацию при регистрации
            и поддерживать её в актуальном состоянии.
          </p>
          <p>
            2.3. Пользователь несёт полную ответственность за сохранность своих учётных данных (логин и пароль)
            и за все действия, совершённые под его учётной записью.
          </p>
          <p>
            2.4. Оператор вправе отказать в регистрации или заблокировать учётную запись при нарушении
            условий настоящего Соглашения.
          </p>
        </Section>

        <Section icon={<Handshake className="w-5 h-5" />} title="3. Права и обязанности сторон">
          <p className="text-foreground font-semibold mb-2">3.1. Права и обязанности Пользователя:</p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Использовать Сервис в соответствии с его назначением и настоящим Соглашением</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Самостоятельно оценивать достоверность и полезность получаемой информации</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Не передавать доступ к своей учётной записи третьим лицам</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Не использовать Сервис для распространения вредоносного ПО, спама или незаконного контента</span>
            </li>
          </ul>

          <p className="text-foreground font-semibold mb-2">3.2. Права и обязанности Оператора:</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Предоставлять Пользователю доступ к функционалу Сервиса в соответствии с выбранным тарифом</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Обеспечивать конфиденциальность персональных данных Пользователя</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Вправе изменять функционал Сервиса, уведомив Пользователя не менее чем за 7 дней</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Вправе приостановить доступ к Сервису в случае технических работ или нарушений</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Ban className="w-5 h-5" />} title="4. Ограничение ответственности">
          <p>
            4.1. ReAge является информационно-аналитическим сервисом и <strong className="text-foreground">не оказывает медицинских услуг</strong>.
            Материалы Сервиса не являются медицинским заключением, диагнозом или назначением лечения.
          </p>
          <p>
            4.2. Пользователь самостоятельно несёт ответственность за принятие решений на основе информации,
            полученной в Сервисе. Перед применением любых рекомендаций необходима консультация с врачом.
          </p>
          <p>
            4.3. Лабораторные исследования выполняются лицензированными медицинскими организациями — партнёрами
            сервиса. Оператор не несёт ответственности за качество и достоверность результатов исследований.
          </p>
          <p>
            4.4. Оператор не гарантирует бесперебойную работу Сервиса и не несёт ответственности за убытки,
            возникшие в результате технических сбоев или недоступности Сервиса.
          </p>
        </Section>

        <Section icon={<Scale className="w-5 h-5" />} title="5. Интеллектуальная собственность">
          <p>
            5.1. Все материалы Сервиса, включая тексты, графику, логотипы, программный код, являются
            интеллектуальной собственностью Оператора или его лицензиаров.
          </p>
          <p>
            5.2. Пользователю предоставляется ограниченное, неисключительное право использования Сервиса
            в личных некоммерческих целях.
          </p>
          <p>
            5.3. Запрещается копирование, модификация, распространение, продажа материалов Сервиса
            без письменного согласия Оператора.
          </p>
        </Section>

        <Section icon={<AlertCircle className="w-5 h-5" />} title="6. Изменения и расторжение">
          <p>
            6.1. Оператор вправе в любое время вносить изменения в настоящее Соглашение. Изменения вступают
            в силу с момента их публикации, если иное не указано отдельно.
          </p>
          <p>
            6.2. Пользователь обязуется самостоятельно отслеживать изменения в Соглашении.
            Продолжение использования Сервиса после внесения изменений означает принятие новых условий.
          </p>
          <p>
            6.3. Пользователь вправе расторгнуть настоящее Соглашение в любое время, удалив свою учётную запись
            или обратившись в службу поддержки.
          </p>
        </Section>

        <div className="mt-10 p-6 rounded-2xl bg-muted/30 border border-border/30">
          <p className="text-sm text-muted-foreground leading-relaxed">
            По всем вопросам, связанным с настоящим Соглашением, обращайтесь по адресу:{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Дата вступления в силу: {new Date().toLocaleDateString("ru-RU")}.
          </p>
        </div>
      </LegalPageLayout>
    </>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed pl-8">
        {children}
      </div>
    </div>
  );
}
