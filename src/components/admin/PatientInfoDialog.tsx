import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Calendar,
  Activity,
  CreditCard,
  Syringe,
  Ruler,
  Weight,
  UserCheck,
} from "lucide-react";

interface PatientInfo {
  id: string;
  name: string;
  email: string | null;
  birth_date: string;
  gender: string;
  height: number | null;
  weight: number | null;
  created_at: string;
  analysisCount: number;
  latestAnalysisDate?: string;
  subscriptionStatus: string;
  bookingStatus: string;
  role: string;
}

interface PatientInfoDialogProps {
  patient: PatientInfo | null;
  onClose: () => void;
  onOpenView: (patientId: string) => void;
}

export function PatientInfoDialog({ patient, onClose, onOpenView }: PatientInfoDialogProps) {
  if (!patient) return null;

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      superadmin: { label: "Суперадмин", variant: "destructive" },
      admin: { label: "Админ", variant: "default" },
      doctor: { label: "Врач", variant: "default" },
      user: { label: "Пользователь", variant: "secondary" },
      patient: { label: "Пациент", variant: "secondary" },
    };
    const config = roleConfig[role] || roleConfig.patient;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const getSubscriptionBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Активна", variant: "default" },
      pending: { label: "Ожидает оплаты", variant: "secondary" },
      expired: { label: "Истекла", variant: "destructive" },
      cancelled: { label: "Отменена", variant: "outline" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="text-xs">
        <CreditCard className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getBookingBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      not_scheduled: { label: "Не назначен", variant: "secondary" },
      scheduled: { label: "Назначен", variant: "outline" },
      collected: { label: "Получен", variant: "default" },
      uploaded: { label: "Загружен", variant: "default" },
    };
    const config = statusConfig[status] || statusConfig.not_scheduled;
    return (
      <Badge variant={config.variant} className="text-xs">
        <Syringe className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const age = calculateAge(patient.birth_date);

  return (
    <Dialog open={!!patient} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Информация о пациенте</DialogTitle>
          <DialogDescription>
            Полная информация и статусы пациента
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {getInitials(patient.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{patient.name || "Без имени"}</h3>
              <div className="flex items-center gap-2 mt-1">
                {getRoleBadge(patient.role)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Личные данные
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patient.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{patient.email}</p>
                  </div>
                </div>
              )}
              {age !== null && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Возраст</p>
                    <p className="text-sm font-medium">{age} лет</p>
                  </div>
                </div>
              )}
              {patient.gender && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Пол</p>
                    <p className="text-sm font-medium">
                      {patient.gender === "male" ? "Мужской" : "Женский"}
                    </p>
                  </div>
                </div>
              )}
              {patient.height && (
                <div className="flex items-start gap-3">
                  <Ruler className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Рост</p>
                    <p className="text-sm font-medium">{patient.height} см</p>
                  </div>
                </div>
              )}
              {patient.weight && (
                <div className="flex items-start gap-3">
                  <Weight className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Вес</p>
                    <p className="text-sm font-medium">{patient.weight} кг</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Дата регистрации</p>
                  <p className="text-sm font-medium">
                    {new Date(patient.created_at).toLocaleDateString("ru-RU")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Subscription & Payment Status */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Подписка и оплата
            </h4>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Статус подписки</p>
                <div className="mt-1">
                  {getSubscriptionBadge(patient.subscriptionStatus)}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Analysis Status */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Анализы
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Syringe className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Статус бронирования</p>
                  <div className="mt-1">
                    {getBookingBadge(patient.bookingStatus)}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Всего анализов</p>
                  <p className="text-sm font-medium">{patient.analysisCount}</p>
                </div>
              </div>
              {patient.latestAnalysisDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Последний анализ</p>
                    <p className="text-sm font-medium">
                      {new Date(patient.latestAnalysisDate).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
          <Button onClick={() => onOpenView(patient.id)}>
            Открыть режим просмотра
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
