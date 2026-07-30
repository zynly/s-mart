import { format } from 'date-fns'
import { id } from 'date-fns/locale'

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value
}

export function formatDate(value: string | Date): string {
  return format(toDate(value), 'd MMM yyyy', { locale: id })
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), 'd MMM yyyy HH:mm', { locale: id })
}

export function formatTime(value: string | Date): string {
  return format(toDate(value), 'HH:mm', { locale: id })
}
