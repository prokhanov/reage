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
import { usePatientSlots } from "@/hooks/usePatientSlots";

interface AnalysisBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AnalysisBookingDialog({ open, onOpenChange, onSuccess }: AnalysisBookingDialogProps) {
  const queryClient = useQueryClient();
  const { getUserId } = useViewAsUser();
  const [existingSlotId, setExistingSlotId] = useState<string | null>(null);
  const { slots, isLoading: slotsLoading, hasAvailableSlots, getTimeSlotsForDate } = usePatientSlots(existingSlotId);
  
  const [bookingDate, setBookingDate] = useState<Date>();
  const [bookingTime, setBookingTime] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookingId, setExistingBookingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Get available time slots for selected date
  const availableTimeSlots = getTimeSlotsForDate(bookingDate);

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
        setExistingSlotId((booking as any).slot_id || null);
        setBookingDate(new Date(booking.booking_date));
        setBookingTime(booking.booking_time);
        setBookingAddress(booking.address);
      } else {
        setExistingBookingId(null);
        setExistingSlotId(null);
        setBookingDate(undefined);
        setBookingTime("");
        setSelectedSlotId("");
        setBookingAddress("");
      }
    } catch (error) {
      console.error('Error loading existing booking:', error);
    }
  };

  const isValid = bookingDate && bookingTime && selectedSlotId && bookingAddress.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || !bookingDate || !selectedSlotId) return;

    setIsSubmitting(true);
    try {
      const userId = await getUserId();
      if (!userId) throw new Error("User not authenticated");

      // If updating and slot changed, cancel old slot first
      if (existingBookingId && existingSlotId && existingSlotId !== selectedSlotId) {
        const { data: cancelResult } = await supabase.rpc('cancel_booking' as any, { 
          p_slot_id: existingSlotId 
        }) as any;
        
        if (!cancelResult?.success) {
          throw new Error(cancelResult?.error || 'Failed to cancel old slot');
        }
      }

      // Book the slot (only if new booking or slot changed)
      if (!existingBookingId || existingSlotId !== selectedSlotId) {
        // Pass date and time_slot for virtual slots that don't exist yet
        const { data: bookResult } = await supabase.rpc('book_analysis_slot' as any, { 
          p_slot_id: selectedSlotId,
          p_date: format(bookingDate, 'yyyy-MM-dd'),
          p_time_slot: bookingTime
        }) as any;
        
        if (!bookResult?.success) {
          throw new Error(bookResult?.error || 'Слот уже занят. Выберите другое время.');
        }
        
        // Use the real slot_id from the booking result
        const realSlotId = bookResult.slot_id;
        
        if (existingBookingId) {
          // Update existing booking with new slot
          const { error } = await supabase
            .from('analysis_bookings')
            .update({
              booking_date: format(bookingDate, 'yyyy-MM-dd'),
              booking_time: bookingTime,
              address: bookingAddress,
              slot_id: realSlotId,
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
              slot_id: realSlotId,
              status: 'scheduled'
            } as any);

          if (error) throw error;

          toast({
            title: "Запись создана",
            description: "Медсестра приедет к вам в назначенное время",
          });
        }
        
        // Invalidate queries to refresh views
        await queryClient.invalidateQueries({ queryKey: ["patient-latest-booking", userId] });
        await queryClient.invalidateQueries({ queryKey: ["patient-info", userId] });
        await queryClient.invalidateQueries({ queryKey: ["scheduledBookingsCount"] });
        await queryClient.invalidateQueries({ queryKey: ["patient-available-slots"] });
        await queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
        await queryClient.invalidateQueries({ queryKey: ["analysis-bookings"] });
        
        // Reset form and close dialog
        setBookingDate(undefined);
        setBookingTime("");
        setSelectedSlotId("");
        setBookingAddress("");
        setExistingBookingId(null);
        setExistingSlotId(null);
        onOpenChange(false);
        
        // Call success callback to refresh banner
        onSuccess?.();
        return;
      }

      // This block handles when the slot didn't change (only address update)
      // Update existing booking with same slot
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

      // Invalidate queries to refresh views
      await queryClient.invalidateQueries({ queryKey: ["patient-latest-booking", userId] });
      await queryClient.invalidateQueries({ queryKey: ["patient-info", userId] });
      await queryClient.invalidateQueries({ queryKey: ["scheduledBookingsCount"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-available-slots"] });
      await queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
      await queryClient.invalidateQueries({ queryKey: ["analysis-bookings"] });
      
      // Reset form and close dialog
      setBookingDate(undefined);
      setBookingTime("");
      setSelectedSlotId("");
      setBookingAddress("");
      setExistingBookingId(null);
      setExistingSlotId(null);
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
      // Cancel slot booking if exists
      if (existingSlotId) {
        const { data: cancelResult } = await supabase.rpc('cancel_booking' as any, { 
          p_slot_id: existingSlotId 
        }) as any;
        
        if (!cancelResult?.success) {
          console.error('Failed to cancel slot:', cancelResult?.error);
        }
      }

      const { error } = await supabase
        .from('analysis_bookings')
        .update({ status: 'not_scheduled', slot_id: null } as any)
        .eq('id', existingBookingId);

      if (error) throw error;

      toast({
        title: "Запись отменена",
        description: "Вы можете записаться на новую дату",
      });

      const userId = await getUserId();
      if (userId) {
        // Invalidate queries to refresh views
        await queryClient.invalidateQueries({ queryKey: ["patient-latest-booking", userId] });
        await queryClient.invalidateQueries({ queryKey: ["patient-info", userId] });
        await queryClient.invalidateQueries({ queryKey: ["scheduledBookingsCount"] });
        await queryClient.invalidateQueries({ queryKey: ["patient-available-slots"] });
        await queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
        await queryClient.invalidateQueries({ queryKey: ["analysis-bookings"] });
      }

      // Reset form and close dialog
      setBookingDate(undefined);
      setBookingTime("");
      setSelectedSlotId("");
      setBookingAddress("");
      setExistingBookingId(null);
      setExistingSlotId(null);
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
                  onSelect={(date) => {
                    setBookingDate(date);
                    setBookingTime("");
                    setSelectedSlotId("");
                  }}
                  disabled={(date) => {
                    // Disable past dates
                    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                    // Disable dates beyond 2 months
                    if (date > new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)) return true;
                    // Disable dates without available slots
                    return !hasAvailableSlots(date);
                  }}
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
            {!bookingDate ? (
              <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                Выберите дату, чтобы увидеть доступное время
              </div>
            ) : availableTimeSlots.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                На выбранную дату нет доступных слотов
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableTimeSlots.map((slot) => (
                  <Button
                    key={slot.slotId}
                    type="button"
                    variant={bookingTime === slot.time ? "default" : "outline"}
                    className={cn(
                      "h-12 transition-all relative",
                      bookingTime === slot.time && "bg-gradient-primary shadow-neon-primary",
                      !slot.isAvailable && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!slot.isAvailable}
                    onClick={() => {
                      if (slot.isAvailable) {
                        setBookingTime(slot.time);
                        setSelectedSlotId(slot.slotId);
                      }
                    }}
                  >
                    <span>{slot.time}</span>
                  </Button>
                ))}
              </div>
            )}
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
              variant="ghost"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="w-full h-12 text-destructive hover:bg-destructive/10"
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
