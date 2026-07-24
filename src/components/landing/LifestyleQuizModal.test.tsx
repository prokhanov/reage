import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LifestyleQuizModal } from "./LifestyleQuizModal";
import { DOMAIN_ORDER, QUESTIONS } from "./lifestyle-quiz/questions";

const invokeMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: toastMock,
}));

function renderQuiz() {
  return render(
    <MemoryRouter>
      <LifestyleQuizModal open onOpenChange={vi.fn()} />
    </MemoryRouter>,
  );
}

function clickOptionForQuestion(questionText: string, optionLabel: string) {
  const label = screen.getByText(questionText);
  const field = label.parentElement;
  if (!field) throw new Error(`Question field not found: ${questionText}`);
  fireEvent.click(within(field).getByRole("button", { name: optionLabel }));
}

describe("LifestyleQuizModal metrics", () => {
  beforeEach(() => {
    invokeMock.mockResolvedValue({ data: { ok: true, id: "test-submission" }, error: null });
    toastMock.mockClear();
    window.ym = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("fires Yandex goals on first question, contact screen, and successful submit", async () => {
    renderQuiz();

    fireEvent.click(screen.getByRole("button", { name: "Начать оценку" }));

    expect(window.ym).toHaveBeenCalledWith(109706546, "reachGoal", "1question");

    fireEvent.click(screen.getByRole("button", { name: "Мужской" }));
    fireEvent.click(screen.getByRole("button", { name: "30–39" }));
    fireEvent.change(screen.getByLabelText("Рост"), { target: { value: "180" } });
    fireEvent.change(screen.getByLabelText("Вес"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: /Далее/ }));

    for (const domain of DOMAIN_ORDER) {
      const domainQuestions = QUESTIONS.filter((question) => question.domain === domain);
      await waitFor(() => expect(screen.getByText(domainQuestions[0].text, { exact: false })).toBeInTheDocument());

      domainQuestions.forEach((question, index) => {
        clickOptionForQuestion(`${index + 1}. ${question.text}`, question.options[0].label);
      });
    }

    await waitFor(() => expect(screen.getByText("Результат готов")).toBeInTheDocument());
    expect(window.ym).toHaveBeenCalledWith(109706546, "reachGoal", "quiz_contact_open");

    fireEvent.change(screen.getByPlaceholderText("Ваше имя"), { target: { value: "Тест" } });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "quiz-test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("+7 999 000 00 00"), { target: { value: "+79990000000" } });
    fireEvent.click(screen.getByRole("button", { name: /Показать результат/ }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("submit-lifestyle-quiz", expect.any(Object)));
    await waitFor(() => expect(window.ym).toHaveBeenCalledWith(109706546, "reachGoal", "kviz_form"));
  });
});