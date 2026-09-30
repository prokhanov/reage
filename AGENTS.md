# Project Architecture Rules

- Store report-specific presentation visibility in `analyses.cover_overrides.presentation` so one patient's report can hide standard pages or metric panels without changing other reports.
- Store the report type in `analyses.cover_overrides.report_kind` (`systems` | `whole_body`); whole-body reports are produced by the orchestrator's final `synthesize-whole-body` step, which merges the system sections into one «Организм в целом» section — so the regular per-system pipeline, prescriptions and summary stay shared.
- Preserve the ordinary report's complete per-biomarker narrative contract during whole-body synthesis and reject incomplete synthesis output, so every metric retains its description, patient value, and deviation experience block.
- Checkup markers and variants live in `checkup_markers` / `checkup_variants` (admin «Чекапы → Показатели и варианты»); pages resolve them via `useResolvedCheckups`, the static lists in `src/data` are only a fallback — so counts and composition never need code edits.
- Site support chat lives in `support_conversations`/`support_messages`, accessed only via the `support-chat` function (guest identified by a localStorage token); operator replies arrive via `support-telegram-webhook` from a Telegram forum group (one topic per visitor) — so no Jivo dependency and no anon table access.
