import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConsultationCtaBlock } from "./ConsultationCtaBlock";

const invokeMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

describe("ConsultationCtaBlock", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("shows validation errors when name and email are empty", async () => {
    render(<ConsultationCtaBlock />);
    fireEvent.click(screen.getByRole("button", { name: /отправить/i }));

    expect(await screen.findByText("Укажите имя")).toBeInTheDocument();
    expect(screen.getByText("Укажите email")).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("shows email format error", async () => {
    render(<ConsultationCtaBlock />);
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /отправить/i }));

    expect(await screen.findByText("Некорректный email")).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("submits successfully without a phone (phone is optional)", async () => {
    render(<ConsultationCtaBlock />);
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ivan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /отправить/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    const [fnName, opts] = invokeMock.mock.calls[0];
    expect(fnName).toBe("send-feedback");
    expect(opts.body.type).toBe("consultation");
    expect(opts.body.name).toBe("Иван");
    expect(opts.body.email).toBe("ivan@example.com");
    expect(opts.body.phone).toBe("");

    expect(await screen.findByText("Заявка принята")).toBeInTheDocument();
  });

  it("does not show a phone error even when the phone is in a weird format", async () => {
    render(<ConsultationCtaBlock />);
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ivan@example.com" } });
    // "abc" — PhoneInput strips non-digits, so raw junk should never surface as an error
    fireEvent.change(screen.getByLabelText("Телефон"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /отправить/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    // No validation message related to phone anywhere on the form
    expect(screen.queryByText(/телефон/i)).not.toHaveTextContent(/некоррект|ошиб|неверн/i);
  });

  it("shows error state when the edge function fails", async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error("boom") });

    render(<ConsultationCtaBlock />);
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ivan@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /отправить/i }));

    expect(await screen.findByText(/не удалось отправить заявку/i)).toBeInTheDocument();
  });
});
