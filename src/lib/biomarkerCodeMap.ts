/**
 * Mapping of short demo biomarker codes to full database codes
 * Used to match demo data codes with actual biomarker metadata
 */
export const DEMO_TO_DB_CODE: Record<string, string> = {
  // Энергия и восстановление
  HB: "Гемоглобин (Hb)",
  HCT: "Гематокрит (HCT)",
  RBC: "Эритроциты (RBC)",
  ESR: "СОЭ",
  FERR: "Ферритин",
  
  // Воспалительная и иммунная система
  CRP: "CRP (hs-CRP)",
  
  // Сердечно-сосудистая система
  CHOL: "Общий холестерин (TC)",
  LDL: "ЛПНП (LDL)",
  HDL: "ЛПВП (HDL)",
  TG: "Триглицериды (TG)",
  
  // Обмен веществ и детоксикация
  GLU: "Глюкоза",
  HBA1C: "HbA1c",
  CREA: "Креатинин",
  ALT: "ALT",
  AST: "AST",
  GGT: "GGT",
  ALP: "ALP",
  BIL: "Билирубин общий",
  
  // Воспалительная и иммунная система (дополнительно)
  WBC: "Лейкоциты (WBC)",
  
  // Эндокринная и стрессовая система
  TEST: "Тестостерон общий",
  ESTR: "Эстрадиол",
  SHBG: "SHBG",
  DHEAS: "DHEA-S",
  VITD: "25-ОН витамин D",
  TSH: "ТТГ",
  FT4: "Т4 свободный (FT4)",
  CORT: "Кортизол",
};
