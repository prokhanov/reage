import { useState, useEffect } from "react";
import { Calendar, Phone, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { AnalysisBookingDialog } from "./AnalysisBookingDialog";
import { CallbackRequestDialog } from "./CallbackRequestDialog";
import { NoAnswerCallbackDialog } from "./NoAnswerCallbackDialog";
import { SubscriptionRequiredDialog } from "./SubscriptionRequiredDialog";
import { AnalysisInstructionsDialog } from "./AnalysisInstructionsDialog";
import {
  useBookingModeSettings,
  getStatusText,
} from "@/hooks/useBookingModeSettings";

interface BookingInfo {
  id: string;
  booking_date: string;
  booking_time: string;
  address: string;
  status: string;
  next_analysis_date?: string;
  labquest_request_number?: string | null;
}

export function AnalysisBookingBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
  const [noAnswerDialogOpen, setNoAnswerDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [medicalAnketaFilled, setMedicalAnketaFilled] = useState(true);
  const { data: userRoleData, isLoading } = useUserRole();
  const { getUserId, isViewMode } = useViewAsUser();
  const { data: modeSettings } = useBookingModeSettings();
  const mode = modeSettings?.mode ?? "phone";
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkBookingStatus();
    checkSubscriptionStatus();
    checkAnketaStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAnketaStatus = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("medical_anketa_filled")
        .eq("id", userId)
        .maybeSingle();
      setMedicalAnketaFilled(!!(profile as any)?.medical_anketa_filled);
    } catch (error) {
      console.error("Error checking anketa status:", error);
    }
  };

  const checkSubscriptionStatus = async () => {

    try {
      const userId = await getUserId();
      if (!userId) return;
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setHasActiveSubscription(subscription?.status === "active");
    } catch (error) {
      console.error("Error checking subscription status:", error);
    }
  };

  const isBookingExpired = (b: any) => {
    if (!b?.booking_date) return false;
    try {
      const dateStr = b.booking_date;
      const timeStr = b.booking_time || "23:59";
      const dt = new Date(
        `${dateStr}T${timeStr.length === 5 ? timeStr + ":00" : timeStr}`
      );
      return dt.getTime() < Date.now();
    } catch {
      return false;
    }
  };

  const checkBookingStatus = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const [{ data: bookings }, { data: analyses }] = await Promise.all([
        supabase
          .from("analysis_bookings")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("analyses")
          .select("id,created_at,status")
          .eq("user_id", userId)
          .in("status", ["processed", "on_review"])
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (!bookings || bookings.length === 0) {
        setShowBanner(true);
        setBookingInfo(null);
        return;
      }

      // Если после брони появился готовый анализ — цикл завершён,
      // даже если статус брони не был проставлен вручную.
      const latestAnalysisAt = analyses && analyses[0]
        ? new Date(analyses[0].created_at).getTime()
        : 0;

      // If the cycle was completed (any booking has terminal status "report_ready"),
      // ignore the auto-created "not_scheduled" placeholder for the next cycle —
      // it should not nag the user immediately after their report is ready.
      const hasCompleted =
        bookings.some((b) => b.status === "report_ready") || latestAnalysisAt > 0;
      const lastCompletedAt = hasCompleted
        ? Math.max(
            latestAnalysisAt,
            ...bookings
              .filter((b) => b.status === "report_ready")
              .map((b) => new Date(b.created_at).getTime())
          )
        : 0;

      // Priority order: active statuses that need user attention.
      // Дополнительно отсекаем брони, созданные ДО завершения последнего цикла —
      // они уже неактуальны, даже если статус в БД не обновили вручную.
      const find = (status: string) =>
        bookings.find(
          (b) =>
            b.status === status &&
            !(hasCompleted && new Date(b.created_at).getTime() <= lastCompletedAt) &&
            // skip the next-cycle "not_scheduled" placeholder created right after the report was ready
            !(status === "not_scheduled" && hasCompleted && new Date(b.created_at).getTime() >= lastCompletedAt)
        );

      const active =
        find("report_pending") ||
        find("collected") ||
        find("application_submitted") ||
        find("scheduled") ||
        find("no_answer") ||
        find("waiting_call") ||
        find("not_scheduled");


      if (active) {
        setShowBanner(true);
        setBookingInfo(active as BookingInfo);
        return;
      }

      // Terminal status: report ready / cycle completed — no reminder needed
      if (hasCompleted) {
        setShowBanner(false);
        setBookingInfo(null);
        return;
      }


      setShowBanner(true);
      setBookingInfo(null);
    } catch (error) {
      console.error("Error checking booking status:", error);
    }
  };

  const handleSchedule = () => {
    if (!hasActiveSubscription) {
      setSubscriptionDialogOpen(true);
      return;
    }
    if (!medicalAnketaFilled && !isViewMode) {
      toast({
        title: "Сначала заполните медицинскую анкету",
        description:
          "Откройте «Профиль» → раздел «История болезней» и укажите хронические заболевания, приём лекарств и операции — это нужно для корректного отчёта. Занимает пару минут.",
      });
      navigate("/profile");
      return;
    }

    if (statusKey === "no_answer") {
      setNoAnswerDialogOpen(true);
      return;
    }

    if (mode === "phone") {
      setCallbackDialogOpen(true);
    } else {
      setDialogOpen(true);
    }
  };


  const handleSubscriptionSuccess = () => {
    checkSubscriptionStatus();
    setTimeout(() => {
      if (statusKey === "no_answer") setNoAnswerDialogOpen(true);
      else if (mode === "phone") setCallbackDialogOpen(true);
      else setDialogOpen(true);
    }, 300);
  };

  if (isLoading || !showBanner) return null;
  if (!userRoleData?.isPatient && !isViewMode) return null;

  // Determine displayed status key
  const statusKey = bookingInfo?.status ?? "empty";

  // Build dynamic texts
  const fallbackMap: Record<string, { title: string; subtitle: string }> = {
    empty: {
      title: "Запишитесь на анализы",
      subtitle:
        mode === "phone"
          ? "Оставьте заявку — менеджер перезвонит"
          : "Медсестра приедет к вам домой или выберите клинику для визита",
    },
    waiting_call: {
      title: "Ожидайте звонка менеджера",
      subtitle: "Мы свяжемся с вами для согласования даты визита",
    },
    no_answer: {
      title: "Не дозвонились",
      subtitle: "Запросите повторный звонок",
    },
    not_scheduled: {
      title: "Запишитесь на анализы",
      subtitle: "Медсестра приедет к вам домой или выберите клинику для визита",
    },
    scheduled: {
      title: "Сдайте анализы",
      subtitle: "{date} в {time} • {address}",
    },
    application_submitted: {
      title: "Заявка подтверждена — сдайте анализы",
      subtitle: "{date} в {time} • {address}",
    },
    collected: {
      title: "Анализ в работе",
      subtitle: "Биоматериал передан в лабораторию — ожидаем результаты",
    },
    report_pending: {
      title: "Формируем ваш персональный отчёт",
      subtitle: "Обычно подготовка занимает 1–2 рабочих дня",
    },
  };


  const text = getStatusText(modeSettings, statusKey, fallbackMap[statusKey] ?? fallbackMap.empty);

  // Interpolate placeholders for scheduled / application_submitted
  let subtitle = text.subtitle;
  if (
    bookingInfo &&
    (statusKey === "scheduled" || statusKey === "application_submitted")
  ) {
    const dateStr = new Date(bookingInfo.booking_date).toLocaleDateString(
      "ru-RU",
      { day: "numeric", month: "long" }
    );
    subtitle = subtitle
      .replace(/\{date\}/g, dateStr)
      .replace(/\{time\}/g, bookingInfo.booking_time || "")
      .replace(/\{address\}/g, bookingInfo.address || "");

    // Render the request number on a separate line below the subtitle.
    // Remove any inline placeholder from the subtitle text to avoid duplication.
    if (bookingInfo.labquest_request_number) {
      subtitle = subtitle
        .replace(/\s*•\s*Номер заявки:\s*\{request_number\}/g, "")
        .replace(/\s*Номер заявки:\s*\{request_number\}/g, "")
        .replace(/\{request_number\}/g, "");
      subtitle = subtitle.replace(/\s*•\s*$/, "").trim();
    }
  }

  // Statuses where we show the "Инструкция" button instead of a scheduling action
  const instructionStatuses = ["scheduled", "application_submitted"];
  const showInstructions = instructionStatuses.includes(statusKey);

  // Decide whether to show action button
  const terminalStatuses = [
    "collected",
    "report_pending",
    "scheduled",
    "application_submitted",
  ];
  const showButton = !terminalStatuses.includes(statusKey);
  let buttonLabel = "Назначить дату";
  if (mode === "phone") {
    if (statusKey === "waiting_call") buttonLabel = "Запланировать сдачу";
    else if (statusKey === "no_answer") buttonLabel = "Запросить звонок";
    else buttonLabel = "Оставить заявку";
  } else if (statusKey === "scheduled") {
    buttonLabel = "Изменить";
  }

  const Icon = mode === "phone" ? Phone : Calendar;
  const callbackPhone = modeSettings?.callback_phone ?? null;

  return (
    <>
      <SubscriptionRequiredDialog
        open={subscriptionDialogOpen}
        onOpenChange={setSubscriptionDialogOpen}
        onSuccess={handleSubscriptionSuccess}
      />
      <AnalysisBookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={checkBookingStatus}
      />
      <CallbackRequestDialog
        open={callbackDialogOpen}
        onOpenChange={setCallbackDialogOpen}
        existingBookingId={bookingInfo?.id ?? null}
        onSuccess={checkBookingStatus}
      />
      <NoAnswerCallbackDialog
        open={noAnswerDialogOpen}
        onOpenChange={setNoAnswerDialogOpen}
        existingBookingId={bookingInfo?.id ?? null}
        onSuccess={checkBookingStatus}
      />
      <AnalysisInstructionsDialog
        open={instructionsOpen}
        onOpenChange={setInstructionsOpen}
        requestNumber={bookingInfo?.labquest_request_number ?? null}
        callbackPhone={callbackPhone}
      />
      <div className="relative rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 animate-fade-in">
        <div className="flex items-start gap-3 sm:items-center sm:justify-between sm:flex-row flex-col">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground leading-snug">{text.title}</p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{subtitle}</p>
              {bookingInfo?.labquest_request_number && statusKey === "application_submitted" && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                  Номер заявки: {bookingInfo.labquest_request_number}
                </p>
              )}
              {showInstructions && (
                <p className="text-xs text-muted-foreground leading-snug pt-1">
                  Для изменения записи свяжитесь с нами по телефону{" "}
                  <a
                    href={`tel:${(callbackPhone ?? "+7 (995) 998-46-38").replace(/[^+\d]/g, "")}`}
                    className="font-semibold text-foreground underline"
                  >
                    {callbackPhone ?? "+7 (995) 998-46-38"}
                  </a>{" "}
                  или в Telegram-чате{" "}
                  <a
                    href="https://t.me/reage_life"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-foreground underline"
                  >
                    @reage_life
                  </a>
                  .
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {showInstructions && (
              <Button
                onClick={() => setInstructionsOpen(true)}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto h-10 rounded-xl"
              >
                <Info className="h-4 w-4 mr-1.5" />
                Инструкция
              </Button>
            )}
            {showButton && (
              <Button
                onClick={handleSchedule}
                size="sm"
                className="bg-gradient-primary shadow-neon-primary text-white w-full sm:w-auto h-10 rounded-xl"
              >
                {buttonLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
