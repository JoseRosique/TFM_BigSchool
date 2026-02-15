import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  params?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private toastIdCounter = 0;

  show(
    message: string,
    type: ToastType = 'info',
    duration: number = 3000,
    params?: Record<string, unknown>,
  ): void {
    const effectiveDuration = duration ?? 3000;
    const id = `toast-${++this.toastIdCounter}`;
    const toast: Toast = { id, message, type, duration: effectiveDuration, params };

    this.toasts.update((toasts) => [...toasts, toast]);

    if (effectiveDuration > 0) {
      setTimeout(() => this.remove(id), effectiveDuration);
    }
  }

  success(message: string, duration?: number, params?: Record<string, unknown>): void {
    this.show(message, 'success', duration, params);
  }

  error(message: string, duration?: number, params?: Record<string, unknown>): void {
    this.show(message, 'error', duration, params);
  }

  info(message: string, duration?: number, params?: Record<string, unknown>): void {
    this.show(message, 'info', duration, params);
  }

  warning(message: string, duration?: number, params?: Record<string, unknown>): void {
    this.show(message, 'warning', duration, params);
  }

  remove(id: string): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
