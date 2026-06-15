import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import {
  ScrollText,
  Building2,
  BookOpen,
  FlaskConical,
  CreditCard,
  RefreshCcw,
  UserCircle,
  ShieldCheck,
  Scale,
  Lightbulb,
  FileWarning,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Gavel,
  Clock,
  Landmark,
} from "lucide-react";

export default function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Пользовательское соглашение — ReAge</title>
        <meta
          name="description"
          content="Пользовательское соглашение (публичная оферта) сервиса ReAge. Условия использования, права и обязанности сторон."
        />
      </Helmet>
      <LegalPageLayout
        title="Пользовательское соглашение (Публичная оферта)"
        subtitle="Дата вступления в силу: 4 июня 2026 года"
        icon={<ScrollText className="w-6 h-6 text-primary" />}
      >
        <div className="mb-10 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-muted-foreground leading-relaxed">
            Настоящее Пользовательское соглашение является публичной офертой Общества с ограниченной
            ответственностью «Реэйдж» и определяет условия использования сервиса ReAge, размещённого на
            сайте <a href="https://reage.life" className="text-primary hover:underline">reage.life</a> и связанных с ним цифровых сервисов.
          </p>
        </div>

        <Section icon={<Building2 className="w-5 h-5" />} title="Сведения об Операторе">
          <div className="p-5 rounded-xl bg-muted/30 border border-border/30 space-y-2 text-foreground">
            <p><strong className="font-semibold">Полное наименование:</strong> Общество с ограниченной ответственностью «Реэйдж»</p>
            <p><strong className="font-semibold">ИНН:</strong> 9704271028</p>
            <p><strong className="font-semibold">КПП:</strong> 770401001</p>
            <p><strong className="font-semibold">ОГРН:</strong> 1267700099985</p>
            <p><strong className="font-semibold">Адрес:</strong> 121099, г. Москва, вн. тер. г. муниципальный округ Арбат, пер. 1-й Смоленский, д. 22/10, помещ. 3/П</p>
            <p><strong className="font-semibold">Генеральный директор:</strong> Святодумов Владислав Артурович</p>
            <p><strong className="font-semibold">Телефон:</strong> <a href="tel:+79967897404" className="text-primary hover:underline">+7 996 789-74-04</a></p>
            <p><strong className="font-semibold">Электронная почта:</strong> <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a></p>
          </div>
        </Section>

        <Section icon={<BookOpen className="w-5 h-5" />} title="Общие положения">
          <p>
            <strong className="text-foreground">2.1.</strong> Настоящее Соглашение является публичной офертой
            в соответствии со статьями 435 и 437 Гражданского кодекса Российской Федерации.
          </p>
          <p>
            <strong className="text-foreground">2.2.</strong> Акцептом настоящей оферты является совершение
            Пользователем любого из следующих действий:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>регистрация на Сайте;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>заполнение анкет, опросников или иных форм;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>оформление Подписки;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>оплата услуг Оператора;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>фактическое использование функционала Сервиса.</span>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-foreground">2.3.</strong> С момента акцепта между Пользователем и Оператором
            считается заключённым договор на условиях настоящего Соглашения.
          </p>
          <p>
            <strong className="text-foreground">2.4.</strong> Пользователь подтверждает, что обладает необходимой
            дееспособностью и полномочиями для заключения настоящего Соглашения.
          </p>
        </Section>

        <Section icon={<BookOpen className="w-5 h-5" />} title="Термины и определения">
          <p>
            <strong className="text-foreground">Сервис ReAge (Сервис)</strong> — цифровая информационно-аналитическая
            платформа, предназначенная для сбора, хранения, обработки, структурирования, визуализации и предоставления
            Пользователю сведений о показателях его здоровья, а также организации взаимодействия Пользователя с партнёрами Сервиса.
          </p>
          <p>
            <strong className="text-foreground">Сайт</strong> — интернет-сайт, расположенный по адресу{" "}
            <a href="https://reage.life" className="text-primary hover:underline">reage.life</a>, включая все его поддомены и связанные цифровые сервисы.
          </p>
          <p>
            <strong className="text-foreground">Пользователь</strong> — физическое лицо, акцептовавшее настоящее Соглашение.
          </p>
          <p>
            <strong className="text-foreground">Подписка</strong> — предоставляемое Пользователю право доступа к
            функционалу Сервиса в течение определённого периода времени на условиях выбранного тарифа.
          </p>
          <p>
            <strong className="text-foreground">Личный кабинет</strong> — защищённый раздел Сервиса, доступ к которому
            предоставляется Пользователю после регистрации.
          </p>
          <p>
            <strong className="text-foreground">Партнёр</strong> — третье лицо, привлекаемое для оказания отдельных
            услуг Пользователю, включая лабораторные исследования, забор биоматериала, логистику, консультационные
            услуги и иные услуги.
          </p>
          <p>
            <strong className="text-foreground">Отчёт</strong> — информационно-аналитический документ, формируемый в
            Сервисе на основании данных Пользователя и результатов исследований, полученных от Партнёров.
          </p>
          <p>
            <strong className="text-foreground">Конклюдентные действия</strong> — поведение Пользователя, явно
            выражающее согласие заключить договор на условиях настоящей оферты, в частности: регистрация на Сайте,
            заполнение заявки или анкеты, сообщение требуемых сведений по телефону или электронной почте, оформление
            Подписки, оплата услуг Оператора, а также фактическое использование функционала Сервиса.
          </p>
        </Section>

        <Section icon={<ScrollText className="w-5 h-5" />} title="Предмет соглашения">
          <p>
            <strong className="text-foreground">4.1.</strong> Оператор предоставляет Пользователю доступ к Сервису
            ReAge и оказывает информационно-аналитические услуги, направленные на систематизацию, визуализацию и
            представление данных о состоянии здоровья Пользователя.
          </p>
          <p className="mt-3">
            <strong className="text-foreground">4.2.</strong> В рамках Сервиса Пользователю могут предоставляться:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>личный кабинет;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>хранение результатов исследований;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>аналитические отчёты;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>визуализация показателей и динамики изменений;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>расчёт индексов и производных показателей;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>инструменты мониторинга изменений показателей во времени;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>сервисы сопровождения Пользователя;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>организация взаимодействия с Партнёрами.</span>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-foreground">4.3.</strong> Услуги Оператора носят исключительно
            информационно-аналитический и организационный характер.
          </p>
          <p>
            <strong className="text-foreground">4.4.</strong> Оператор не осуществляет медицинскую деятельность,
            не оказывает медицинскую помощь, не осуществляет диагностику заболеваний, не назначает лечение и не
            принимает клинических решений.
          </p>
        </Section>

        <Section icon={<FlaskConical className="w-5 h-5" />} title="Лабораторные исследования и партнёры">
          <p>
            <strong className="text-foreground">5.1.</strong> Лабораторные исследования, забор биоматериала и иные
            медицинские услуги оказываются Пользователю третьими лицами, имеющими необходимые разрешения,
            лицензии и полномочия.
          </p>
          <p>
            <strong className="text-foreground">5.2.</strong> На момент публикации настоящего Соглашения лабораторные
            исследования могут выполняться АО «ЛабКвест» либо иными партнёрами Оператора.
          </p>
          <p>
            <strong className="text-foreground">5.3.</strong> Пользователь понимает и соглашается, что Оператор не
            является исполнителем лабораторных исследований и не несёт ответственности за процесс их проведения.
          </p>
          <p>
            <strong className="text-foreground">5.4.</strong> Пользователь вправе предоставить согласие на передачу
            результатов исследований Оператору для последующей обработки и отображения в Сервисе.
          </p>
          <p>
            <strong className="text-foreground">5.5.</strong> Оператор вправе получать результаты исследований от
            Партнёров исключительно в объёме, необходимом для функционирования Сервиса и исполнения настоящего
            Соглашения.
          </p>
          <p>
            <strong className="text-foreground">5.6.</strong> Оператор вправе использовать сведения, полученные от
            Партнёров, для формирования Отчётов, аналитических материалов и отображения информации в Личном
            кабинете Пользователя.
          </p>
        </Section>

        <Section icon={<CreditCard className="w-5 h-5" />} title="Подписка и порядок предоставления доступа">
          <p>
            <strong className="text-foreground">6.1.</strong> Доступ к функционалу Сервиса предоставляется на основании
            приобретённой Пользователем Подписки.
          </p>
          <p>
            <strong className="text-foreground">6.2.</strong> Перечень функций, срок действия Подписки, объём
            предоставляемых сервисов и стоимость определяются выбранным тарифом, информация о котором размещается
            на Сайте.
          </p>
          <p>
            <strong className="text-foreground">6.3.</strong> Подписка может включать один или несколько циклов
            взаимодействия Пользователя с Партнёрами, получение одного или нескольких Отчётов, доступ к Личному
            кабинету, хранение данных и иные сервисы.
          </p>
          <p>
            <strong className="text-foreground">6.4.</strong> Оператор вправе изменять состав и функциональность
            Сервиса в целях его развития и совершенствования при условии сохранения основной потребительской
            ценности приобретённой Подписки.
          </p>
          <p>
            <strong className="text-foreground">6.5.</strong> Если иное не предусмотрено тарифом, доступ к Сервису
            предоставляется на срок, указанный при оформлении Подписки.
          </p>
          <p>
            <strong className="text-foreground">6.6.</strong> Отдельные функции Сервиса могут предоставляться
            поэтапно по мере получения данных от Пользователя или Партнёров.
          </p>
        </Section>

        <Section icon={<CreditCard className="w-5 h-5" />} title="Порядок оплаты">
          <p>
            <strong className="text-foreground">7.1.</strong> Стоимость Подписки определяется Оператором и публикуется
            на Сайте.
          </p>
          <p>
            <strong className="text-foreground">7.2.</strong> Оплата производится в безналичной форме посредством
            банковских карт, системы быстрых платежей либо иных способов, доступных на Сайте.
          </p>
          <p>
            <strong className="text-foreground">7.3.</strong> Расчёты осуществляются через платёжных партнёров Оператора.
          </p>
          <p>
            <strong className="text-foreground">7.4.</strong> Обязательство Пользователя по оплате считается исполненным
            с момента поступления денежных средств на расчётный счёт Оператора либо получения подтверждения платёжной
            системы.
          </p>
          <p>
            <strong className="text-foreground">7.5.</strong> Оператор вправе предоставлять скидки, специальные условия
            и акционные предложения отдельным категориям Пользователей.
          </p>
        </Section>

        <Section icon={<RefreshCcw className="w-5 h-5" />} title="Возврат денежных средств">
          <p>
            <strong className="text-foreground">8.1.</strong> Пользователь вправе отказаться от исполнения договора
            в порядке, предусмотренном законодательством Российской Федерации.
          </p>
          <p>
            <strong className="text-foreground">8.2.</strong> При отказе Пользователя от Подписки возврат денежных
            средств осуществляется за вычетом стоимости фактически оказанных услуг и фактически понесённых Оператором
            расходов.
          </p>
          <p>
            <strong className="text-foreground">8.3.</strong> К фактически понесённым расходам могут относиться расходы
            на организацию взаимодействия с Партнёрами, подготовку Отчётов, обработку данных, обслуживание Личного
            кабинета и иные расходы, непосредственно связанные с исполнением договора.
          </p>
          <p>
            <strong className="text-foreground">8.4.</strong> Возврат осуществляется тем же способом, которым была
            произведена оплата, если иное не согласовано сторонами.
          </p>
        </Section>

        <Section icon={<UserCircle className="w-5 h-5" />} title="Личный кабинет">
          <p>
            <strong className="text-foreground">9.1.</strong> Для использования отдельных функций Сервиса
            Пользователь проходит регистрацию и получает доступ к Личному кабинету.
          </p>
          <p>
            <strong className="text-foreground">9.2.</strong> Пользователь обязан обеспечивать конфиденциальность
            своих учётных данных.
          </p>
          <p>
            <strong className="text-foreground">9.3.</strong> Все действия, совершённые с использованием учётной записи
            Пользователя, считаются совершёнными самим Пользователем.
          </p>
          <p>
            <strong className="text-foreground">9.4.</strong> Пользователь обязан незамедлительно уведомить Оператора
            о фактах несанкционированного доступа к своей учётной записи.
          </p>
        </Section>

        <Section icon={<ShieldCheck className="w-5 h-5" />} title="Персональные данные и данные о состоянии здоровья">
          <p>
            <strong className="text-foreground">10.1.</strong> Оператор осуществляет обработку персональных данных
            Пользователя в соответствии с законодательством Российской Федерации и Политикой обработки персональных
            данных.
          </p>
          <p>
            <strong className="text-foreground">10.2.</strong> Отдельные категории данных, предоставляемые Пользователем
            либо получаемые от Партнёров, могут относиться к специальным категориям персональных данных.
          </p>
          <p>
            <strong className="text-foreground">10.3.</strong> Передача таких данных Оператору осуществляется исключительно
            при наличии соответствующих согласий Пользователя.
          </p>
          <p>
            <strong className="text-foreground">10.4.</strong> Пользователь предоставляет Оператору право получать
            сведения от Партнёров в объёме, необходимом для исполнения настоящего Соглашения и функционирования Сервиса.
          </p>
          <p>
            <strong className="text-foreground">10.5.</strong> Пользователь предоставляет Оператору право передавать
            сведения Партнёрам в объёме, необходимом для исполнения настоящего Соглашения.
          </p>
        </Section>

        <Section icon={<Scale className="w-5 h-5" />} title="Права и обязанности Пользователя">
          <p className="mb-2">
            <strong className="text-foreground">11.1.</strong> Пользователь обязуется:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>предоставлять достоверную информацию;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>не использовать Сервис в противоправных целях;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>не предпринимать действий, направленных на нарушение работы Сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>своевременно предоставлять данные, необходимые для исполнения настоящего Соглашения.</span>
            </li>
          </ul>
          <p className="mt-3 mb-2">
            <strong className="text-foreground">11.2.</strong> Пользователь вправе:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>получать доступ к функционалу Сервиса в соответствии с выбранным тарифом;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>получать информацию о порядке обработки своих данных;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>обращаться в службу поддержки Оператора.</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Lightbulb className="w-5 h-5" />} title="Права и обязанности Оператора">
          <p className="mb-2">
            <strong className="text-foreground">12.1.</strong> Оператор вправе:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>привлекать Партнёров для исполнения отдельных обязательств;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>изменять состав функционала Сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>приостанавливать доступ Пользователя в случае нарушения условий настоящего Соглашения;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>направлять Пользователю информационные уведомления, связанные с исполнением настоящего Соглашения.</span>
            </li>
          </ul>
          <p className="mt-3 mb-2">
            <strong className="text-foreground">12.2.</strong> Оператор обязуется:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>обеспечивать функционирование Сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>принимать разумные меры по защите данных Пользователей;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>исполнять обязательства, предусмотренные настоящим Соглашением.</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Scale className="w-5 h-5" />} title="Интеллектуальная собственность">
          <p>
            <strong className="text-foreground">13.1.</strong> Все права на Сервис, Сайт, программное обеспечение,
            базы данных, интерфейсы, дизайн, тексты, изображения, графические материалы, отчёты, методики представления
            информации, алгоритмы обработки данных и иные объекты интеллектуальной собственности принадлежат Оператору
            либо используются им на законных основаниях.
          </p>
          <p>
            <strong className="text-foreground">13.2.</strong> Пользователю предоставляется ограниченное неисключительное
            право использования Сервиса исключительно в личных некоммерческих целях в течение срока действия Подписки.
          </p>
          <p className="mt-3">
            <strong className="text-foreground">13.3.</strong> Пользователь не вправе:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>копировать, воспроизводить, распространять, публиковать или иным образом использовать материалы Сервиса без письменного согласия Оператора;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>осуществлять декомпиляцию, модификацию либо иное вмешательство в программное обеспечение Сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>использовать результаты работы Сервиса для создания аналогичных продуктов или сервисов.</span>
            </li>
          </ul>
        </Section>

        <Section icon={<FileWarning className="w-5 h-5" />} title="Особые условия использования аналитических материалов">
          <p>
            <strong className="text-foreground">14.1.</strong> Отчёты, аналитические материалы, индексы, расчётные
            показатели, визуализации и иные результаты работы Сервиса предназначены исключительно для информационных
            целей.
          </p>
          <p className="mt-3">
            <strong className="text-foreground">14.2.</strong> Материалы Сервиса не являются:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>медицинским заключением;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>диагнозом;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>назначением лечения;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>рекомендацией по применению лекарственных препаратов;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>медицинской консультацией.</span>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-foreground">14.3.</strong> Пользователь самостоятельно принимает решения
            относительно дальнейших действий на основании полученной информации.
          </p>
          <p>
            <strong className="text-foreground">14.4.</strong> При наличии вопросов, связанных с состоянием здоровья,
            Пользователю рекомендуется обращаться к профильным специалистам.
          </p>
          <p>
            <strong className="text-foreground">14.5.</strong> Оператор не гарантирует достижение какого-либо
            конкретного результата, улучшения состояния здоровья либо изменения каких-либо показателей Пользователя.
          </p>
        </Section>

        <Section icon={<AlertTriangle className="w-5 h-5" />} title="Ограничение ответственности">
          <p>
            <strong className="text-foreground">15.1.</strong> Оператор не несёт ответственности за:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>действия либо бездействие Партнёров;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>качество, полноту и достоверность результатов лабораторных исследований;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>качество и содержание услуг, оказываемых Партнёрами;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>решения Пользователя, принятые на основании информации, полученной через Сервис;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>последствия использования Пользователем информации, содержащейся в Отчётах.</span>
            </li>
          </ul>
          <p className="mt-3">
            <strong className="text-foreground">15.2.</strong> Оператор не гарантирует непрерывную и безошибочную
            работу Сервиса, однако принимает разумные меры для поддержания его работоспособности.
          </p>
          <p>
            <strong className="text-foreground">15.3.</strong> Максимальный размер ответственности Оператора по любым
            требованиям Пользователя ограничивается суммой денежных средств, фактически уплаченной Пользователем за
            последние двенадцать месяцев использования Сервиса.
          </p>
          <p>
            <strong className="text-foreground">15.4.</strong> Оператор не несёт ответственности за невозможность
            использования Сервиса по причинам, не зависящим от Оператора.
          </p>
        </Section>

        <Section icon={<CheckCircle2 className="w-5 h-5" />} title="Заверения Пользователя">
          <p>
            <strong className="text-foreground">16.1.</strong> Пользователь подтверждает, что все сведения,
            предоставляемые им в Сервисе, являются достоверными, актуальными и принадлежат Пользователю либо
            используются им на законных основаниях.
          </p>
          <p>
            <strong className="text-foreground">16.2.</strong> Пользователь подтверждает, что понимает информационный
            характер предоставляемых материалов и принимает условия настоящего Соглашения.
          </p>
          <p>
            <strong className="text-foreground">16.3.</strong> Пользователь подтверждает своё согласие на
            электронное взаимодействие с Оператором посредством сайта, мобильных устройств, электронной почты,
            SMS-сообщений и иных каналов связи.
          </p>
        </Section>

        <Section icon={<AlertTriangle className="w-5 h-5" />} title="Форс-мажор">
          <p>
            <strong className="text-foreground">17.1.</strong> Стороны освобождаются от ответственности за частичное
            либо полное неисполнение обязательств, вызванное обстоятельствами непреодолимой силы.
          </p>
          <p>
            <strong className="text-foreground">17.2.</strong> К обстоятельствам непреодолимой силы относятся события,
            которые стороны не могли предвидеть либо предотвратить разумными мерами, включая стихийные бедствия,
            военные действия, решения органов государственной власти, сбои инфраструктуры связи и иные аналогичные
            обстоятельства.
          </p>
          <p>
            <strong className="text-foreground">17.3.</strong> Сторона, для которой создалась невозможность
            исполнения обязательств вследствие форс-мажора, обязана уведомить об этом другую Сторону в течение
            30 (тридцати) рабочих дней с момента наступления соответствующих обстоятельств.
          </p>
          <p>
            <strong className="text-foreground">17.4.</strong> Достаточным подтверждением наличия и продолжительности
            действия обстоятельств непреодолимой силы является документ, выданный уполномоченным государственным
            органом.
          </p>
          <p>
            <strong className="text-foreground">17.5.</strong> Если обстоятельства непреодолимой силы продолжают
            действовать более 60 (шестидесяти) рабочих дней, каждая из Сторон вправе отказаться от исполнения
            настоящего Соглашения в одностороннем порядке без возмещения убытков, причинённых таким отказом.
          </p>
        </Section>

        <Section icon={<ClipboardCheck className="w-5 h-5" />} title="Порядок рассмотрения претензий">
          <p>
            <strong className="text-foreground">18.1.</strong> До обращения в суд Пользователь обязуется направить
            письменную претензию Оператору.
          </p>
          <p>
            <strong className="text-foreground">18.2.</strong> Претензия направляется по адресу электронной почты{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>{" "}
            либо по адресу местонахождения Оператора.
          </p>
          <p>
            <strong className="text-foreground">18.3.</strong> Срок рассмотрения претензии составляет 30 календарных
            дней с момента её получения.
          </p>
        </Section>

        <Section icon={<Gavel className="w-5 h-5" />} title="Разрешение споров">
          <p>
            <strong className="text-foreground">19.1.</strong> Все споры и разногласия, возникающие в связи с
            исполнением настоящего Соглашения, подлежат урегулированию путём переговоров.
          </p>
          <p>
            <strong className="text-foreground">19.2.</strong> При невозможности достижения соглашения спор подлежит
            рассмотрению в соответствии с законодательством Российской Федерации.
          </p>
        </Section>

        <Section icon={<Clock className="w-5 h-5" />} title="Изменение соглашения">
          <p>
            <strong className="text-foreground">20.1.</strong> Оператор вправе в любое время вносить изменения в
            настоящее Соглашение.
          </p>
          <p>
            <strong className="text-foreground">20.2.</strong> Новая редакция Соглашения вступает в силу с момента её
            размещения на Сайте, если иной срок не указан Оператором.
          </p>
          <p>
            <strong className="text-foreground">20.3.</strong> Продолжение использования Сервиса после внесения
            изменений означает согласие Пользователя с новой редакцией Соглашения.
          </p>
        </Section>

        <Section icon={<Clock className="w-5 h-5" />} title="Срок действия соглашения">
          <p>
            <strong className="text-foreground">21.1.</strong> Настоящее Соглашение вступает в силу с момента акцепта
            Пользователем и действует до момента прекращения использования Сервиса либо прекращения действия Подписки.
          </p>
          <p>
            <strong className="text-foreground">21.2.</strong> Положения настоящего Соглашения, связанные с обработкой
            данных, интеллектуальной собственностью, ограничением ответственности и разрешением споров, сохраняют
            своё действие после прекращения использования Сервиса.
          </p>
        </Section>

        <Section icon={<Gavel className="w-5 h-5" />} title="Дополнительные условия">
          <p>
            <strong className="text-foreground">22.1.</strong> Заключение и исполнение настоящего Соглашения, а
            также все отношения Сторон, не урегулированные им либо урегулированные не полностью, регулируются
            действующим законодательством Российской Федерации. Досудебный порядок урегулирования споров является
            обязательным.
          </p>
          <p>
            <strong className="text-foreground">22.2.</strong> Языком настоящего Соглашения, а также языком, на
            котором осуществляется любое взаимодействие Сторон (включая ведение переписки, направление требований,
            уведомлений, разъяснений и предоставление документов), Стороны определили русский язык. Документы,
            составленные на ином языке, предоставляются с переводом на русский язык, удостоверенным в
            установленном порядке.
          </p>
          <p>
            <strong className="text-foreground">22.3.</strong> Бездействие одной из Сторон в случае нарушения
            условий настоящего Соглашения другой Стороной не лишает заинтересованную Сторону права осуществлять
            защиту своих интересов позднее и не означает отказа от своих прав в случае совершения подобных либо
            сходных нарушений в будущем.
          </p>
          <p>
            <strong className="text-foreground">22.4.</strong> Если на Сайте размещены ссылки на сторонние
            веб-сайты или материалы третьих лиц, такие ссылки приведены исключительно в информационных целях.
            Оператор не контролирует содержание таких сайтов и материалов и не несёт ответственности за любые
            убытки или ущерб, которые могут возникнуть в результате их использования Пользователем.
          </p>
        </Section>

        <Section icon={<Landmark className="w-5 h-5" />} title="Реквизиты Оператора">
          <div className="p-5 rounded-xl bg-muted/30 border border-border/30 space-y-2 text-foreground">
            <p><strong className="font-semibold">Общество с ограниченной ответственностью «Реэйдж»</strong></p>
            <p>ИНН: 9704271028</p>
            <p>КПП: 770401001</p>
            <p>ОГРН: 1267700099985</p>
            <p>Адрес: 121099, г. Москва, вн. тер. г. муниципальный округ Арбат, пер. 1-й Смоленский, д. 22/10, помещ. 3/П</p>
            <p>Генеральный директор: Святодумов Владислав Артурович</p>
            <p>Телефон: <a href="tel:+79967897404" className="text-primary hover:underline">+7 996 789-74-04</a></p>
            <p>Электронная почта: <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a></p>
            <p>Расчётный счёт: 40702810620000299478</p>
            <p>Банк: ООО «Банк Точка»</p>
            <p>БИК: 044525104</p>
            <p>Корреспондентский счёт: 30101810745374525104</p>
          </div>
        </Section>

        <div className="mt-12 p-6 rounded-2xl bg-muted/30 border border-border/30">
          <p className="text-sm text-muted-foreground leading-relaxed">
            По всем вопросам, связанным с настоящим Соглашением, обращайтесь по адресу:{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Дата вступления в силу: 4 июня 2026 года.
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
