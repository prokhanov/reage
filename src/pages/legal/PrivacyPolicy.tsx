import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { Shield, UserCheck, Lock, Eye, Server, Clock, Mail } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Политика обработки персональных данных — ReAge</title>
        <meta name="description" content="Политика обработки персональных данных сервиса ReAge. Принципы, цели и условия обработки данных пользователей." />
      </Helmet>
      <LegalPageLayout
        title="Политика обработки персональных данных"
        subtitle="Принципы и условия сбора, хранения и использования ваших данных"
        icon={<Shield className="w-6 h-6 text-primary" />}
      >
        {/* Intro */}
        <div className="mb-10 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-muted-foreground leading-relaxed">
            Настоящая Политика обработки персональных данных (далее — Политика) определяет порядок обработки
            персональных данных пользователей сервиса ReAge и устанавливает меры по защите персональных данных.
            Политика разработана в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
          </p>
        </div>

        <Section icon={<UserCheck className="w-5 h-5" />} title="1. Общие положения">
          <p>
            1.1. Оператор персональных данных — Общество с ограниченной ответственностью «Реэйдж» (ИНН 9704271028,
            ОГРН 1267700099985), расположенное по адресу: 121099, г. Москва, пер. 1-й Смоленский, 22/10, помещ. 3/П.
          </p>
          <p>
            1.2. Настоящая Политика применяется ко всей информации, которую Оператор может получить о пользователе
            во время использования им Сервиса ReAge.
          </p>
          <p>
            1.3. Использование Сервиса означает безоговорочное согласие пользователя с настоящей Политикой и указанными
            в ней условиями обработки его персональных данных.
          </p>
        </Section>

        <Section icon={<Eye className="w-5 h-5" />} title="2. Какие данные мы обрабатываем">
          <p>2.1. Оператор может обрабатывать следующие персональные данные пользователей:</p>
          <ul className="space-y-2 mt-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Фамилия, имя, отчество</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Контактный телефон</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Адрес электронной почты</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Дата рождения, пол</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Данные биомаркеров и результатов лабораторных исследований</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Сведения о состоянии здоровья, питании и образе жизни</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>IP-адрес, данные cookies, информация о браузере и устройстве</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Server className="w-5 h-5" />} title="3. Цели обработки данных">
          <p>3.1. Персональные данные обрабатываются в следующих целях:</p>
          <ul className="space-y-2 mt-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Предоставление доступа к функционалу Сервиса и персонализированных отчётов</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Анализ биомаркеров и формирование рекомендаций по управлению здоровьем</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Коммуникация с пользователем: уведомления, напоминания, консультации</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Улучшение качества Сервиса, персонализация контента</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Выполнение требований законодательства РФ</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Lock className="w-5 h-5" />} title="4. Защита данных">
          <p>
            4.1. Оператор принимает необходимые организационные и технические меры для защиты персональных данных
            от неправомерного или случайного доступа, уничтожения, изменения, блокирования, копирования,
            распространения, а также от иных неправомерных действий третьих лиц.
          </p>
          <p>
            4.2. К мерам защиты относятся: шифрование данных при передаче (SSL/TLS), разграничение доступа
            сотрудников, регулярное резервное копирование, использование защищённых серверов.
          </p>
          <p>
            4.3. Доступ к персональным данным имеют только уполномоченные сотрудники Оператора, связанные
            обязательством о неразглашении.
          </p>
        </Section>

        <Section icon={<Clock className="w-5 h-5" />} title="5. Хранение и уничтожение данных">
          <p>
            5.1. Персональные данные хранятся в течение срока, необходимого для достижения целей обработки,
            или до момента отзыва согласия пользователем.
          </p>
          <p>
            5.2. По достижении целей обработки или при отзыве согласия персональные данные подлежат уничтожению
            в срок, не превышающий 30 дней, за исключением случаев, предусмотренных законодательством.
          </p>
        </Section>

        <Section icon={<Mail className="w-5 h-5" />} title="6. Права пользователя">
          <p>6.1. Пользователь имеет право:</p>
          <ul className="space-y-2 mt-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Получать информацию о своих персональных данных и обработке таких данных</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Требовать уточнения, блокирования или уничтожения своих персональных данных</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Отзывать согласие на обработку персональных данных</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Обжаловать действия или бездействие Оператора в уполномоченный орган</span>
            </li>
          </ul>
        </Section>

        <div className="mt-10 p-6 rounded-2xl bg-muted/30 border border-border/30">
          <p className="text-sm text-muted-foreground leading-relaxed">
            По вопросам, связанным с обработкой персональных данных, обращайтесь по адресу электронной почты:{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>{" "}
            или по телефону: <a href="tel:+79967897404" className="text-primary hover:underline">+7 (996) 789-74-04</a>.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Дата последнего обновления: {new Date().toLocaleDateString("ru-RU")}.
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
