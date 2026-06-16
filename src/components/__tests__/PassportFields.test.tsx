import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PassportFields,
  isPassportValid,
  PASSPORT_SERIES_LENGTH,
  PASSPORT_NUMBER_LENGTH,
} from "../PassportFields";

describe("isPassportValid", () => {
  it("rejects empty / null / undefined", () => {
    expect(isPassportValid("", "")).toBe(false);
    expect(isPassportValid(null, null)).toBe(false);
    expect(isPassportValid(undefined, undefined)).toBe(false);
    expect(isPassportValid("1234", "")).toBe(false);
    expect(isPassportValid("", "123456")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isPassportValid("123", "123456")).toBe(false);
    expect(isPassportValid("12345", "123456")).toBe(false);
    expect(isPassportValid("1234", "12345")).toBe(false);
    expect(isPassportValid("1234", "1234567")).toBe(false);
  });

  it("rejects when non-digit chars reduce digit count below required", () => {
    expect(isPassportValid("12ab", "123456")).toBe(false);
    expect(isPassportValid("1234", "12 456")).toBe(false);
  });

  it("accepts canonical 4 / 6 digit values", () => {
    expect(isPassportValid("1234", "567890")).toBe(true);
  });

  it("constants match Russian passport format", () => {
    expect(PASSPORT_SERIES_LENGTH).toBe(4);
    expect(PASSPORT_NUMBER_LENGTH).toBe(6);
  });
});

describe("PassportFields component", () => {
  it("strips non-digit characters and enforces max length", () => {
    const onSeriesChange = vi.fn();
    const onNumberChange = vi.fn();

    render(
      <PassportFields
        series=""
        number=""
        onSeriesChange={onSeriesChange}
        onNumberChange={onNumberChange}
      />
    );

    const seriesInput = screen.getByPlaceholderText("Серия") as HTMLInputElement;
    const numberInput = screen.getByPlaceholderText("Номер") as HTMLInputElement;

    fireEvent.change(seriesInput, { target: { value: "12a3b4c5d6" } });
    expect(onSeriesChange).toHaveBeenLastCalledWith("1234");

    fireEvent.change(numberInput, { target: { value: "98 76-54-3210" } });
    expect(onNumberChange).toHaveBeenLastCalledWith("987654");
  });

  it("renders the explanatory hint and label", () => {
    render(
      <PassportFields
        series="1234"
        number="567890"
        onSeriesChange={() => {}}
        onNumberChange={() => {}}
      />
    );
    expect(screen.getByText(/Паспортные данные пациента/i)).toBeInTheDocument();
    expect(screen.getByText(/Сохраняются один раз/i)).toBeInTheDocument();
  });

  it("disables inputs when disabled prop is set", () => {
    render(
      <PassportFields
        series=""
        number=""
        onSeriesChange={() => {}}
        onNumberChange={() => {}}
        disabled
      />
    );
    expect(screen.getByPlaceholderText("Серия")).toBeDisabled();
    expect(screen.getByPlaceholderText("Номер")).toBeDisabled();
  });
});
