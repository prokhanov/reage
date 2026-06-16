import { Home, FlaskConical, TrendingUp, Lightbulb, User, LogOut, Activity, Settings, Heart, Users, Eye, X, FileText, MessageSquare, Briefcase, CreditCard, Calendar, ClipboardList, AlertTriangle, ChevronLeft, ChevronRight, Target, Mail, Send, MapPin } from "lucide-react";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEffect, useState, useContext } from "react";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";
import { useScheduledBookingsCount } from "@/hooks/useScheduledBookingsCount";
import { useMyAssignmentsCount } from "@/hooks/useMyAssignmentsCount";
import { ThemedLogo } from "@/components/ThemedLogo";
import { useQueryClient } from "@tanstack/react-query";
import { useEmailConfirmation } from "@/hooks/useEmailConfirmation";
import { EmailConfirmationBadge } from "@/components/admin/EmailConfirmationBadge";
import { PhoneConfirmationBadge } from "@/components/admin/PhoneConfirmationBadge";
import { performSafeLogout } from "@/lib/authLogout";

interface AppSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const navItems = [
  { to: "/dashboard", label: "Моё здоровье", icon: Home },
  { to: "/analyses", label: "Анализы", icon: FlaskConical },
  { to: "/recommendations", label: "Персональные отчёты", icon: Lightbulb },
  { to: "/prescriptions", label: "Рекомендации", icon: FileText },
  { to: "/my-state", label: "Мое состояние", icon: Heart },
  { to: "/health-assistant", label: "AI Ассистент", icon: MessageSquare },
  { to: "/health-strategy", label: "Стратегия здоровья", icon: Target },
];

const adminNavItems = [
  { to: "/admin/patients", label: "Пациенты", icon: Users },
  { to: "/admin/analysis-bookings", label: "Записи на анализы", icon: Calendar },
  { to: "/admin/my-assignments", label: "Назначены мне", icon: ClipboardList },
  { to: "/admin/user-management", label: "Пользователи", icon: Briefcase },
  { to: "/admin/subscription-plans", label: "Тарифы", icon: CreditCard, requiresSuperAdmin: true },
  { to: "/admin/payment-gateway", label: "Платёжный шлюз", icon: CreditCard, requiresSuperAdmin: true },
  { to: "/admin/report-visuals", label: "Тест отчета", icon: Eye, requiresSuperAdmin: true },
  { to: "/admin/ai-settings", label: "Настройки AI", icon: Settings },
  { to: "/admin/email-settings", label: "Email", icon: Mail, requiresSuperAdmin: true },
  { to: "/admin/sms-settings", label: "SMS", icon: MessageSquare, requiresSuperAdmin: true },
  { to: "/admin/telegram-settings", label: "Telegram", icon: Send, requiresSuperAdmin: true },
  { to: "/admin/data-management", label: "Управление данными", icon: FlaskConical },
];

