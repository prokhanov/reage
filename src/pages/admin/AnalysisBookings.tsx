import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Search, UserCog, Eye, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import AnalysisBookingsSkeleton from "@/components/skeletons/AnalysisBookingsSkeleton";
import AssignStaffDialog from "@/components/admin/AssignStaffDialog";
import { PatientInfoDialog } from "@/components/admin/PatientInfoDialog";

type BookingStatus = "scheduled" | "collected" | "uploaded";

interface BookingData {
  id: string;
  user_id: string;
  booking_date: string;
  booking_time: string;
  address: string;
  status: BookingStatus;
  assigned_staff_id: string | null;
  created_at: string;
  patient: {
    name: string;
    email: string;
    birth_date: string;
  };
  assigned_staff: {
    name: string;
  } | null;
}

const statusLabels: Record<BookingStatus, string> = {
  scheduled: "Назначен",
  collected: "Получен",
  uploaded: "Загружен",
};

const statusColors: Record<BookingStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  collected: "bg-green-100 text-green-700 border-green-200",
  uploaded: "bg-emerald-600 text-white border-emerald-600",
};

export default function AnalysisBookings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [selectedBookingForStaff, setSelectedBookingForStaff] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["analysis-bookings", statusFilter, staffFilter, searchQuery],
    queryFn: async () => {
      // First get bookings
      let query = supabase
        .from("analysis_bookings")
        .select("*")
        .neq("status", "not_scheduled")
        .order("booking_date", { ascending: false })
        .order("booking_time", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (staffFilter !== "all") {
        if (staffFilter === "unassigned") {
          query = query.is("assigned_staff_id", null);
        } else {
          query = query.eq("assigned_staff_id", staffFilter);
        }
      }

      const { data: bookingsData, error: bookingsError } = await query;
      if (bookingsError) throw bookingsError;

      if (!bookingsData || bookingsData.length === 0) {
        return [];
      }

      // Get all unique user IDs
      const userIds = [...new Set(bookingsData.map(b => b.user_id))];
      const staffIds = [...new Set(bookingsData.map(b => b.assigned_staff_id).filter(Boolean))];

      // Fetch patient profiles
      const { data: patientProfiles, error: patientError } = await supabase
        .from("profiles")
        .select("id, name, email, birth_date")
        .in("id", userIds);

      if (patientError) throw patientError;

      // Fetch staff profiles if any
      let staffProfiles: any[] = [];
      if (staffIds.length > 0) {
        const { data: staffData, error: staffError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", staffIds);

        if (staffError) throw staffError;
        staffProfiles = staffData || [];
      }

      // Combine data
      const result = bookingsData.map(booking => {
        const patient = patientProfiles?.find(p => p.id === booking.user_id);
        const staff = staffProfiles?.find(s => s.id === booking.assigned_staff_id);

        return {
          ...booking,
          patient: patient ? {
            name: patient.name,
            email: patient.email,
            birth_date: patient.birth_date
          } : null,
          assigned_staff: staff ? { name: staff.name } : null
        };
      });

      // Apply search filter
      if (searchQuery) {
        return result.filter(r => 
          r.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return result as BookingData[];
    },
  });

  const { data: staffMembers } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .neq("role", "patient");
      
      if (error) throw error;
      
      const userIds = data.map(item => item.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      
      if (profilesError) throw profilesError;
      return profiles || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, newStatus }: { bookingId: string; newStatus: BookingStatus }) => {
      const { error } = await supabase
        .from("analysis_bookings")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-bookings"] });
      toast({
        title: "Статус обновлен",
        description: "Статус записи успешно изменен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return <AnalysisBookingsSkeleton />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Записи на анализы</h1>
        <p className="text-muted-foreground mt-2">
          Управление записями пациентов на забор анализов
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени пациента..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="scheduled">Назначен</SelectItem>
              <SelectItem value="collected">Получен</SelectItem>
              <SelectItem value="uploaded">Загружен</SelectItem>
            </SelectContent>
          </Select>

          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Все сотрудники" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все сотрудники</SelectItem>
              <SelectItem value="unassigned">Не назначен</SelectItem>
              {staffMembers?.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </CardHeader>
        
        <CardContent>
        {!bookings || bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Записи не найдены</h3>
            <p className="text-muted-foreground">
              Записи на анализы появятся здесь
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пациент</TableHead>
                  <TableHead>Дата и время</TableHead>
                  <TableHead>Адрес</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Назначен сотрудник</TableHead>
                  <TableHead>Создана</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(booking.patient.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{booking.patient.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.patient.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {format(new Date(booking.booking_date), "d MMMM yyyy", { locale: ru })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {booking.booking_time}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {booking.address}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[booking.status]}
                      >
                        {statusLabels[booking.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {booking.assigned_staff ? (
                        <span className="font-medium">{booking.assigned_staff.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Не назначен</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.created_at), "d MMM yyyy", { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBookingForStaff(booking.id)}
                        >
                          <UserCog className="h-4 w-4 mr-1" />
                          Назначить
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {Object.entries(statusLabels).map(([status, label]) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    bookingId: booking.id,
                                    newStatus: status as BookingStatus,
                                  })
                                }
                                disabled={booking.status === status}
                              >
                                {label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPatientId(booking.user_id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        </CardContent>
      </Card>

      {selectedBookingForStaff && (
        <AssignStaffDialog
          bookingId={selectedBookingForStaff}
          currentStaffId={
            bookings?.find((b) => b.id === selectedBookingForStaff)
              ?.assigned_staff_id || null
          }
          onClose={() => setSelectedBookingForStaff(null)}
        />
      )}

      {selectedPatientId && (
        <PatientInfoDialog
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
          onOpenView={() => {}}
        />
      )}
    </div>
  );
}
