import {
  Activity,
  Battery,
  Beaker,
  Bolt,
  Droplet,
  FlaskConical,
  Gauge,
  HeartPulse,
  Leaf,
  Scale,
  Shield,
  Sparkles,
  Sun,
  Waves,
  type LucideIcon,
} from "lucide-react";

import heroBase40 from "@/assets/energy/hero-base40.jpg";
import heroCardio from "@/assets/energy/hero-cardio.jpg";
import heroFemaleHormones from "@/assets/energy/hero-female-hormones.jpg";
import heroHair from "@/assets/energy/hero-hair.jpg";
import heroIron from "@/assets/energy/hero-iron.jpg";
import heroKidney from "@/assets/energy/hero-kidney.jpg";
import heroLiver from "@/assets/energy/hero-liver.jpg";
import heroMaleHormones from "@/assets/energy/hero-male-hormones.jpg";
import heroMetabolic from "@/assets/energy/hero-metabolic.jpg";
import heroThyroid from "@/assets/energy/hero-thyroid.jpg";
import heroVitamins from "@/assets/energy/hero-vitamins.jpg";
import heroWoman from "@/assets/energy/hero-woman.jpg";

export type CheckupAccent = "primary" | "accent" | "info";
export type CheckupShape =
  | "spark"
  | "diamond"
  | "circle"
  | "wave"
  | "square"
  | "triangle"
  | "ring"
  | "plus";

