---
name: Darbinyan deep report QA default
description: Default QA/debug target is Darbinyan report generated with deep mode unless user says otherwise.
type: preference
---
All tests, fixes, report generation checks, and report visibility checks should use the Darbinyan report by default.
Default analysis mode for report QA/debugging is deep mode.
This rule applies until the user explicitly says otherwise.
If context is ambiguous, it is acceptable to ask which report or whether deep/standard mode should be checked, but default to Darbinyan + deep.
