UPDATE recommendations
SET text = regexp_replace(text, E'\\n- \\*\\*ВАЖНО:\\*\\*[^\\n]*', '', 'g')
WHERE type = 'Данные пациента' AND text LIKE '%- **ВАЖНО:**%';