import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { getNormalRangeForAge, AgeRanges } from "@/lib/biomarkerNorms";

interface BodyArea {
  id: string;
  name: string;
  path: string;
  categories: string[];
  color: string;
  issues: string[];
}

interface BodyHeatmapProps {
  biomarkerData: Array<{
    category: string;
    name: string;
    value: number;
    normal_min?: number;
    normal_max?: number;
    normal_min_male?: number;
    normal_max_male?: number;
    normal_min_female?: number;
    normal_max_female?: number;
    age_ranges?: AgeRanges | null;
  }>;
  patientAge?: number | null;
  patientGender?: 'male' | 'female';
}

const BODY_AREAS: Record<string, BodyArea> = {
  brain: {
    id: "brain",
    name: "Мозг и нервная система",
    path: "M85,25 Q100,15 115,25 L115,45 Q100,50 85,45 Z",
    categories: ["Гормоны", "Витамины"],
    color: "hsl(var(--primary))",
    issues: []
  },
  thyroid: {
    id: "thyroid",
    name: "Щитовидная железа",
    path: "M92,65 Q100,63 108,65 L108,72 Q100,74 92,72 Z",
    categories: ["Гормоны", "Щитовидная железа"],
    color: "hsl(var(--primary))",
    issues: []
  },
  heart: {
    id: "heart",
    name: "Сердце",
    path: "M85,85 L90,80 Q100,75 105,85 Q110,75 120,80 L115,85 L100,105 Z",
    categories: ["Липиды", "Сердце"],
    color: "hsl(var(--primary))",
    issues: []
  },
  liver: {
    id: "liver",
    name: "Печень",
    path: "M105,105 L125,110 L123,135 L105,130 Z",
    categories: ["Печень", "Метаболизм"],
    color: "hsl(var(--primary))",
    issues: []
  },
  stomach: {
    id: "stomach",
    name: "Желудок и ЖКТ",
    path: "M85,115 L105,115 L108,140 L82,140 Z",
    categories: ["Метаболизм", "Пищеварение"],
    color: "hsl(var(--primary))",
    issues: []
  },
  kidneys: {
    id: "kidneys",
    name: "Почки",
    path: "M75,135 Q78,135 80,145 Q78,152 75,152 Q72,152 70,145 Q72,135 75,135 Z M125,135 Q128,135 130,145 Q128,152 125,152 Q122,152 120,145 Q122,135 125,135 Z",
    categories: ["Почки"],
    color: "hsl(var(--primary))",
    issues: []
  },
  blood: {
    id: "blood",
    name: "Кровь",
    path: "M70,85 L70,165 L75,165 L75,85 Z M125,85 L125,165 L130,165 L130,85 Z",
    categories: ["Кровь", "Общий анализ крови"],
    color: "hsl(var(--primary))",
    issues: []
  }
};

