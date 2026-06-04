import { Helmet } from "react-helmet-async";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { FlaskConical, FileSearch, Lock, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ConsentResearch() {
  return (
    <>
      <Helmet>
        <title>Согласие на получение и обработку исследований — ReAge</title>
        <meta name="description" content="Согласие на получение, обработку и хранение результатов лабораторных исследований в сервисе ReAge." />
      </Helmet>
      <LegalPageLayout
        title="Согласие на получение и обработку исследований"
        subtitle="Условия передачи и обработки результатов лабораторных исследований"
        icon={<FlaskConical className="w-6 h-6 text-primary" />}
      >
        <div className="mb-10 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <p className="text-muted-foreground leading-relaxed">
            Настоящим я, субъект медицинских услуг и пользователь Сервиса ReAge, даю своё информированное
            добровольное согласие Обществу с ограниченной ответственностью «Реэйдж» (ИНН 9704271028,
            ОГРН 1267700099985) на получение, обработку и хранение результатов моих лабораторных
            исследований и медицинских данных.
          </p>
        </div>

        <Section icon={<FileSearch className="w-5 h-5" />} title="1. Предмет согласия">
          <p>
            1.1. Я даю согласие на получение Оператором результатов моих лабораторных исследований
            от лицензированных медицинских организаций — партнёров Сервиса, а также на прямое
            предоставление мной таких результатов через интерфейс Сервиса.
          </p>
          <p>
            1.2. К данным, на обработку которых даётся согласие, относятся:
          </p>
          <ul className="space-y-2 mt-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Результаты лабораторных анализов крови, мочи и других биоматериалов</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Значения биомаркеров и их динамика во времени</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Сведения о проведённых медицинских исследованиях и их результатах</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span>Сопутствующие медицинские данные, предоставленные вместе с результатами исследований</span>
            </li>
          </ul>
        </Section>

        <Section icon={<CheckCircle2 className="w-5 h-5" />} title="2. Цели обработки">
          <p>
            2.1. Согласие дано на обработку результатов исследований в следующих целях:
          </p>
          <ul className="space-y-2 mt-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Анализ биомаркеров и построение персонализированных отчётов о состоянии здоровья</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Отслеживание динамики показателей здоровья во времени</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Формирование рекомендаций по коррекции образа жизни, питания и подходов к здоровью</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Интеграция данных с функционалом Сервиса для визуализации и аналитики</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span>Хранение истории исследований для долгосрочного мониторинга</span>
            </li>
          </ul>
        </Section>

        <Section icon={<Lock className="w-5 h-5" />} title="3. Условия обработки">
          <p>
            3.1. Оператор обязуется обеспечить конфиденциальность полученных результатов исследований
            и не передавать их третьим лицам без моего дополнительного согласия, за исключением случаев,
            предусмотренных законодательством РФ.
          </p>
          <p>
            3.2. Оператор вправе использовать обезличенные данные для статистических и исследовательских
            целей при условии, что такие данные не позволяют идентифицировать меня как субъекта.
          </p>
          <p>
            3.3. Результаты исследований хранятся в защищённом виде с применением современных средств
            криптографической защиты и разграничения доступа.
          </p>
        </Section>

        <Section icon={<AlertTriangle className="w-5 h-5" />} title="4. Порядок отзыва">
          <p>
            4.1. Я вправе отозвать настоящее согласие в любое время путём направления письменного
            уведомления на адрес электронной почты{" "}
            <a href="mailto:team@reage.life" className="text-primary hover:underline">team@reage.life</a>.
          </p>
          <p>
            4.2. Отзыв согласия влечёт за собой удаление результатов исследований из Сервиса в течение 30 (тридцати)
            календарных дней, за исключением данных, обработка которых необходима в соответствии с законодательством РФ.
          </p>
          <p>
            4.3. Отзыв согласия не влияет на законность обработки данных, осуществлённой до момента отзыва.
          </p>
        </Section>

        <div className="mt-10 p-6 rounded-2xl bg-muted/30 border border-border/30">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Я подтверждаю, что ознакомлен с Политикой обработки персональных данных и Пользовательским
            соглашением Сервиса ReAge, понимаю характер обрабатываемых данных, цели их обработки,
            а также свои права, предусмотренные законодательством Российской Федерации.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Я понимаю, что Сервис ReAge не оказывает медицинских услуг, а результаты анализа носят
            информационно-справочный характер и не заменяют консультацию врача.
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
