import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

pdfMake.vfs = pdfFonts.pdfMake.vfs;

interface SymptomRecord {
  id: string;
  category: string;
  symptom: string;
  severity: number;
  tracked_at: string;
}

interface ExportToPDFProps {
  symptoms: SymptomRecord[];
  groupedByDate: Record<string, SymptomRecord[]>;
  sortedDates: string[];
  profileName?: string;
}

const severityMap: Record<number, string> = {
  0: "Нет",
  1: "Легко",
  2: "Средне",
  3: "Сильно"
};

export function ExportToPDF({ symptoms, groupedByDate, sortedDates, profileName = "Пациент" }: ExportToPDFProps) {
  const generatePDF = () => {
    if (symptoms.length === 0) {
      return;
    }

    // Подсчет статистики
    const getTotalSymptomsByLevel = (symptomsToCount: SymptomRecord[]) => {
      const counts = { mild: 0, moderate: 0, severe: 0 };
      symptomsToCount.forEach(s => {
        if (s.severity === 1) counts.mild++;
        if (s.severity === 2) counts.moderate++;
        if (s.severity === 3) counts.severe++;
      });
      return counts;
    };

    // Создаем контент для PDF
    const content: any[] = [
      {
        text: "История состояния здоровья",
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 20]
      },
      {
        text: `Пациент: ${profileName}`,
        style: "subheader",
        margin: [0, 0, 0, 5]
      },
      {
        text: `Дата формирования отчета: ${format(new Date(), "d MMMM yyyy, HH:mm", { locale: ru })}`,
        style: "small",
        margin: [0, 0, 0, 20]
      },
      {
        text: "Общая статистика",
        style: "subheader",
        margin: [0, 0, 0, 10]
      }
    ];

    // Добавляем общую статистику
    const overallStats = getTotalSymptomsByLevel(symptoms);
    content.push({
      table: {
        widths: ["*", "*", "*", "*"],
        body: [
          [
            { text: "Всего записей", style: "tableHeader" },
            { text: "Легкие", style: "tableHeader" },
            { text: "Средние", style: "tableHeader" },
            { text: "Сильные", style: "tableHeader" }
          ],
          [
            { text: sortedDates.length.toString(), alignment: "center" },
            { text: overallStats.mild.toString(), alignment: "center" },
            { text: overallStats.moderate.toString(), alignment: "center" },
            { text: overallStats.severe.toString(), alignment: "center" }
          ]
        ]
      },
      margin: [0, 0, 0, 20]
    });

    // Добавляем детальную информацию по датам
    content.push({
      text: "Детальная история",
      style: "subheader",
      margin: [0, 0, 0, 10],
      pageBreak: "before"
    });

    sortedDates.forEach((date, index) => {
      const dateSymptoms = groupedByDate[date];
      const dateStats = getTotalSymptomsByLevel(dateSymptoms);

      content.push({
        text: format(new Date(date), "d MMMM yyyy", { locale: ru }),
        style: "dateHeader",
        margin: [0, index > 0 ? 15 : 0, 0, 5]
      });

      content.push({
        text: `Время: ${format(new Date(dateSymptoms[0].tracked_at), "HH:mm", { locale: ru })} | Всего симптомов: ${dateSymptoms.length} (Легкие: ${dateStats.mild}, Средние: ${dateStats.moderate}, Сильные: ${dateStats.severe})`,
        style: "small",
        margin: [0, 0, 0, 10]
      });

      // Группируем по категориям
      const categorized = dateSymptoms.reduce((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
      }, {} as Record<string, SymptomRecord[]>);

      Object.entries(categorized).forEach(([category, categorySymptoms]) => {
        content.push({
          text: category,
          style: "categoryHeader",
          margin: [0, 5, 0, 5]
        });

        const tableBody: any[] = [
          [
            { text: "Симптом", style: "tableHeader", fillColor: "#f0f0f0" },
            { text: "Тяжесть", style: "tableHeader", fillColor: "#f0f0f0" }
          ]
        ];

        categorySymptoms.forEach(s => {
          tableBody.push([
            { text: s.symptom, style: "small" },
            { text: severityMap[s.severity], style: "small", alignment: "center" }
          ]);
        });

        content.push({
          table: {
            widths: ["*", 80],
            body: tableBody
          },
          margin: [0, 0, 0, 10]
        });
      });
    });

    // Определение стилей
    const docDefinition: any = {
      content,
      styles: {
        header: {
          fontSize: 18,
          bold: true
        },
        subheader: {
          fontSize: 14,
          bold: true
        },
        dateHeader: {
          fontSize: 12,
          bold: true
        },
        categoryHeader: {
          fontSize: 11,
          bold: true,
          color: "#333"
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          alignment: "center"
        },
        small: {
          fontSize: 9,
          color: "#666"
        }
      },
      defaultStyle: {
        fontSize: 10
      },
      pageMargins: [40, 40, 40, 40]
    };

    pdfMake.createPdf(docDefinition).download(`история-состояния-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <Button 
      variant="outline" 
      onClick={generatePDF}
      disabled={symptoms.length === 0}
      className="gap-2"
    >
      <FileDown className="h-4 w-4" />
      Экспорт в PDF
    </Button>
  );
}
