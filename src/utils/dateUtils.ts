import { PaymentModality } from '../types';

/**
 * Returns current date in YYYY-MM-DD format for El Salvador (UTC-6)
 */
export function getElSalvadorDate(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    // Fallback if timezone not supported in certain environment
    const d = new Date();
    const utcOffset = -6 * 60; // El Salvador is UTC-6
    const localOffset = d.getTimezoneOffset();
    const svDate = new Date(d.getTime() + (localOffset - utcOffset) * 60000);
    return svDate.toISOString().split('T')[0];
  }
}

/**
 * Returns current time in HH:mm format for El Salvador (UTC-6)
 */
export function getElSalvadorTimeString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('es-SV', {
      timeZone: 'America/El_Salvador',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    return d.toTimeString().slice(0, 5);
  }
}

/**
 * Formats YYYY-MM-DD to DD/MM/YYYY for friendly Latin American display
 */
export function formatDateDisplay(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formats ISO timestamp to DD/MM/YYYY HH:mm:ss
 */
export function formatDateTimeDisplay(isoString: string | undefined): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-SV', {
      timeZone: 'America/El_Salvador',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Calculates days past due between dueDate and today (in El Salvador time)
 */
export function calculateDaysOverdue(dueDateStr: string, referenceDateStr?: string): number {
  if (!dueDateStr) return 0;
  const today = referenceDateStr || getElSalvadorDate();
  
  const due = new Date(dueDateStr + 'T00:00:00');
  const ref = new Date(today + 'T00:00:00');
  
  const diffTime = ref.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Adds N days to a YYYY-MM-DD date string
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates the next due date based on payment modality.
 * Regla de FINANCIERA AARON: en cobro diario ('diario') se cobra de lunes a lunes (consecutivo, ningún día libre).
 */
export function getNextDueDate(currentDateStr: string, modality: PaymentModality, skipSundays = false): string {
  let nextDate = addDays(currentDateStr, 1);
  
  if (modality === 'diario') {
    if (skipSundays) {
      const d = new Date(nextDate + 'T00:00:00');
      if (d.getDay() === 0) { // Sunday
        nextDate = addDays(nextDate, 1); // Move to Monday
      }
    }
    return nextDate;
  }
  
  if (modality === 'semanal') {
    return addDays(currentDateStr, 7);
  }
  
  if (modality === 'quincenal') {
    return addDays(currentDateStr, 15);
  }
  
  if (modality === 'mensual') {
    const d = new Date(currentDateStr + 'T00:00:00');
    d.setMonth(d.getMonth() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  
  return nextDate;
}

/**
 * Calculates the default first due date based on disbursement/delivery date and payment modality.
 * En cobro diario se cobra al día siguiente sin excepción (de lunes a lunes).
 */
export function calculateDefaultFirstDueDate(deliveryDateStr: string, modality: PaymentModality): string {
  if (!deliveryDateStr) return getElSalvadorDate();
  return getNextDueDate(deliveryDateStr, modality, false);
}

/**
 * Formats YYYY-MM-DD to friendly long display with day of week, e.g. "Lunes, 20/10/2026"
 */
export function formatDateWithDayDisplay(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[d.getDay()];
    return `${dayName}, ${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch {
    return formatDateDisplay(dateStr);
  }
}
