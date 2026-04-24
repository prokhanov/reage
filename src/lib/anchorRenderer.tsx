/**
 * anchorRenderer.tsx — DEPRECATED shim.
 *
 * Этот модуль раньше парсил HTML-якоря (`<!-- anchor:biomarker CODE -->`)
 * и интерливил markdown с карточками биомаркеров.
 *
 * Production-путь полностью перешёл на ReportSnapshot + snapshotRenderer
 * (UUID-binding, JSON-only). Якоря больше не используются.
 *
 * Здесь оставлен минимальный shim, чтобы admin-страница ReportVisualsTest
 * (использующаяся для теста промптов) продолжала компилироваться. Карточки
 * биомаркеров в shim не рисуются — выводится только markdown.
 */
import React from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { parseMarkdownToPdfContent, PdfBiomarkerData } from "@/lib/pdfExportHelpers";

export function renderInterleavedWeb(
  text: string,
  _biomarkers: PdfBiomarkerData[],
  _age: number,
  _gender: "male" | "female",
): React.ReactNode {
  return <MarkdownContent content={text || ""} />;
}

export function buildInterleavedPdf(
  text: string,
  _biomarkers: PdfBiomarkerData[],
  _barWidth: number,
  _barHeight: number,
  _age: number,
  _gender: "male" | "female",
): any[] {
  return parseMarkdownToPdfContent(text || "");
}
