import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import {
  Shield,
  Scale,
  ListChecks,
  Database,
  Target,
  FileText,
  Lock,
  Clock,
  Eye,
  Cookie,
  Mail,
  AlertCircle,
} from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <>
      <Helmet>
        <title>Политика обработки персональных данных — ReAge</title>
        <meta
          name="description"
          content="Политика обработки персональных данных сервиса ReAge. Принципы, цели и условия обработки данных пользователей."
        />
      </Helmet>
      <LegalPageLayout
        title="Политика обработки персональных данных"
        subtitle="Принципы, цели и условия сбора, хранения и защиты персональных данных"
        icon={<Shield className="w-6 h-6 text-primary" />}
      >
        <Section icon={<Shield className="w-5 h-5" />} title="Общие положения">
          <p>
            <strong className="text-foreground">1.1.</strong> Настоящая Политика обработки персональных данных
            (далее — <strong className="text-foreground">Политика</strong>) определяет порядок обработки
            персональных данных пользователей сервиса ReAge и меры по обеспечению безопасности персональных данных,
            предпринимаемые Обществом с ограниченной ответственностью «Реэйдж».
          </p>
          <p>
            <strong className="text-foreground">1.2.</strong> Политика разработана в соответствии с:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>
                Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных»;
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>
                Федеральным законом от 27.07.2006 № 149-ФЗ «Об информации, информационных технологиях и о защите информации»;
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>
                иными нормативными правовыми актами Российской Федерации.
              </span>
            </li>
          </ul>
          <p>
            <strong className="text-foreground">1.3.</strong> Оператором персональных данных является:
          </p>
          <div className="mt-2 p-5 rounded-xl bg-muted/30 border border-border/30 space-y-2 text-foreground">
            <p className="font-semibold">Общество с ограниченной ответственностью «Реэйдж»</p>
            <p>ИНН: 9704271028</p>
            <p>КПП: 770401001</p>
            <p>ОГРН: 1267700099985</p>
            <p>Адрес: 121099, г. Москва, вн. тер. г. муниципальный округ Арбат, пер. 1-й Смоленский, д. 22/10, помещ. 3/П</p>
            <p>
              Электронная почта:{" "}
              <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>
            </p>
            <p>
              Телефон:{" "}
              <a href="tel:+79967897404" className="text-primary hover:underline">+7 996 789-74-04</a>
            </p>
          </div>
          <p className="mt-3">
            <strong className="text-foreground">1.4.</strong> Настоящая Политика применяется ко всей информации,
            которую Оператор может получить о пользователях сервиса ReAge.
          </p>
        </Section>

        <Section icon={<Scale className="w-5 h-5" />} title="Основные принципы обработки персональных данных">
          <p>
            <strong className="text-foreground">2.1.</strong> Обработка персональных данных осуществляется на
            законной и справедливой основе.
          </p>
          <p>
            <strong className="text-foreground">2.2.</strong> Обработка персональных данных ограничивается
            достижением конкретных, заранее определённых и законных целей.
          </p>
          <p>
            <strong className="text-foreground">2.3.</strong> Не допускается обработка персональных данных,
            несовместимая с целями их сбора.
          </p>
          <p>
            <strong className="text-foreground">2.4.</strong> Обрабатываются только персональные данные,
            соответствующие заявленным целям обработки.
          </p>
          <p>
            <strong className="text-foreground">2.5.</strong> Оператор принимает необходимые правовые,
            организационные и технические меры для защиты персональных данных.
          </p>
        </Section>

        <Section icon={<ListChecks className="w-5 h-5" />} title="Категории обрабатываемых данных">
          <p>
            <strong className="text-foreground">3.1.</strong> Оператор может обрабатывать следующие персональные данные:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>фамилия, имя, отчество;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>дата рождения;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>пол;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>номер телефона;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>адрес электронной почты;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>сведения, содержащиеся в анкетах и опросниках;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>данные учётной записи пользователя;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>сведения об использовании сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>IP-адрес, cookie-файлы, технические идентификаторы устройств;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>иные сведения, добровольно предоставленные пользователем.</span>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-foreground">3.2.</strong> Оператор может обрабатывать специальные категории
            персональных данных, включая сведения о состоянии здоровья пользователя.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">3.3.</strong> К таким сведениям могут относиться:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>результаты лабораторных исследований, полученные от партнерских лабораторий с согласия пользователя;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>показатели здоровья;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>сведения об образе жизни;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>сведения о физической активности;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>сведения о питании;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>сведения о сне;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>иные сведения о состоянии здоровья, предоставленные пользователем либо полученные с его согласия.</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Target className="w-5 h-5" />} title="Цели обработки персональных данных">
          <p className="mb-3">
            <strong className="text-foreground">4.1.</strong> Оператор осуществляет обработку персональных данных
            в следующих целях:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>регистрация пользователя в сервисе;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>предоставление доступа к функционалу сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>ведение личного кабинета пользователя;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>формирование аналитических материалов и отчётов;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>отображение результатов исследований и истории показателей;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>организация взаимодействия пользователя с партнёрами сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>исполнение пользовательского соглашения;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>обработка обращений пользователей;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>направление уведомлений, связанных с работой сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>улучшение качества сервисов и пользовательского опыта;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>обеспечение информационной безопасности.</span>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-foreground">4.2.</strong> Сведения о состоянии здоровья пользователя обрабатываются исключительно для целей предоставления информационно-аналитических сервисов, формирования отчетов, расчета показателей здоровья, отображения динамики изменений и не используются для ведения медицинской документации, медицинских карт пациентов, постановки диагнозов, назначения лечения или оказания медицинской помощи.
          </p>
        </Section>

        <Section icon={<FileText className="w-5 h-5" />} title="Правовые основания обработки">
          <p className="mb-3">
            <strong className="text-foreground">5.1.</strong> Оператор осуществляет обработку персональных данных
            на основании:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>согласия субъекта персональных данных;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>пользовательского соглашения;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>требований законодательства Российской Федерации;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>иных законных оснований, предусмотренных законодательством Российской Федерации.</span>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-foreground">5.2.</strong> Обработка специальных категорий персональных данных, включая сведения о состоянии здоровья пользователя, осуществляется исключительно на основании отдельного согласия субъекта персональных данных в соответствии со статьей 10 Федерального закона № 152-ФЗ «О персональных данных».
          </p>
        </Section>

        <Section icon={<Database className="w-5 h-5" />} title="Порядок обработки и хранения данных">
          <p>
            <strong className="text-foreground">6.1.</strong> Обработка персональных данных может осуществляться
            как с использованием средств автоматизации, так и без использования таких средств.
          </p>
          <p>
            <strong className="text-foreground">6.2.</strong> Оператор обеспечивает конфиденциальность
            персональных данных.
          </p>
          <p>
            <strong className="text-foreground">6.3.</strong> Персональные данные хранятся не дольше, чем этого
            требуют цели их обработки либо требования законодательства Российской Федерации.
          </p>
          <p>
            <strong className="text-foreground">6.4.</strong> Персональные данные хранятся на серверах,
            расположенных на территории Российской Федерации.
          </p>
        </Section>

        <Section icon={<Eye className="w-5 h-5" />} title="Передача персональных данных третьим лицам">
          <p>
            <strong className="text-foreground">7.1.</strong> Оператор вправе передавать персональные данные третьим
            лицам исключительно в объёме, необходимом для достижения целей обработки.
          </p>
          <p className="mt-3">
            <strong className="text-foreground">7.2.</strong> Передача данных может осуществляться:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>партнерским медицинским организациям и лабораториям для организации, проведения и получения результатов исследований;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>подрядчикам, обеспечивающим функционирование сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>организациям, предоставляющим услуги хранения и обработки данных;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>государственным органам в случаях, предусмотренных законодательством Российской Федерации.</span>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-foreground">7.3.</strong> Передача специальных категорий персональных данных
            осуществляется только при наличии соответствующих законных оснований и согласий пользователя.
          </p>
        </Section>

        <Section icon={<Lock className="w-5 h-5" />} title="Права субъекта персональных данных">
          <p className="mb-3">Пользователь имеет право:</p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>
                <strong className="text-foreground">8.1.</strong> получать информацию об обработке своих
                персональных данных;
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>
                <strong className="text-foreground">8.2.</strong> требовать уточнения, блокирования или удаления
                своих персональных данных;
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>
                <strong className="text-foreground">8.3.</strong> отзывать ранее предоставленные согласия;
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>
                <strong className="text-foreground">8.4.</strong> обжаловать действия Оператора в уполномоченные
                органы или суд.
              </span>
            </li>
          </ul>
        </Section>

        <Section icon={<Shield className="w-5 h-5" />} title="Безопасность персональных данных">
          <p>
            <strong className="text-foreground">9.1.</strong> Оператор принимает необходимые организационные и
            технические меры для защиты персональных данных от:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>неправомерного доступа;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>уничтожения;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>изменения;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>блокирования;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>копирования;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>распространения;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>иных неправомерных действий.</span>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-foreground">9.2.</strong> Доступ к персональным данным предоставляется только
            уполномоченным лицам.
          </p>
        </Section>

        <Section icon={<Cookie className="w-5 h-5" />} title="Cookie-файлы и аналитика">
          <p>
            <strong className="text-foreground">10.1.</strong> Сервис может использовать cookie-файлы и иные
            технологии для обеспечения корректной работы сайта и улучшения пользовательского опыта.
          </p>
          <p>
            <strong className="text-foreground">10.2.</strong> Пользователь вправе изменить настройки использования
            cookie в своём браузере.
          </p>
        </Section>

        <Section icon={<Clock className="w-5 h-5" />} title="Отзыв согласия">
          <p>
            <strong className="text-foreground">11.1.</strong> Пользователь вправе в любой момент отозвать согласие
            на обработку персональных данных путём направления уведомления на адрес электронной почты{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>.
          </p>
          <p>
            <strong className="text-foreground">11.2.</strong> Отзыв согласия не влияет на законность обработки,
            осуществлённой до момента его получения Оператором.
          </p>
        </Section>

        <Section icon={<AlertCircle className="w-5 h-5" />} title="Заключительные положения">
          <p>
            <strong className="text-foreground">12.1.</strong> Оператор вправе вносить изменения в настоящую Политику.
          </p>
          <p>
            <strong className="text-foreground">12.2.</strong> Актуальная редакция Политики размещается на сайте{" "}
            <a href="https://reage.life" className="text-primary hover:underline">reage.life</a>.
          </p>
          <p>
            <strong className="text-foreground">12.3.</strong> Настоящая Политика действует бессрочно до её замены
            новой редакцией.
          </p>
        </Section>

        <div className="mt-12 p-6 rounded-2xl bg-muted/30 border border-border/30">
          <p className="text-sm text-muted-foreground leading-relaxed">
            По вопросам, связанным с обработкой персональных данных, обращайтесь по адресу электронной почты:{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>{" "}
            или по телефону:{" "}
            <a href="tel:+79967897404" className="text-primary hover:underline">+7 996 789-74-04</a>.
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