export function BodyHeatmap({ biomarkerData, patientAge, patientGender }: BodyHeatmapProps) {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  // Анализируем биомаркеры и определяем проблемные области
  const analyzeAreas = () => {
    // Глубокая копия с очисткой issues и сбросом цвета на базовый
    const areas: Record<string, BodyArea> = Object.fromEntries(
      Object.entries(BODY_AREAS).map(([id, a]) => [
        id,
        { ...a, issues: [], color: "hsl(var(--primary))" },
      ])
    );

    const processedBiomarkers = new Set<string>();

    biomarkerData.forEach((biomarker) => {
      // Пропускаем дубликаты по названию из источника
      if (processedBiomarkers.has(biomarker.name)) return;
      processedBiomarkers.add(biomarker.name);

      // Get age-dependent norms if available
      let normalMin = biomarker.normal_min;
      let normalMax = biomarker.normal_max;
      
      if (patientAge !== null && patientAge !== undefined && patientGender) {
        const ageDependent = getNormalRangeForAge(biomarker as any, patientAge, patientGender);
        normalMin = ageDependent.min;
        normalMax = ageDependent.max;
      }

      const isAbnormal =
        (normalMin !== null && normalMin !== undefined && biomarker.value < normalMin) ||
        (normalMax !== null && normalMax !== undefined && biomarker.value > normalMax);

      if (isAbnormal) {
        Object.keys(areas).forEach((areaId) => {
          const area = areas[areaId];
          const match = area.categories.some(
            (cat) => cat.toLowerCase() === String(biomarker.category || "").toLowerCase()
          );
          if (match) {
            if (!area.issues.includes(biomarker.name)) {
              area.issues.push(biomarker.name);
            }
            // Цвет по степени серьезности
            if (area.issues.length === 1) {
              area.color = "hsl(var(--status-warning))";
            } else if (area.issues.length >= 2) {
              area.color = "hsl(var(--status-danger))";
            }
          }
        });
      }
    });

    return areas;
  };

  const analyzedAreas = analyzeAreas();

  const getAreaOpacity = (area: BodyArea) => {
    if (area.issues.length === 0) return 0.1;
    if (area.issues.length === 1) return 0.4;
    return 0.6;
  };

  return (
    <TooltipProvider>
      <div className="w-full flex flex-col items-center gap-4">
        <svg
          viewBox="0 0 200 320"
          className="w-full max-w-sm"
          style={{ filter: "drop-shadow(0 0 10px rgba(0,0,0,0.1))" }}
        >
          {/* Тело силуэта - более реалистичное */}
          <g id="body-outline">
            {/* Голова */}
            <ellipse cx="100" cy="35" rx="22" ry="28" fill="hsl(var(--muted))" opacity="0.2" />
            
            {/* Шея */}
            <path d="M90,60 L110,60 L108,75 L92,75 Z" fill="hsl(var(--muted))" opacity="0.2" />
            
            {/* Плечи и торс */}
            <path
              d="M65,75 Q70,72 80,75 L92,75 L92,135 Q100,145 108,135 L108,75 L120,75 Q130,72 135,75 
                 L135,95 Q132,100 130,105 L130,165 Q125,180 100,180 Q75,180 70,165 L70,105 Q68,100 65,95 Z"
              fill="hsl(var(--muted))"
              opacity="0.2"
            />
            
            {/* Руки */}
            <ellipse cx="55" cy="115" rx="10" ry="45" fill="hsl(var(--muted))" opacity="0.2" />
            <ellipse cx="145" cy="115" rx="10" ry="45" fill="hsl(var(--muted))" opacity="0.2" />
            
            {/* Таз */}
            <path d="M70,165 L130,165 L128,185 L72,185 Z" fill="hsl(var(--muted))" opacity="0.2" />
            
            {/* Ноги */}
            <path d="M75,185 L85,185 L87,305 Q85,310 80,310 Q75,310 73,305 Z" fill="hsl(var(--muted))" opacity="0.2" />
            <path d="M115,185 L125,185 L127,305 Q125,310 120,310 Q115,310 113,305 Z" fill="hsl(var(--muted))" opacity="0.2" />
          </g>

          {/* Органы с подсветкой */}
          {Object.values(analyzedAreas).map(area => (
            <Tooltip key={area.id}>
              <TooltipTrigger asChild>
                <path
                  d={area.path}
                  fill={area.color}
                  opacity={getAreaOpacity(area)}
                  className="transition-all duration-300 cursor-pointer hover:opacity-80"
                  onMouseEnter={() => setHoveredArea(area.id)}
                  onMouseLeave={() => setHoveredArea(null)}
                  style={{
                    filter: area.issues.length > 0 
                      ? `drop-shadow(0 0 ${area.issues.length * 5}px ${area.color})`
                      : "none"
                  }}
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-semibold">{area.name}</p>
                  {area.issues.length > 0 ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Обнаружены отклонения:</p>
                      <ul className="text-xs space-y-1">
                        {area.issues.map((issue, idx) => (
                          <li key={idx}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-status-good">Показатели в норме ✓</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Пульсирующие эффекты для проблемных областей */}
          {Object.values(analyzedAreas)
            .filter(area => area.issues.length > 0)
            .map(area => (
              <path
                key={`pulse-${area.id}`}
                d={area.path}
                fill="none"
                stroke={area.color}
                strokeWidth="2"
                opacity="0.6"
                className="animate-pulse"
              />
            ))}
        </svg>

        {/* Легенда */}
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-good opacity-40"></div>
            <span className="text-muted-foreground">Норма</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-warning opacity-60"></div>
            <span className="text-muted-foreground">Внимание</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-danger opacity-80"></div>
            <span className="text-muted-foreground">Проблема</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
