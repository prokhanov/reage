Прямая замена изображения в хиро-блоке нового лендинга (`/landing-v2`).

1. **Загрузить новое изображение в Lovable Assets**
   - Источник: `user-uploads://Без_названия_85.png` (843×1264 px, RGBA PNG с прозрачным фоном — те же пропорции, что и текущий `hero-man-v2.png`).
   - Создать указатель `src/assets/landing-v2/hero-couple-v2.png.asset.json` через `lovable-assets create`.
   - Убедиться, что исходный PNG не остаётся в репозитории.

2. **Обновить импорт в компоненте**
   - Файл: `src/components/landing/v2/HeroBlockPortrait.tsx`.
   - Заменить `import heroMan from "@/assets/landing-v2/hero-man-v2.png";` на импорт нового asset-указателя, например `import heroCouple from "@/assets/landing-v2/hero-couple-v2.png.asset.json";`.

3. **Обновить `alt` текста**
   - В `StaticArtboard` изменить `alt` на описание для пары: "Пара изучает персональный отчёт ReAge на смартфоне".

4. **Не трогать раскладку и артборд**
   - Оставить размеры `ARTBOARDS[*].man`, `object-contain`, `objectPosition`, `DEFAULT_LAYOUTS` и стили виджетов без изменений — новое изображение имеет ту же пропорцию 2:3, что и старое, и должно встать без кадрирования и смещений.

5. **Проверить сборку и превью**
   - Убедиться, что `/landing-v2` собирается, новое изображение отображается, и нет ошибок в консоли.