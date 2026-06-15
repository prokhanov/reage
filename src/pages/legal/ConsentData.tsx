import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import {
  ClipboardCheck,
  User,
  HeartPulse,
  Target,
  Database,
  Share2,
  Clock,
  Mail,
  FileCheck,
} from "lucide-react";

export default function ConsentData() {
  return (
    <>
      <Helmet>
        <title>Согласие на обработку персональных данных — ReAge</title>
        <meta
          name="description"
          content="Форма согласия на обработку персональных данных и специальных категорий персональных данных пользователей сервиса ReAge."
        />
      </Helmet>
      <LegalPageLayout
        title="Согласие на обработку персональных данных и специальных категорий персональных данных"
        subtitle="Добровольное согласие пользователя на обработку его персональных данных"
        icon={<ClipboardCheck className="w-6 h-6 text-primary" />}
      >
        <div className="mb-10 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-muted-foreground leading-relaxed">
            Настоящим я свободно, своей волей и в своём интересе даю согласие Обществу с ограниченной
            ответственностью «Реэйдж» (ИНН 9704271028, ОГРН 1267700099985, адрес: 121099, г. Москва,
            вн. тер. г. муниципальный округ Арбат, пер. 1-й Смоленский, д. 22/10, помещ. 3/П) на обработку
            моих персональных данных и специальных категорий персональных данных на условиях, изложенных ниже.
          </p>
        </div>

        <Section icon={<User className="w-5 h-5" />} title="Перечень персональных данных">
          <p className="mb-3">
            Я даю согласие на обработку следующих персональных данных:
          </p>
          <ul className="space-y-1.5">
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
              <span>сведения, содержащиеся в анкетах, опросниках и формах Сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>сведения об использовании Сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>иные данные, предоставленные мной самостоятельно.</span>
            </li>
          </ul>
        </Section>

        <Section icon={<HeartPulse className="w-5 h-5" />} title="Специальные категории персональных данных">
          <p className="mb-3">
            Я даю отдельное согласие на обработку сведений о состоянии здоровья, включая:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>результаты лабораторных исследований, полученные от партнёрских лабораторий по поручению или с согласия Пользователя;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>показатели здоровья;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>биометрические и физиологические показатели, предоставленные мной;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>сведения о самочувствии, образе жизни, питании, физической активности и сне;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>
                иные сведения о состоянии здоровья, предоставленные мной либо полученные с моего согласия
                от третьих лиц.
              </span>
            </li>
          </ul>
        </Section>

        <Section icon={<Target className="w-5 h-5" />} title="Цели обработки данных">
          <p className="mb-3">
            Персональные данные обрабатываются в целях:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>регистрации и идентификации пользователя;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>предоставления доступа к сервису ReAge;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>формирования аналитических отчётов;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>хранения и отображения данных в личном кабинете;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>организации взаимодействия с партнёрами сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>технической поддержки пользователей;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>исполнения пользовательского соглашения;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>направления уведомлений, связанных с использованием сервиса;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>улучшения качества работы сервиса.</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Database className="w-5 h-5" />} title="Действия с персональными данными">
          <p className="mb-3">
            Оператор вправе осуществлять следующие действия:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>сбор;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>запись;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>систематизация;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>накопление;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>хранение;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>уточнение;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>извлечение;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>использование;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>передача;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>обезличивание;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>блокирование;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>удаление;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>уничтожение.</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Share2 className="w-5 h-5" />} title="Передача данных третьим лицам">
          <p>
            Я выражаю согласие на передачу моих данных партнёрам сервиса в объёме, необходимом для исполнения
            пользовательского соглашения.
          </p>
          <p className="mt-3 mb-2">
            К таким партнёрам могут относиться:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>лаборатории и диагностические организации;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>организации, осуществляющие забор биоматериала;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>организации, обеспечивающие хранение и обработку данных;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>иные подрядчики, привлекаемые для функционирования сервиса.</span>
            </li>
          </ul>
          <p className="mt-3">
            Я также выражаю согласие на получение ООО «Реэйдж» результатов лабораторных исследований от
            партнёрских лабораторий при наличии соответствующих оснований и моего волеизъявления.
          </p>
        </Section>

        <Section icon={<Clock className="w-5 h-5" />} title="Срок действия согласия">
          <p>
            Согласие действует с момента его предоставления и до момента его отзыва либо прекращения целей
            обработки данных.
          </p>
        </Section>

        <Section icon={<Mail className="w-5 h-5" />} title="Отзыв согласия">
          <p>
            Согласие может быть отозвано путём направления письменного уведомления на адрес электронной почты:{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>.
          </p>
          <p className="mt-3">
            Отзыв согласия не влияет на законность обработки данных, осуществлённой до момента получения
            уведомления об отзыве.
          </p>
        </Section>

        <Section icon={<FileCheck className="w-5 h-5" />} title="Заключительные положения">
          <p>
            Подтверждаю, что настоящее согласие предоставлено мной добровольно, условия согласия мне понятны,
            последствия предоставления согласия разъяснены и понятны.
          </p>
          <p className="mt-3">
            Дата предоставления согласия определяется моментом установки соответствующей отметки на сайте либо
            совершения действий, свидетельствующих о принятии условий настоящего документа.
          </p>
        </Section>
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
