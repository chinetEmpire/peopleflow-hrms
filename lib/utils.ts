import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const WORK_DAY_MS = 8 * 60 * 60 * 1000;
export const MAX_OPEN_RECORD_MS = 24 * 60 * 60 * 1000;

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function attendanceDurationMs(checkIn: string, checkOut?: string | null) {
  const start = new Date(checkIn).getTime();
  const end = checkOut ? new Date(checkOut).getTime() : Date.now();
  return Math.max(0, end - start);
}

export function attendanceStatusFromDuration(checkIn: string, checkOut: string) {
  const duration = attendanceDurationMs(checkIn, checkOut);
  return duration >= WORK_DAY_MS ? 'present' : 'half_day';
}

export function shouldAutoCheckout(checkIn: string, checkOut?: string | null) {
  if (checkOut) return false;
  return attendanceDurationMs(checkIn) >= MAX_OPEN_RECORD_MS;
}

export function getAutoCheckoutTime(checkIn: string) {
  return new Date(new Date(checkIn).getTime() + MAX_OPEN_RECORD_MS).toISOString();
}