export interface CheckupMarker {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface Checkup {
  /** Часть адреса: /checkup/<slug>. */
  slug: string;
  /** Идентификатор набора на сервере (energy-create-payment). */
  bundle: string;
  href: string;
  name: string;
  /** Короткая метка категории для карточек. */
  tag: string;
  price: number;
  accent: CheckupAccent;
  shape: CheckupShape;
  /** Фото для hero-блока страницы чекапа. */
  heroImage: string;
  heroAlt: string;
  /** Две строки подписи поверх фото. */
  heroCaption: [string, string];
  /** H1 на странице чекапа. */
  heroTitle: string;
  /** Подзаголовок под H1. */
  heroSubtitle: string;
  /** Абзац «для кого» под подзаголовком. */
  lead: string;
  /** Короткое описание для карточки в карусели. */
  cardText: string;
  /** Подпись под списком показателей. */
  includedNote: string;
  seoTitle: string;
  seoDescription: string;
  /** Дополнительные правила подготовки к сдаче именно этого чекапа. */
  prepNotes?: string[];
  markers: CheckupMarker[];
}

const SUBTITLE = "с полной расшифровкой на понятном языке";

export const CHECKUPS: Checkup[] = [
  {
    slug: "energy",
    bundle: "energy",
    href: "/checkup/energy",
    name: "ReAge Энергия",
    tag: "Энергия и усталость",
    price: 5990,
    accent: "primary",
    shape: "spark",
    heroImage: heroWoman,
    heroAlt: "Девушка с закрытыми глазами на солнце",
    heroCaption: ["Больше энергии", "для важных вещей"],
    heroTitle: "Чекап по энергии",
    heroSubtitle: SUBTITLE,
    lead: "Чекап для тех, кто просыпается уставшим. Семь анализов, которые чаще всего объясняют нехватку энергии.",
    cardText: "ОАК + СОЭ, ферритин, витамин D, B12, ТТГ, глюкоза, HbA1c",
    includedNote: "Семь ключевых показателей, с которых начинается разбор причин усталости.",
    seoTitle: "ReAge Энергия — чекап при усталости: 7 показателей на энергию",
    seoDescription:
      "Чекап ReAge Энергия: ОАК + СОЭ + лейкоцитарная формула, ферритин, витамин D, витамин B12, ТТГ, глюкоза и HbA1c за 5 990 ₽. Анализы в LabQuest, результаты с разбором в ReAge за 1–2 дня.",
    markers: [
      {
        title: "ОАК + СОЭ + лейкоцитарная формула",
        description: "воспаление и риск анемии",
        icon: Droplet,
      },
      { title: "Ферритин", description: "запасы железа в тканях", icon: Battery },
      { title: "Витамин D, 25-OH", description: "иммунитет и тонус", icon: Sun },
      { title: "Витамин B12", description: "нервная система и энергия клеток", icon: Bolt },
      { title: "ТТГ", description: "работа щитовидной железы", icon: Activity },
      { title: "Глюкоза", description: "уровень сахара сейчас", icon: Sparkles },
      { title: "HbA1c", description: "средний сахар за три месяца", icon: Gauge },
    ],
  },
  {
    slug: "thyroid",
    bundle: "thyroid",
    href: "/checkup/thyroid",
    name: "ReAge Щитовидная железа",
    tag: "Щитовидная железа",
    price: 3990,
    accent: "info",
    shape: "diamond",
    heroImage: heroThyroid,
    heroAlt: "Женщина у окна в тёплом свете",
    heroCaption: ["Спокойный обмен", "и ровное состояние"],
    heroTitle: "Чекап щитовидной железы",
    heroSubtitle: SUBTITLE,
    lead: "Для тех, у кого зябкость, отёчность, сухая кожа, скачки веса или тревожность без причины. Проверяем работу щитовидной железы и аутоиммунный фон.",
    cardText: "ТТГ, Т4 свободный, антитела к тиреопероксидазе",
    includedNote: "Базовая тройка, по которой оценивают функцию щитовидной железы.",
    seoTitle: "ReAge Щитовидная железа — чекап щитовидной железы: ТТГ, Т4, АТ-ТПО",
    seoDescription:
      "Чекап ReAge Щитовидная железа за 3 990 ₽: ТТГ, Т4 свободный и антитела к тиреопероксидазе. Анализы в LabQuest, понятная расшифровка с рекомендациями в ReAge за 1–2 дня.",
    markers: [
      { title: "ТТГ", description: "главный маркер работы железы", icon: Activity },
      { title: "Т4 свободный", description: "активный гормон в крови", icon: Bolt },
      {
        title: "Антитела к тиреопероксидазе (АТ-ТПО)",
        description: "аутоиммунное воспаление железы",
        icon: Shield,
      },
    ],
  },
  {
    slug: "iron",
    bundle: "iron",
    href: "/checkup/iron",
    name: "ReAge Железо",
    tag: "Железодефицит",
    price: 5990,
    accent: "accent",
    shape: "circle",
    heroImage: heroIron,
    heroAlt: "Девушка с чашкой у окна",
    heroCaption: ["Силы и тепло", "каждый день"],
    heroTitle: "Чекап на железодефицит",
    heroSubtitle: SUBTITLE,
    lead: "Для тех, кто быстро устаёт, мёрзнет, теряет волосы или замечает бледность. Полный обмен железа, а не один ферритин.",
    cardText: "ОАК, ферритин, железо, трансферрин, ОЖСС, насыщение",
    includedNote: "Шесть показателей: и запасы железа, и его транспорт в крови.",
    seoTitle: "ReAge Железо — чекап на железодефицит: ферритин и обмен железа",
    seoDescription:
      "Чекап ReAge Железо за 5 990 ₽: общий анализ крови, ферритин, железо сывороточное, трансферрин, ОЖСС и коэффициент насыщения. Анализы в LabQuest, разбор в ReAge за 1–2 дня.",
    markers: [
      { title: "Общий анализ крови", description: "гемоглобин и эритроциты", icon: Droplet },
      { title: "Ферритин", description: "запасы железа в тканях", icon: Battery },
      { title: "Железо сывороточное", description: "железо в крови сейчас", icon: Bolt },
      { title: "Трансферрин", description: "белок-перевозчик железа", icon: Waves },
      { title: "ОЖСС", description: "общая способность связывать железо", icon: Gauge },
      {
        title: "Коэффициент насыщения трансферрина",
        description: "насколько загружен транспорт",
        icon: Scale,
      },
    ],
  },
  {
    slug: "cardio-risk",
    bundle: "cardio-risk",
    href: "/checkup/cardio-risk",
    name: "ReAge Сердце и сосуды",
    tag: "Сердце и сосуды",
    price: 7990,
    accent: "primary",
    shape: "wave",
    heroImage: heroCardio,
    heroAlt: "Мужчина на утренней прогулке",
    heroCaption: ["Сердце в ресурсе", "на годы вперёд"],
    heroTitle: "Чекап сердца и сосудов",
    heroSubtitle: SUBTITLE,
    lead: "Для тех, кому важно узнать про атеросклероз заранее. Липиды, воспаление, наследственный риск и работа почек в одном наборе.",
    cardText: "Липиды, воспаление, риск атеросклероза, ApoB",
    includedNote: "Двенадцать показателей — полная картина сердечно-сосудистого риска.",
    seoTitle: "ReAge Сердце и сосуды — чекап сердца и сосудов, ApoB и Lp(a)",
    seoDescription:
      "Чекап ReAge Сердце и сосуды за 7 990 ₽: липидный профиль, non-HDL, Lp(a), ApoB, hs-CRP, глюкоза, HbA1c, креатинин и eGFR. Анализы в LabQuest, разбор в ReAge за 1–2 дня.",
    markers: [
      { title: "Холестерин общий", description: "базовый липидный показатель", icon: HeartPulse },
      { title: "ЛПНП", description: "«плохой» холестерин", icon: Droplet },
      { title: "ЛПВП", description: "защитная фракция", icon: Shield },
      { title: "Триглицериды", description: "жиры крови и питание", icon: Leaf },
      { title: "non-HDL", description: "суммарный атерогенный холестерин", icon: Scale },
      { title: "Липопротеин(a) — Lp(a)", description: "наследственный риск", icon: Sparkles },
      { title: "hs-CRP", description: "скрытое воспаление сосудов", icon: Activity },
      { title: "Глюкоза", description: "уровень сахара сейчас", icon: Sparkles },
      { title: "HbA1c", description: "средний сахар за три месяца", icon: Gauge },
      { title: "Креатинин", description: "нагрузка на почки", icon: Beaker },
      { title: "eGFR", description: "скорость фильтрации почек", icon: Waves },
      { title: "ApoB", description: "точный счёт атерогенных частиц", icon: Bolt },
    ],
  },
  {
    slug: "metabolic",
    bundle: "metabolic",
    href: "/checkup/metabolic",
    name: "ReAge Метаболизм",
    tag: "Метаболизм",
    price: 6990,
    accent: "info",
    shape: "square",
    heroImage: heroMetabolic,
    heroAlt: "Женщина готовит лёгкий завтрак",
    heroCaption: ["Ровная энергия", "без скачков сахара"],
    heroTitle: "Чекап обмена веществ",
    heroSubtitle: SUBTITLE,
    lead: "Для тех, у кого вес растёт, тянет на сладкое и падает энергия после еды. Сахар, инсулин, печень и почки вместе.",
    cardText: "Сахар, инсулин, печень и вес",
    includedNote: "Одиннадцать показателей, включая расчётный индекс HOMA-IR.",
    seoTitle: "ReAge Метаболизм — чекап обмена веществ: инсулин и HOMA-IR",
    seoDescription:
      "Чекап ReAge Метаболизм за 6 990 ₽: глюкоза, HbA1c, инсулин, HOMA-IR, триглицериды, ЛПВП, АЛТ, АСТ, ГГТ, креатинин и eGFR. Анализы в LabQuest, разбор в ReAge за 1–2 дня.",
    markers: [
      { title: "Глюкоза", description: "уровень сахара сейчас", icon: Sparkles },
      { title: "HbA1c", description: "средний сахар за три месяца", icon: Gauge },
      { title: "Триглицериды", description: "жиры крови и питание", icon: Leaf },
      { title: "ЛПВП", description: "защитная фракция холестерина", icon: Shield },
      { title: "АЛТ", description: "состояние клеток печени", icon: FlaskConical },
      { title: "АСТ", description: "печень и мышцы", icon: Beaker },
      { title: "ГГТ", description: "желчный отток и нагрузка", icon: Droplet },
      { title: "Креатинин", description: "нагрузка на почки", icon: Waves },
      { title: "eGFR", description: "скорость фильтрации почек", icon: Activity },
      { title: "Инсулин", description: "как организм справляется с сахаром", icon: Bolt },
      { title: "HOMA-IR — расчётный", description: "расчётный показатель по глюкозе и инсулину", icon: Scale },
    ],
  },
  {
    slug: "liver",
    bundle: "liver",
    href: "/checkup/liver",
    name: "ReAge Печень",
    tag: "Печень",
    price: 4990,
    accent: "accent",
    shape: "triangle",
    heroImage: heroLiver,
    heroAlt: "Мужчина отдыхает на диване у окна",
    heroCaption: ["Лёгкость", "и чистый обмен"],
    heroTitle: "Чекап печени",
    heroSubtitle: SUBTITLE,
    lead: "Для тех, у кого тяжесть в правом боку, лишний вес или изменения в прошлых анализах. Оцениваем работу печени и риск фиброза.",
    cardText: "Ферменты печени, альбумин, FIB-4",
    includedNote: "Восемь показателей, включая расчётный индекс фиброза FIB-4.",
    seoTitle: "ReAge Печень — чекап печени: АЛТ, АСТ, ГГТ и FIB-4",
    seoDescription:
      "Чекап ReAge Печень за 4 990 ₽: АЛТ, АСТ, ГГТ, щелочная фосфатаза, билирубин, альбумин, ОАК с тромбоцитами и расчётный FIB-4. Анализы в LabQuest, разбор в ReAge.",
    markers: [
      { title: "АЛТ", description: "состояние клеток печени", icon: FlaskConical },
      { title: "АСТ", description: "печень и мышцы", icon: Beaker },
      { title: "ГГТ", description: "желчный отток и нагрузка", icon: Droplet },
      { title: "Щелочная фосфатаза", description: "желчевыводящие пути", icon: Waves },
      { title: "Билирубин общий", description: "переработка гемоглобина", icon: Sun },
      { title: "Альбумин", description: "белковый резерв печени", icon: Shield },
      {
        title: "Общий анализ крови с тромбоцитами",
        description: "нужен для расчёта фиброза",
        icon: Activity,
      },
      { title: "FIB-4 — расчётный", description: "риск фиброза печени", icon: Scale },
    ],
  },
  {
    slug: "kidney",
    bundle: "kidney",
    href: "/checkup/kidney",
    name: "ReAge Почки",
    tag: "Почки",
    price: 4990,
    accent: "primary",
    shape: "ring",
    heroImage: heroKidney,
    heroAlt: "Женщина пьёт воду у окна",
    heroCaption: ["Тихая работа почек", "под контролем"],
    heroTitle: "Чекап почек",
    heroSubtitle: SUBTITLE,
    lead: "Для тех, у кого давление, диабет или отёки по утрам. Почки долго молчат — эти четыре показателя показывают проблему рано.",
    cardText: "Креатинин, eGFR, общий анализ мочи, ACR",
    includedNote: "Четыре показателя — базовая проверка функции почек.",
    seoTitle: "ReAge Почки — чекап почек: креатинин, eGFR и ACR",
    seoDescription:
      "Чекап ReAge Почки за 4 990 ₽: креатинин, eGFR, общий анализ мочи и соотношение альбумин/креатинин (ACR). Анализы в LabQuest, понятная расшифровка в ReAge.",
    markers: [
      { title: "Креатинин", description: "нагрузка на почки", icon: Beaker },
      { title: "eGFR", description: "скорость фильтрации почек", icon: Waves },
      { title: "Общий анализ мочи", description: "воспаление и белок в моче", icon: Droplet },
      {
        title: "Альбумин/креатинин мочи (ACR)",
        description: "ранний признак повреждения",
        icon: Gauge,
      },
    ],
  },
  {
    slug: "base",
    bundle: "base",
    href: "/checkup/base",
    name: "ReAge Базовый",
    tag: "Базовый чекап",
    price: 7990,
    accent: "info",
    shape: "plus",
    heroImage: heroBase40,
    heroAlt: "Пара средних лет в светлом интерьере",
    heroCaption: ["Полная картина", "здоровья за один визит"],
    heroTitle: "Базовый чекап",
    heroSubtitle: SUBTITLE,
    lead: "Для ежегодной проверки, когда жалоб нет. Кровь, сахар, липиды, печень, почки и щитовидная железа за один визит.",
    cardText: "Базовая панель здоровья",
    includedNote: "Тринадцать показателей — годовой минимум для взрослого человека.",
    seoTitle: "ReAge Базовый — базовый ежегодный чекап",
    seoDescription:
      "Чекап ReAge Базовый за 7 990 ₽: ОАК, глюкоза, HbA1c, липидный профиль, АЛТ, АСТ, ГГТ, креатинин, eGFR и ТТГ. Анализы в LabQuest, понятная расшифровка в ReAge за 1–2 дня.",
    markers: [
      { title: "Общий анализ крови", description: "базовая картина крови", icon: Droplet },
      { title: "Глюкоза", description: "уровень сахара сейчас", icon: Sparkles },
      { title: "HbA1c", description: "средний сахар за три месяца", icon: Gauge },
      { title: "Холестерин общий", description: "базовый липидный показатель", icon: HeartPulse },
      { title: "ЛПНП", description: "«плохой» холестерин", icon: Scale },
      { title: "ЛПВП", description: "защитная фракция", icon: Shield },
      { title: "Триглицериды", description: "жиры крови и питание", icon: Leaf },
      { title: "АЛТ", description: "состояние клеток печени", icon: FlaskConical },
      { title: "АСТ", description: "печень и мышцы", icon: Beaker },
      { title: "ГГТ", description: "желчный отток и нагрузка", icon: Bolt },
      { title: "Креатинин", description: "нагрузка на почки", icon: Waves },
      { title: "eGFR", description: "скорость фильтрации почек", icon: Activity },
      { title: "ТТГ", description: "работа щитовидной железы", icon: Sun },
    ],
  },
  {
    slug: "vitamins",
    bundle: "vitamins",
    href: "/checkup/vitamins",
    name: "ReAge Витамины и минералы",
    tag: "Витамины и минералы",
    price: 5990,
    accent: "accent",
    shape: "spark",
    heroImage: heroVitamins,
    heroAlt: "Женщина со стаканом воды на светлой кухне",
    heroCaption: ["Базовые запасы", "витаминов и минералов"],
    heroTitle: "Чекап витаминов и минералов",
    heroSubtitle: SUBTITLE,
    lead: "Оценка ключевых показателей витаминно-минерального статуса.",
    cardText: "7 ключевых показателей витаминно-минерального статуса.",
    includedNote: "Семь показателей: железо, витамины группы B, витамин D и микроэлементы.",
    seoTitle: "ReAge Витамины и минералы — чекап витаминов, железа и микроэлементов",
    seoDescription:
      "Чекап ReAge Витамины и минералы за 5 990 ₽: витамин D, B12, фолиевая кислота, магний, цинк, железо сывороточное и ферритин. Анализы в LabQuest, разбор в ReAge за 1–2 дня.",
    markers: [
      { title: "Витамин D, 25-OH", description: "иммунитет и тонус", icon: Sun },
      { title: "Витамин B12", description: "нервная система и энергия клеток", icon: Bolt },
      { title: "Фолиевая кислота (B9)", description: "обновление клеток крови", icon: Leaf },
      { title: "Магний", description: "мышцы, сон и нервная система", icon: Waves },
      { title: "Цинк", description: "иммунитет, кожа и волосы", icon: Shield },
      { title: "Железо сывороточное", description: "железо в крови сейчас", icon: Beaker },
      { title: "Ферритин", description: "запасы железа в тканях", icon: Battery },
    ],
  },
  {
    slug: "female-hormones",
    bundle: "female-hormones",
    href: "/checkup/female-hormones",
    name: "ReAge Женские гормоны",
    tag: "Женские гормоны",
    price: 3990,
    accent: "info",
    shape: "circle",
    heroImage: heroFemaleHormones,
    heroAlt: "Спокойная женщина у окна в светлом интерьере",
    heroCaption: ["Понятная картина", "гормонального фона"],
    heroTitle: "Чекап женских гормонов",
    heroSubtitle: SUBTITLE,
    lead: "Базовый гормональный профиль для женщин. Позволяет оценить основные гормоны, связанные с работой репродуктивной системы и менструальным циклом. При интерпретации ReAge учитывает день цикла и дополнительный контекст.",
    cardText: "Основные показатели женского гормонального профиля.",
    includedNote: "Пять показателей — базовый гормональный профиль.",
    seoTitle: "ReAge Женские гормоны — базовый гормональный чекап для женщин",
    seoDescription:
      "Чекап ReAge Женские гормоны за 3 990 ₽: ЛГ, ФСГ, эстрадиол, пролактин и ТТГ. Анализы в LabQuest, расшифровка ReAge с учётом дня цикла за 1–2 дня.",
    prepNotes: [
      "укажите день менструального цикла — он важен для расшифровки",
      "сообщите, принимаете ли гормональные препараты или контрацептивы",
    ],
    markers: [
      {
        title: "Лютеинизирующий гормон (ЛГ)",
        description: "регуляция овуляции",
        icon: Activity,
      },
      {
        title: "Фолликулостимулирующий гормон (ФСГ)",
        description: "работа яичников",
        icon: Gauge,
      },
      { title: "Эстрадиол", description: "основной женский гормон", icon: Sparkles },
      { title: "Пролактин", description: "влияет на цикл и самочувствие", icon: Droplet },
      { title: "ТТГ", description: "работа щитовидной железы", icon: Activity },
    ],
  },
  {
    slug: "male-hormones",
    bundle: "male-hormones",
    href: "/checkup/male-hormones",
    name: "ReAge Мужские гормоны",
    tag: "Мужские гормоны",
    price: 4490,
    accent: "primary",
    shape: "triangle",
    heroImage: heroMaleHormones,
    heroAlt: "Мужчина у окна в светлом интерьере",
    heroCaption: ["Тестостерон", "в общей картине"],
    heroTitle: "Чекап мужских гормонов",
    heroSubtitle: SUBTITLE,
    lead: "Комплекс основных показателей мужского гормонального профиля. Позволяет оценить уровень тестостерона и связанные с ним гормональные показатели в единой картине.",
    cardText: "Тестостерон и основные показатели мужского гормонального профиля.",
    includedNote: "Семь позиций, включая расчёт свободного тестостерона.",
    seoTitle: "ReAge Мужские гормоны — чекап тестостерона и мужского профиля",
    seoDescription:
      "Чекап ReAge Мужские гормоны за 4 490 ₽: тестостерон общий, ГСПГ, ЛГ, ФСГ, пролактин, альбумин и расчёт свободного тестостерона. Анализы в LabQuest, разбор в ReAge.",
    prepNotes: [
      "сдавайте утром — уровень тестостерона меняется в течение дня",
      "уточните требования лаборатории перед визитом",
    ],
    markers: [
      { title: "Тестостерон общий", description: "основной мужской гормон", icon: Bolt },
      { title: "ГСПГ", description: "белок, связывающий тестостерон", icon: Shield },
      {
        title: "Лютеинизирующий гормон (ЛГ)",
        description: "сигнал для выработки тестостерона",
        icon: Activity,
      },
      {
        title: "Фолликулостимулирующий гормон (ФСГ)",
        description: "работа половых желёз",
        icon: Gauge,
      },
      { title: "Пролактин", description: "влияет на гормональный баланс", icon: Droplet },
      { title: "Альбумин", description: "нужен для расчёта свободного тестостерона", icon: Beaker },
      {
        title: "Свободный тестостерон — расчётный",
        description: "по общему тестостерону, ГСПГ и альбумину",
        icon: Scale,
      },
    ],
  },
  {
    slug: "hair",
    bundle: "hair",
    href: "/checkup/hair",
    name: "ReAge Волосы",
    tag: "Волосы",
    price: 5990,
    accent: "accent",
    shape: "wave",
    heroImage: heroHair,
    heroAlt: "Женщина поправляет здоровые волосы у окна",
    heroCaption: ["Причины выпадения", "видно в анализах"],
    heroTitle: "Чекап при выпадении волос",
    heroSubtitle: SUBTITLE,
    lead: "Лабораторная оценка ключевых показателей, которые могут быть значимы при выпадении волос.",
    cardText: "Ключевые показатели, которые стоит оценить при выпадении волос.",
    includedNote: "Восемь показателей: железо, щитовидная железа, витамины и цинк.",
    seoTitle: "ReAge Волосы — чекап при выпадении волос: ферритин, ТТГ, витамины",
    seoDescription:
      "Чекап ReAge Волосы за 5 990 ₽: общий анализ крови, ферритин, ТТГ, Т4 свободный, витамин D, B12, фолиевая кислота и цинк. Анализы в LabQuest, разбор в ReAge за 1–2 дня.",
    markers: [
      { title: "Общий анализ крови", description: "базовая картина крови", icon: Droplet },
      { title: "Ферритин", description: "запасы железа в тканях", icon: Battery },
      { title: "ТТГ", description: "работа щитовидной железы", icon: Activity },
      { title: "Т4 свободный", description: "активный гормон щитовидной железы", icon: Bolt },
      { title: "Витамин D, 25-OH", description: "иммунитет и тонус", icon: Sun },
      { title: "Витамин B12", description: "нервная система и энергия клеток", icon: FlaskConical },
      { title: "Фолиевая кислота (B9)", description: "обновление клеток", icon: Leaf },
      { title: "Цинк", description: "рост волос и состояние кожи", icon: Shield },
    ],
  },
];

export const ENERGY_CHECKUP = CHECKUPS[0];

export function getCheckupBySlug(slug: string | undefined): Checkup | undefined {
  return CHECKUPS.find((c) => c.slug === slug);
}

export const money = (value: number) => `${value.toLocaleString("ru-RU")} ₽`;

/** Русское склонение: 1 показатель / 2 показателя / 5 показателей. */
export function markersLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} показатель`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} показателя`;
  return `${count} показателей`;
}