export function AppSidebar({ isOpen, setIsOpen }: AppSidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { viewAsUserId, simPath, setSimPath, setViewAsUserId, onExitView } = useContext(ViewAsPatientContext);
  const { data: roleData, isLoading: isLoadingRoles } = useUserRole();
  const { data: scheduledCount = 0 } = useScheduledBookingsCount();
  const { data: myAssignmentsCount = 0 } = useMyAssignmentsCount();
  const { data: emailStatus } = useEmailConfirmation();
  const [patientName, setPatientName] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);

  // Извлекаем данные из React Query
  const isSuperAdmin = roleData?.isSuperAdmin ?? false;
  const hasAdminAccess = roleData?.hasAdminAccess ?? false;
  const isPatient = roleData?.isPatient ?? false;
  const userEmail = roleData?.userEmail ?? "";
  const userRole = roleData?.userRole ?? "";

  useEffect(() => {
    if (viewAsUserId) {
      loadPatientData();
    }
  }, [viewAsUserId]);

  useEffect(() => {
    if (!viewAsUserId) {
      loadOwnPhone();
    }
  }, [viewAsUserId, userEmail]);

  const loadOwnPhone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("phone, phone_verified_at")
        .eq("id", user.id)
        .maybeSingle();
      setUserPhone(data?.phone || null);
      setPhoneVerified(!!data?.phone_verified_at);
    } catch (e) {
      console.error("Error loading phone:", e);
    }
  };

  const loadPatientData = async () => {
    if (!viewAsUserId) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", viewAsUserId)
        .maybeSingle();
      setPatientName(data?.name || "");
      setPatientEmail(data?.email || "");
    } catch (error) {
      console.error("Error loading patient data:", error);
    }
  };


  const handleLogout = async () => {
    toast({ title: "Вы вышли из системы" });
    await performSafeLogout(queryClient);
  };

  const handleExitViewMode = () => {
    setViewAsUserId(null);
    setSimPath("/dashboard");
    closeSidebarOnMobile();
    if (onExitView) {
      onExitView();
    }
  };

  const closeSidebarOnMobile = () => {
    // Закрываем сайдбар только на мобильных устройствах (ширина < 1024px)
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-secondary/80 border-r border-border/30 backdrop-blur-xl transition-all duration-300 ease-in-out",
          isOpen ? "w-64" : "w-16",
          "lg:translate-x-0",
          !isOpen && "lg:w-16",
          !isOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo with collapse button */}
          <div className={cn("border-b border-border/30", isOpen ? "p-4" : "p-2")}>
            {isOpen ? (
              <>
                <div className="flex items-start justify-between mb-3">
                  <ThemedLogo className="h-12 w-auto animate-hue-shift" />
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                    title="Свернуть боковую панель"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
                {viewAsUserId ? (
                  <>
                    <p className="text-xs text-muted-foreground truncate mt-1">{patientEmail}</p>
                    <p className="text-xs text-primary/70 font-medium mt-0.5">Пациент</p>
                  </>
                ) : (
                  <div className="space-y-1 mt-1">
                    {/* Email row */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {emailStatus?.isConfirmed ? (
                        <>
                          <p className="text-xs text-muted-foreground truncate min-w-0">{userEmail}</p>
                          <EmailConfirmationBadge email={userEmail} isConfirmed={true} />
                        </>
                      ) : emailStatus ? (
                        <EmailConfirmationBadge
                          email={emailStatus.email || userEmail}
                          isConfirmed={false}
                          allowEmailChange={true}
                          onEmailChanged={() => queryClient.invalidateQueries({ queryKey: ["email-confirmation-status"] })}
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                      )}
                    </div>
                    {/* Phone row */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {userPhone && phoneVerified ? (
                        <>
                          <p className="text-xs text-muted-foreground truncate min-w-0">
                            +{userPhone}
                          </p>
                          <PhoneConfirmationBadge
                            phone={userPhone}
                            isVerified={true}
                            onUpdated={loadOwnPhone}
                          />
                        </>
                      ) : (
                        <PhoneConfirmationBadge
                          phone={userPhone}
                          isVerified={false}
                          onUpdated={loadOwnPhone}
                        />
                      )}
                    </div>
                    {/* Role */}
                    <p className="text-xs text-primary/70 font-medium pt-0.5">{userRole}</p>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => setIsOpen(true)}
                className="w-full flex justify-center p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                title="Развернуть боковую панель"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* View Mode Badge */}
          {viewAsUserId && isOpen && (
            <div className="px-4 py-3 bg-primary/10 border-b border-border/30">
              <Badge variant="default" className="w-full justify-start gap-2">
                <Eye className="h-3 w-3" />
                Просмотр: {patientName}
              </Badge>
            </div>
          )}
          {viewAsUserId && !isOpen && (
            <div className="flex justify-center py-2 bg-primary/10 border-b border-border/30" title="Режим просмотра пациента">
              <Eye className="h-4 w-4 text-primary" />
            </div>
          )}

          {/* Navigation */}
          <nav className={cn("flex-1 space-y-1 overflow-y-auto", isOpen ? "p-2" : "py-2 px-0")}>
            {isLoadingRoles ? (
              // Скелетон навигации
              <>
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </>
            ) : (
              <>
                {/* Для пациентов или режима просмотра - показываем пациентские разделы */}
                {(isPatient || viewAsUserId) && navItems.map((item) => {
              const activeInSim = viewAsUserId && (simPath === item.to || (item.to === "/analyses" && simPath.startsWith("/analyses")));
              const baseClasses = cn(
                "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm",
                "hover:bg-primary/10 hover:text-primary",
                activeInSim && "bg-primary/15 text-primary border border-primary/20",
                isOpen ? "px-3 py-3" : "w-12 h-12 justify-center mx-auto"
              );

              if (viewAsUserId) {
                return (
                  <button
                    key={item.to}
                    onClick={() => { setSimPath(item.to); closeSidebarOnMobile(); }}
                    className={baseClasses}
                    title={!isOpen ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {isOpen && <span className="font-medium">{item.label}</span>}
                  </button>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeSidebarOnMobile}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm",
                      "hover:bg-primary/10 hover:text-primary",
                      isActive && "bg-primary/15 text-primary border border-primary/20",
                      isOpen ? "px-3 py-3" : "w-12 h-12 justify-center mx-auto"
                    )
                  }
                  title={!isOpen ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {isOpen && <span className="font-medium">{item.label}</span>}
                </NavLink>
              );
            })}

                {/* Для сотрудников (НЕ пациентов и НЕ в режиме просмотра) - показываем админские разделы */}
                {!isPatient && !viewAsUserId && (isSuperAdmin || hasAdminAccess) && adminNavItems
                  .filter(item => !item.requiresSuperAdmin || isSuperAdmin)
                  .map((item) => {
                  const isBookingsPage = item.to === "/admin/analysis-bookings";
                  const isMyAssignmentsPage = item.to === "/admin/my-assignments";
                  const hasScheduled = isBookingsPage && scheduledCount > 0;
                  const hasMyAssignments = isMyAssignmentsPage && myAssignmentsCount > 0;
                  const showCount = hasScheduled || hasMyAssignments;
                  const count = isBookingsPage ? scheduledCount : myAssignmentsCount;
                  
                  return (
                    <div key={item.to} className="relative">
                      <NavLink
                        to={item.to}
                        onClick={closeSidebarOnMobile}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm",
                            "hover:bg-primary/10 hover:text-primary",
                            isActive && "bg-primary/15 text-primary border border-primary/20",
                            isOpen ? "px-3 py-3" : "w-12 h-12 justify-center mx-auto"
                          )
                        }
                        title={!isOpen ? item.label : undefined}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {isOpen && (
                          <span className={cn("font-medium", showCount && "font-bold")}>
                            {item.label}
                            {showCount && (
                              <span className="ml-1 text-primary">({count})</span>
                            )}
                          </span>
                        )}
                        {!isOpen && showCount && (
                          <span className="absolute top-2 right-[14px] w-2 h-2 bg-primary rounded-full" />
                        )}
                      </NavLink>
                    </div>
                  );
                })}
              </>
            )}
          </nav>

          {/* User Profile & Logout */}
          <div className={cn("border-t border-border/30 space-y-1", isOpen ? "p-2" : "py-2 px-0")}>
            {viewAsUserId ? (
              <button
                onClick={() => { setSimPath("/profile"); closeSidebarOnMobile(); }}
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm",
                  "hover:bg-primary/10 hover:text-primary",
                  simPath === "/profile" && "bg-primary/15 text-primary border border-primary/20",
                  isOpen ? "px-3 py-3" : "w-12 h-12 justify-center mx-auto"
                )}
                title={!isOpen ? "Профиль" : undefined}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">Профиль</span>}
              </button>
            ) : (
              <NavLink
                to="/profile"
                onClick={closeSidebarOnMobile}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm",
                    "hover:bg-primary/10 hover:text-primary",
                    isActive && "bg-primary/15 text-primary border border-primary/20",
                    isOpen ? "px-3 py-3" : "w-12 h-12 justify-center mx-auto"
                  )
                }
                title={!isOpen ? "Профиль" : undefined}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">Профиль</span>}
              </NavLink>
            )}

            {/* Subscription */}
            {viewAsUserId ? (
              <button
                onClick={() => { setSimPath("/subscription"); closeSidebarOnMobile(); }}
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm",
                  "hover:bg-primary/10 hover:text-primary",
                  simPath === "/subscription" && "bg-primary/15 text-primary border border-primary/20",
                  isOpen ? "px-3 py-3" : "w-12 h-12 justify-center mx-auto"
                )}
                title={!isOpen ? "Подписка" : undefined}
              >
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">Подписка</span>}
              </button>
            ) : (
              <NavLink
                to="/subscription"
                onClick={closeSidebarOnMobile}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg transition-all duration-200 text-sm",
                    "hover:bg-primary/10 hover:text-primary",
                    isActive && "bg-primary/15 text-primary border border-primary/20",
                    isOpen ? "px-3 py-3" : "w-12 h-12 justify-center mx-auto"
                  )
                }
                title={!isOpen ? "Подписка" : undefined}
              >
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">Подписка</span>}
              </NavLink>
            )}

            {viewAsUserId ? (
              <button
                onClick={handleExitViewMode}
                className={cn(
                  "flex items-center gap-3 py-3 rounded-lg transition-all duration-200 w-full text-sm",
                  "hover:bg-destructive/10 hover:text-destructive",
                  isOpen ? "px-3 text-left" : "px-0 justify-center"
                )}
                title={!isOpen ? "Выйти из просмотра" : undefined}
              >
                <X className="h-5 w-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">Выйти из просмотра</span>}
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-3 py-3 rounded-lg transition-all duration-200 w-full text-sm",
                  "hover:bg-destructive/10 hover:text-destructive",
                  isOpen ? "px-3 text-left" : "px-0 justify-center"
                )}
                title={!isOpen ? "Выход" : undefined}
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">Выход</span>}
              </button>
            )}

            {/* Theme Toggle */}
            <div className={cn(
              "border-t border-border/30 mt-1",
              isOpen ? "pt-1" : "flex justify-center pt-2"
            )}>
              <ThemeToggle isOpen={isOpen} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
