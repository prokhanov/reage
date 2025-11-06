import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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
  }>;
}

const BODY_AREAS: Record<string, BodyArea> = {
  brain: {
    id: "brain",
    name: "Мозг и нервная система",
    path: "M85,15 Q95,10 105,15 L105,35 Q95,40 85,35 Z",
    categories: ["Гормоны", "Витамины"],
    color: "hsl(var(--primary))",
    issues: []
  },
  heart: {
    id: "heart",
    name: "Сердце",
    path: "M80,50 L85,45 Q95,40 100,50 Q105,40 115,45 L120,50 L100,75 Z",
    categories: ["Липиды", "Сердце"],
    color: "hsl(var(--primary))",
    issues: []
  },
  liver: {
    id: "liver",
    name: "Печень",
    path: "M110,70 L130,75 L128,95 L108,90 Z",
    categories: ["Печень", "Метаболизм"],
    color: "hsl(var(--primary))",
    issues: []
  },
  kidneys: {
    id: "kidneys",
    name: "Почки",
    path: "M75,85 Q80,85 82,95 Q80,100 75,100 Q70,100 68,95 Q70,85 75,85 Z M115,85 Q120,85 122,95 Q120,100 115,100 Q110,100 108,95 Q110,85 115,85 Z",
    categories: ["Почки"],
    color: "hsl(var(--primary))",
    issues: []
  },
  thyroid: {
    id: "thyroid",
    name: "Щитовидная железа",
    path: "M90,42 Q95,40 100,42 L100,48 Q95,50 90,48 Z",
    categories: ["Гормоны", "Щитовидная железа"],
    color: "hsl(var(--primary))",
    issues: []
  },
  blood: {
    id: "blood",
    name: "Кровь",
    path: "M70,55 L70,110 L80,110 L80,55 Z M110,55 L110,110 L120,110 L120,55 Z",
    categories: ["Кровь", "Общий анализ крови"],
    color: "hsl(var(--primary))",
    issues: []
  },
  stomach: {
    id: "stomach",
    name: "Желудок и ЖКТ",
    path: "M85,75 L105,75 L108,90 L82,90 Z",
    categories: ["Метаболизм", "Пищеварение"],
    color: "hsl(var(--primary))",
    issues: []
  }
};

export function BodyHeatmap({ biomarkerData }: BodyHeatmapProps) {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  // Анализируем биомаркеры и определяем проблемные области
  const analyzeAreas = () => {
    const areas = { ...BODY_AREAS };
    
    biomarkerData.forEach(biomarker => {
      const isAbnormal = 
        (biomarker.normal_min !== undefined && biomarker.value < biomarker.normal_min) ||
        (biomarker.normal_max !== undefined && biomarker.value > biomarker.normal_max);

      if (isAbnormal) {
        Object.keys(areas).forEach(areaId => {
          const area = areas[areaId];
          if (area.categories.some(cat => biomarker.category.includes(cat))) {
            area.issues.push(biomarker.name);
            // Устанавливаем цвет в зависимости от серьезности
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
          viewBox="0 0 190 180"
          className="w-full max-w-md"
          style={{ filter: "drop-shadow(0 0 10px rgba(0,0,0,0.1))" }}
        >
          {/* Тело силуэта */}
          <g id="body-outline">
            {/* Голова */}
            <ellipse cx="95" cy="25" rx="18" ry="22" fill="hsl(var(--muted))" opacity="0.3" />
            
            {/* Шея */}
            <rect x="88" y="42" width="14" height="10" fill="hsl(var(--muted))" opacity="0.3" />
            
            {/* Торс */}
            <path
              d="M70,52 L120,52 L125,110 L65,110 Z"
              fill="hsl(var(--muted))"
              opacity="0.3"
            />
            
            {/* Руки */}
            <rect x="50" y="52" width="20" height="60" rx="8" fill="hsl(var(--muted))" opacity="0.3" />
            <rect x="120" y="52" width="20" height="60" rx="8" fill="hsl(var(--muted))" opacity="0.3" />
            
            {/* Ноги */}
            <rect x="75" y="110" width="15" height="60" rx="6" fill="hsl(var(--muted))" opacity="0.3" />
            <rect x="100" y="110" width="15" height="60" rx="6" fill="hsl(var(--muted))" opacity="0.3" />
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
