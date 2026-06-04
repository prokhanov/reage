import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { ClipboardCheck, User, Target, Database, Clock } from "lucide-react";

export default function ConsentData() {
  return (
    <>
      <Helmet>
        <title>Согласие на обработку персональных данных — ReAge</title>
        <meta name="description" content="Форма согласия на обработку персональных данных пользователей сервиса ReAge." />
      </Helmet>
      <LegalPageLayout
        title="Согласие на обработку персональных данных"
        subtitle="Добровольное согласие пользователя на обработку его персональных данных"
        icon={<ClipboardCheck className="w-6 h-6 text-primary" />}
      >
        <div className="mb-10 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-muted-foreground leading-relaxed">
            Настоящим я, субъект персональных данных, даю своё добровольное и информированное согласие
            Обществу с ограниченной ответственностью «Реэйдж» (ИНН 9704271028, ОГРН 1267700099985)
            на обработку моих персональных данных в соответствии с Федеральным законом № 152-ФЗ
            «О персональных данных».
          </p>
        </div>

        <Section icon={<User className="w-5 h-5" />} title="1. Субъект персональных данных">
          <p>
            Согласие даётся в отношении следующих категорий персональных данных:
          </p>
          <ul className="space-y-2 mt-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Общие персональные данные: фамилия, имя, отчество, дата рождения, пол</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Контактные данные: номер телефона, адрес электронной почты</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Данные о состоянии здоровья, биомаркерах, результатах лабораторных исследований</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Сведения о питании, физической активности и образе жизни</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Технические данные: IP-адрес, cookies, сведения об устройстве и браузере</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Target className="w-5 h-5" />} title="2. Цели обработки">
          <p>
            Согласие дано на обработку персональных данных в следующих целях:
          </p>
          <ul className="space-y-2 mt-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Идентификация пользователя и предоставление доступа к Сервису</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Анализ биомаркеров и формирование персонализированных отчётов и рекомендаций</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Коммуникация с пользователем: отправка уведомлений, напоминаний, информации об обновлениях</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Улучшение качества Сервиса и персонализация пользовательского опыта</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Исполнение требований законодательства Российской Федерации</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Database className="w-5 h-5" />} title="3. Способы обработки">
          <p>
            Согласие дано на совершение следующих действий с персональными данными с использованием средств
            автоматизации и без их использования: сбор, запись, систематизация, накопление, хранение,
            уточнение (обновление, изменение), извлечение, использование, передача (распространение,
            предоставление, доступ), обезличивание, блокирование, удаление, уничтожение.
          </p>
          <p>
            Персональные данные могут передаваться третьим лицам исключительно в случаях, предусмотренных
            законодательством РФ, либо при привлечении партнёров и подрядчиков для оказания услуг
            пользователю (например, лицензированные медицинские организации для проведения лабораторных исследований).
          </p>
        </Section>

        <Section icon={<Clock className="w-5 h-5" />} title="4. Срок действия согласия">
          <p>
            Настоящее согласие действует до достижения целей обработки персональных данных или до момента
            его отзыва. Согласие может быть отозвано путём направления письменного заявления на адрес
            электронной почты <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>.
          </p>
          <p>
            В случае отзыва согласия Оператор прекращает обработку персональных данных и уничтожает их
            в срок, не превышающий 30 (тридцать) дней, за исключением случаев, когда обработка необходима
            в соответствии с законодательством РФ.
          </p>
        </Section>

        <div className="mt-10 p-6 rounded-2xl bg-muted/30 border border-border/30">
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Я подтверждаю, что ознакомлен с Политикой обработки персональных данных Оператора,
            размещённой по адресу <a href="/legal/privacy" className="text-primary hover:underline">reage.life/legal/privacy</a>,
            и понимаю свои права, предусмотренные законодательством о персональных данных.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Я согласен с тем, что в случае внесения изменений в настоящее согласие, актуальная версия
            будет размещена на сайте Сервиса.
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
