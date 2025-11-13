import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useViewAsUser } from "@/hooks/useViewAsUser";

interface AnalysisBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00"
];

export function AnalysisBookingDialog({ open, onOpenChange, onSuccess }: AnalysisBookingDialogProps) {
  const queryClient = useQueryClient();
  const { getUserId } = useViewAsUser();
  const [bookingDate, setBookingDate] = useState<Date>();
  const [bookingTime, setBookingTime] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookingId, setExistingBookingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Load existing booking when dialog opens
  useEffect(() => {
    if (open) {
      loadExistingBooking();
    }
  }, [open]);

  const loadExistingBooking = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data: bookings } = await supabase
        .from('analysis_bookings')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .order('booking_date', { ascending: false })
        .limit(1);

      if (bookings && bookings.length > 0 && bookings[0].status === 'scheduled') {
        const booking = bookings[0];
        setExistingBookingId(booking.id);
        setBookingDate(new Date(booking.booking_date));
        setBookingTime(booking.booking_time);
        setBookingAddress(booking.address);
      } else {
        setExistingBookingId(null);
        setBookingDate(undefined);
        setBookingTime("");
        setBookingAddress("");
      }
    } catch (error) {
      console.error('Error loading existing booking:', error);
    }
  };

  const isValid = bookingDate && bookingTime && bookingAddress.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || !bookingDate) return;

    setIsSubmitting(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated");

      if (existingBookingId) {
        // Update existing booking
        const { error } = await supabase
          .from('analysis_bookings')
          .update({
            booking_date: format(bookingDate, 'yyyy-MM-dd'),
            booking_time: bookingTime,
            address: bookingAddress,
            status: 'scheduled'
          } as any)
          .eq('id', existingBookingId);

        if (error) throw error;

        toast({
          title: "Запись обновлена",
          description: "Изменения сохранены",
        });
      } else {
        // Create new booking
        const { error } = await supabase
          .from('analysis_bookings')
          .insert({
            user_id: userId,
            booking_date: format(bookingDate, 'yyyy-MM-dd'),
            booking_time: bookingTime,
            address: bookingAddress,
            status: 'scheduled'
          } as any);

        if (error) throw error;

        toast({
          title: "Запись создана",
          description: "Медсестра приедет к вам в назначенное время",
        });
      }

      // Invalidate queries to refresh admin views
      await queryClient.invalidateQueries({ queryKey: ["patient-latest-booking", userId] });
      await queryClient.invalidateQueries({ queryKey: ["patient-info", userId] });
      await queryClient.invalidateQueries({ queryKey: ["scheduledBookingsCount"] });
      
      // Reset form and close dialog
      setBookingDate(undefined);
      setBookingTime("");
      setBookingAddress("");
      setExistingBookingId(null);
      onOpenChange(false);
      
      // Call success callback to refresh banner
      onSuccess?.();
    } catch (error) {
      console.error('Error saving booking:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить запись. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    if (!existingBookingId) return;

    setShowCancelConfirm(false);
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('analysis_bookings')
        .update({ status: 'not_scheduled' } as any)
        .eq('id', existingBookingId);

      if (error) throw error;

      toast({
        title: "Запись отменена",
        description: "Вы можете записаться на новую дату",
      });

      const userId = await getUserId();
      if (userId) {
        // Invalidate queries to refresh admin views
        await queryClient.invalidateQueries({ queryKey: ["patient-latest-booking", userId] });
        await queryClient.invalidateQueries({ queryKey: ["patient-info", userId] });
        await queryClient.invalidateQueries({ queryKey: ["scheduledBookingsCount"] });
      }

      // Reset form and close dialog
      setBookingDate(undefined);
      setBookingTime("");
      setBookingAddress("");
      setExistingBookingId(null);
      onOpenChange(false);
      
      // Call success callback to refresh banner
      onSuccess?.();
    } catch (error) {
      console.error('Error canceling booking:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отменить запись. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div className="bg-gradient-primary bg-clip-text text-transparent">
              Запись на анализы
            </div>
          </DialogTitle>
          <p className="text-muted-foreground text-center">
            Выберите удобное время для визита медсестры
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-4 overflow-y-auto flex-1">
          {/* Date Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Дата визита
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !bookingDate && "text-muted-foreground"
                  )}
                >
                  {bookingDate ? (
                    format(bookingDate, "d MMMM yyyy", { locale: ru })
                  ) : (
                    <span>Выберите дату</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={bookingDate}
                  onSelect={setBookingDate}
                  disabled={(date) => date < new Date() || date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Время визита
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant={bookingTime === time ? "default" : "outline"}
                  className={cn(
                    "h-12 transition-all",
                    bookingTime === time && "bg-gradient-primary shadow-neon-primary"
                  )}
                  onClick={() => setBookingTime(time)}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Адрес визита
            </Label>
            <Input
              placeholder="Введите ваш адрес"
              value={bookingAddress}
              onChange={(e) => setBookingAddress(e.target.value)}
              className="h-12"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12"
              disabled={isSubmitting}
            >
              Закрыть
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="flex-1 h-12 bg-gradient-primary shadow-neon-primary"
            >
              {isSubmitting ? (
                "Сохранение..."
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {existingBookingId ? 'Сохранить изменения' : 'Записаться'}
                </>
              )}
            </Button>
          </div>
          
          {existingBookingId && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="w-full h-12 border-destructive text-destructive hover:bg-destructive/10"
            >
              Отменить запись
            </Button>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отменить запись на визит медсестры? Вы сможете записаться на новую дату.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Не отменять</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive hover:bg-destructive/90">
              Да, отменить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
