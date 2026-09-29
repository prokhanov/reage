# Project Architecture Rules

- Store report-specific presentation visibility in `analyses.cover_overrides.presentation` so one patient's report can hide standard pages or metric panels without changing other reports.- Store the report type in `analyses.cover_overrides.report_kind` (`systems` | `whole_body`); whole-body reports are produced by the orchestrator's final `synthesize-whole-body` step, which merges the system sections into one «Организм в целом» section — so the regular per-system pipeline, prescriptions and summary stay shared.
