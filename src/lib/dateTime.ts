const pad = (value: number) => value.toString().padStart(2, '0');

export const getCurrentTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const toLocalDateString = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toLocalTimeString = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const toLocalDateTimeLabel = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));

export const toWeekdayDateLabel = (dateString: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${dateString}T12:00:00`));

export const toWeekRangeLabel = (weekStartDate: string, weekEndDate: string) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return `${formatter.format(new Date(`${weekStartDate}T12:00:00`))} - ${formatter.format(
    new Date(`${weekEndDate}T12:00:00`),
  )}`;
};

export const startOfWeek = (date: Date) => {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  clone.setDate(clone.getDate() + diff);
  clone.setHours(12, 0, 0, 0);
  return clone;
};

export const addDays = (date: Date, days: number) => {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
};

export const addWeeks = (date: Date, weeks: number) => addDays(date, weeks * 7);

export const toDateInputValue = (date: Date) => toLocalDateString(date);
