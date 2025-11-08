/**
 * Formats a date string into a localized Russian format
 * Returns "Сегодня", "Вчера", or "dd.mm.yyyy"
 */
export function formatChatDate(date: string): string {
  const chatDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time for date-only comparison
  chatDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  
  if (chatDate.getTime() === today.getTime()) {
    return "Сегодня";
  } else if (chatDate.getTime() === yesterday.getTime()) {
    return "Вчера";
  } else {
    return chatDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
