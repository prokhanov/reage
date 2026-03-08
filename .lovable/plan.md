

# Проблема: веб-отчёт в боевом режиме не показывает шкалы биомаркеров

## Найденный баг

**`Recommendations.tsx`, строка 724:**
```typescript
renderInterleavedWeb(cleanMarkdownArtifacts(rec.text), [], 40, 'male')
```

Биомаркеры передаются как **пустой массив `[]`**, возраст захардкожен `40`, пол `'male'`. 

Данные биомаркеров загружаются **только внутри `handleExportPDF`** (при клике "Скачать PDF"), но **не при открытии диалога** просмотра отчёта. В результате:
- ✅ `<!-- anchor:summary_start -->` — резюме в рамке работает (не зависит от биомаркеров)
- ❌ `<!-- anchor:biomarker CODE -->` — шкалы биомаркеров **не отображаются** (пустой массив)
- ✅ Секции, spacer, pagebreak — работают корректно
- ✅ PDF-экспорт — работает корректно (биомаркеры загружаются перед генерацией PDF)

**Демо-страница (`ReportVisualsTest.tsx`)** — работает правильно, биомаркеры передаются корректно.

## План исправления

### Единственное изменение: `src/pages/Recommendations.tsx`

1. **Добавить state** для биомаркеров, возраста и пола на уровне компонента:
   ```typescript
   const [webBiomarkers, setWebBiomarkers] = useState<PdfBiomarkerData[]>([]);
   const [patientAge, setPatientAge] = useState(40);
   const [patientGender, setPatientGender] = useState<'male' | 'female'>('male');
   ```

2. **Загружать биомаркеры при открытии диалога просмотра** (когда `selectedReport` устанавливается и `viewDialogOpen === true`). Вынести логику загрузки из `handleExportPDF` в отдельную функцию `loadBiomarkersForReport(analysisId)` и вызывать её при открытии диалога.

3. **Передать реальные данные в `renderInterleavedWeb`** на строке 724:
   ```typescript
   const catBio = webBiomarkers.filter(b => b.category === type);
   renderInterleavedWeb(cleanMarkdownArtifacts(rec.text), catBio, patientAge, patientGender)
   ```

4. **Переиспользовать те же данные в `handleExportPDF`** вместо повторной загрузки — использовать `webBiomarkers`, `patientAge`, `patientGender` из state.

Итог: один и тот же набор данных используется и для веб-просмотра, и для PDF-экспорта. Шкалы биомаркеров появятся в веб-отчёте.

