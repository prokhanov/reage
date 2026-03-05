

## Plan: Add visible 🟠 Риск block to Edit Biomarker Dialog

The dialog currently shows 3 sections: 🟢 Оптимальные, 🟡 Нормальные, 🔴 Критические. The user wants all 4 tiers visually present. The 🟠 Риск zone is auto-derived (between normal and critical), so it needs a visual indicator block, not input fields.

### File: `src/pages/admin/DataManagement.tsx`

Between the 🟡 Нормальные section (ends line 1303) and 🔴 Критические section (starts line 1305), insert a non-editable visual block:

```
🟠 Зона риска (определяется автоматически)
Значения за пределами нормы, но в рамках критических порогов → статус «Риск»
```

Styled with `border-dashed border-status-risk/40 bg-status-risk/5` and `text-status-risk` to visually distinguish it as a derived (non-editable) tier.

Result: dialog shows all 4 levels top-to-bottom:
1. 🟢 Оптимальные (editable)
2. 🟡 Нормальные (editable)
3. 🟠 Риск (visual indicator)
4. 🔴 Критические (editable)

