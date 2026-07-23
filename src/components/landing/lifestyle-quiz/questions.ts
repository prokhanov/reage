import type { DomainKey } from "./types";

export interface QuestionOption {
  label: string;
  score: 0 | 1 | 2;
}

export interface Question {
  id: string; // q1..q18
  domain: DomainKey;
  text: string;
  options: [QuestionOption, QuestionOption, QuestionOption];
  /** Short verbatim used for "что отметил" in results (based on top score). */
  observationOnMax: string;
}

export const DOMAIN_LABELS: Record<DomainKey, string> = {
  nutrition: "Питание и метаболизм",
  sleep: "Сон и восстановление",
  movement: "Движение и физическая форма",
  stress: "Стресс и энергия",
  habits: "Привычки",
  body: "Тело и самочувствие",
};

/** Priority for tie-breaking (согласовано): Сон > Стресс > Питание > Тело > Движение > Привычки */
export const DOMAIN_PRIORITY: DomainKey[] = [
  "sleep",
  "stress",
  "nutrition",
  "body",
  "movement",
  "habits",
];

export const QUESTIONS: Question[] = [
  // Nutrition
  {
    id: "q1",
    domain: "nutrition",
    text: "Как часто в вашем рационе есть овощи, фрукты или ягоды (~400–500 г в день)?",
    options: [
      { label: "Ежедневно", score: 0 },
      { label: "Через день", score: 1 },
      { label: "Реже / не слежу", score: 2 },
    ],
    observationOnMax: "мало овощей и фруктов в рационе",
  },
  {
    id: "q2",
    domain: "nutrition",
    text: "Как часто в рационе присутствуют переработанные продукты (колбасы, фастфуд, полуфабрикаты)?",
    options: [
      { label: "Редко или никогда", score: 0 },
      { label: "Несколько раз в неделю", score: 1 },
      { label: "Почти каждый день", score: 2 },
    ],
    observationOnMax: "много переработанной еды",
  },
  {
    id: "q3",
    domain: "nutrition",
    text: "Замечаете ли выраженную тягу к сладкому или мучному в течение дня?",
    options: [
      { label: "Нет", score: 0 },
      { label: "Иногда", score: 1 },
      { label: "Регулярно, сложно контролировать", score: 2 },
    ],
    observationOnMax: "регулярная тяга к сладкому",
  },
  // Sleep
  {
    id: "q4",
    domain: "sleep",
    text: "Сколько часов сна у вас выходит в среднем за ночь?",
    options: [
      { label: "7–9 часов", score: 0 },
      { label: "6–7 или больше 9 часов", score: 1 },
      { label: "Меньше 6 часов", score: 2 },
    ],
    observationOnMax: "хронический недосып",
  },
  {
    id: "q5",
    domain: "sleep",
    text: "Просыпаетесь ли утром отдохнувшим(ей) после ночи сна?",
    options: [
      { label: "Почти всегда", score: 0 },
      { label: "Иногда", score: 1 },
      { label: "Редко", score: 2 },
    ],
    observationOnMax: "сон не восстанавливает",
  },
  {
    id: "q6",
    domain: "sleep",
    text: "Бывают ли эпизоды дневной сонливости, мешающие концентрации?",
    options: [
      { label: "Нет", score: 0 },
      { label: "Иногда", score: 1 },
      { label: "Регулярно", score: 2 },
    ],
    observationOnMax: "регулярная дневная сонливость",
  },
  // Movement
  {
    id: "q7",
    domain: "movement",
    text: "Сколько дней в неделю уделяете 30+ минут ходьбе или другой активности?",
    options: [
      { label: "5+ дней", score: 0 },
      { label: "2–4 дня", score: 1 },
      { label: "0–1 день", score: 2 },
    ],
    observationOnMax: "низкая повседневная активность",
  },
  {
    id: "q8",
    domain: "movement",
    text: "Занимаетесь ли силовыми или кардио тренировками целенаправленно?",
    options: [
      { label: "2–3 раза в неделю", score: 0 },
      { label: "2–3 раза в месяц", score: 1 },
      { label: "Практически не занимаюсь", score: 2 },
    ],
    observationOnMax: "нет регулярных тренировок",
  },
  {
    id: "q9",
    domain: "movement",
    text: "Одышка или упадок сил при обычных нагрузках (лестница, быстрый шаг)?",
    options: [
      { label: "Нет", score: 0 },
      { label: "Иногда", score: 1 },
      { label: "Регулярно", score: 2 },
    ],
    observationOnMax: "одышка при обычных нагрузках",
  },
  // Stress
  {
    id: "q10",
    domain: "stress",
    text: "Как вы оцениваете уровень стресса в повседневной жизни?",
    options: [
      { label: "Низкий, управляемый", score: 0 },
      { label: "Средний", score: 1 },
      { label: "Высокий, ощущаю почти постоянно", score: 2 },
    ],
    observationOnMax: "высокий уровень стресса",
  },
  {
    id: "q11",
    domain: "stress",
    text: "Бывают ли периоды, когда энергии не хватает даже на привычные дела?",
    options: [
      { label: "Нет", score: 0 },
      { label: "Иногда", score: 1 },
      { label: "Регулярно", score: 2 },
    ],
    observationOnMax: "регулярная нехватка энергии",
  },
  {
    id: "q12",
    domain: "stress", // усилитель домена stress
    text: "Как часто находите время на то, что восстанавливает (хобби, отдых, общение без экрана)?",
    options: [
      { label: "Регулярно", score: 0 },
      { label: "От случая к случаю", score: 1 },
      { label: "Почти никогда", score: 2 },
    ],
    observationOnMax: "почти нет времени на восстановление",
  },
  // Habits
  {
    id: "q13",
    domain: "habits",
    text: "Курите ли вы?",
    options: [
      { label: "Нет / бросил более 5 лет назад", score: 0 },
      { label: "Бросил недавно", score: 1 },
      { label: "Да", score: 2 },
    ],
    observationOnMax: "курение",
  },
  {
    id: "q14",
    domain: "habits",
    text: "Как часто употребляете алкоголь?",
    options: [
      { label: "Никогда или редко", score: 0 },
      { label: "2–4 раза в месяц", score: 1 },
      { label: "Несколько раз в неделю и чаще", score: 2 },
    ],
    observationOnMax: "частое употребление алкоголя",
  },
  {
    id: "q15",
    domain: "habits",
    text: "Есть ли привычка досаливать еду, не пробуя?",
    options: [
      { label: "Нет", score: 0 },
      { label: "Иногда", score: 1 },
      { label: "Да, обычно", score: 2 },
    ],
    observationOnMax: "привычка досаливать еду",
  },
  // Body
  {
    id: "q16",
    domain: "body",
    text: "Заметные изменения веса за последние полгода без диеты или тренировок?",
    options: [
      { label: "Нет", score: 0 },
      { label: "Небольшие", score: 1 },
      { label: "Заметные", score: 2 },
    ],
    observationOnMax: "необъяснимые колебания веса",
  },
  {
    id: "q17",
    domain: "body", // амплификатор общего tier
    text: "Как часто делали лабораторные анализы (базовые биомаркеры) за последний год?",
    options: [
      { label: "В рамках регулярного чекапа", score: 0 },
      { label: "Один раз, по случаю", score: 1 },
      { label: "Не делал давно / никогда", score: 2 },
    ],
    observationOnMax: "давно не проверяли базовые анализы",
  },
  {
    id: "q18",
    domain: "body", // усилитель домена с максимальным баллом
    text: "Как в целом оцениваете самочувствие последние несколько месяцев?",
    options: [
      { label: "Стабильно хорошее", score: 0 },
      { label: "Есть периоды спада", score: 1 },
      { label: "Часто чувствую себя не на пике", score: 2 },
    ],
    observationOnMax: "нестабильное самочувствие",
  },
];

export const QUESTIONS_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);

/** Groups for step screens: 6 domain screens, 3 questions each. */
export const DOMAIN_ORDER: DomainKey[] = [
  "nutrition",
  "sleep",
  "movement",
  "stress",
  "habits",
  "body",
];
