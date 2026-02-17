import { Component, output, inject, input, effect, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SlotStatus, ReservationStatus } from '@meetwithfriends/shared';
import { CalendarSlot, ReservationItem } from '../../calendar.types';
import { UiModalService } from '../../services/ui-modal.service';

@Component({
  selector: 'app-explore-slots-day-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    @if (isOpen()) {
      <div class="modal-overlay" (click)="onClose()">
        <div
          class="modal-content"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
        >
          <header class="modal-header">
            <h2 class="modal-title">{{ dateStr() }}</h2>
            <button class="modal-close" type="button" aria-label="Close" (click)="onClose()">
              ✕
            </button>
          </header>

          <div class="modal-body">
            @if (slots().length === 0) {
              <p class="empty-state">
                {{ 'CALENDAR_PAGE.NO_SLOTS' | translate }}
              </p>
            } @else {
              <div class="slots-list">
                @for (slot of slots(); track slot.id) {
                  <div
                    class="slot-card"
                    [class.slot-card--available]="slot.status === slotStatus.AVAILABLE"
                    [class.slot-card--reserved]="slot.status === slotStatus.RESERVED"
                  >
                    <div class="slot-card__header">
                      <span class="slot-time">
                        {{ formatTimeRange(slot) }}
                      </span>
                      @if (slot.ownerId === currentUserId()) {
                        <span class="badge badge--mine">
                          {{ 'CALENDAR_PAGE.MY_SLOT' | translate }}
                        </span>
                      }
                    </div>

                    <div class="slot-card__body">
                      @if (slot.ownerId !== currentUserId()) {
                        <p class="slot-creator">
                          <strong>{{ 'CALENDAR_PAGE.CREATED_BY' | translate }}:</strong>
                          {{ getOwnerDisplayName(slot) }}
                        </p>
                      }
                      @if (slot.notes) {
                        <p class="slot-notes">
                          <strong>{{ 'CALENDAR_PAGE.NOTES' | translate }}:</strong>
                          {{ slot.notes }}
                        </p>
                      }
                    </div>

                    <div class="slot-card__actions">
                      @if (slot.ownerId === currentUserId()) {
                        <span class="action-info">
                          {{ 'CALENDAR_PAGE.OTHER_CAN_RESERVE' | translate }}
                        </span>
                      } @else if (slot.status === slotStatus.AVAILABLE) {
                        <button
                          class="btn btn--primary"
                          type="button"
                          [disabled]="processingSlotId() === slot.id"
                          (click)="onReserve(slot)"
                        >
                          {{ 'CALENDAR_PAGE.RESERVE' | translate }}
                        </button>
                      } @else if (slot.status === slotStatus.RESERVED) {
                        @if (isUserReservation(slot)) {
                          <button
                            class="btn btn--secondary"
                            type="button"
                            [disabled]="processingSlotId() === slot.id"
                            (click)="onCancelReservation(slot)"
                          >
                            {{ 'CALENDAR_PAGE.CANCEL_RESERVATION' | translate }}
                          </button>
                        } @else {
                          <span class="action-info unavailable">
                            {{ 'CALENDAR_PAGE.UNAVAILABLE' | translate }}
                          </span>
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .modal-close:hover {
      background: #f3f4f6;
    }

    .modal-body {
      overflow-y: auto;
      flex: 1;
      padding: 20px;
    }

    .empty-state {
      text-align: center;
      color: #6b7280;
      padding: 40px 20px;
    }

    .slots-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .slot-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 16px;
      transition: all 0.2s;
    }

    .slot-card--available {
      border-color: #10b981;
      background: #f0fdf4;
    }

    .slot-card--reserved {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .slot-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .slot-time {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    }

    .badge {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      background: #dbeafe;
      color: #0c4a6e;
    }

    .badge--mine {
      background: #dbeafe;
    }

    .slot-card__body {
      margin-bottom: 12px;
    }

    .slot-creator,
    .slot-notes {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #4b5563;
      line-height: 1.5;
    }

    .slot-notes {
      margin: 8px 0 0 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .slot-card__actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn--primary {
      background: #10b981;
      color: white;
    }

    .btn--primary:hover:not(:disabled) {
      background: #059669;
    }

    .btn--secondary {
      background: #ef4444;
      color: white;
    }

    .btn--secondary:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .action-info {
      font-size: 13px;
      padding: 8px 0;
      color: #6b7280;
    }

    .action-info.unavailable {
      color: #ef4444;
      font-weight: 500;
    }
  `,
})
export class ExploreSlotsDayModalComponent {
  private readonly uiModalService = inject(UiModalService);
  private readonly translateService = inject(TranslateService);

  slotStatus = SlotStatus;

  currentUserId = input<string | null>(null);
  reservations = input<ReservationItem[]>([]);
  processingSlotId = input<string | null>(null);

  reserve = output<CalendarSlot>();
  cancelReservation = output<string>();
  close = output<void>();

  isOpen = computed(() => this.uiModalService.dayModalState().isOpen);
  slots = computed(() => this.uiModalService.dayModalState().slots);
  dateStr = computed(() => this.uiModalService.dayModalState().dateStr);

  formatTimeRange(slot: CalendarSlot): string {
    const locale = this.translateService.currentLang || 'es-ES';
    const start = slot.startDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: slot.timezone,
    });
    const end = slot.endDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: slot.timezone,
    });
    return `${start} - ${end}`;
  }

  isUserReservation(slot: CalendarSlot): boolean {
    if (slot.status !== SlotStatus.RESERVED) return false;
    return this.reservations().some(
      (res) =>
        res.slotId === slot.id &&
        res.status === ReservationStatus.CREATED &&
        res.userId === this.currentUserId(),
    );
  }

  getOwnerDisplayName(slot: CalendarSlot): string {
    // TypeScript doesn't know about owner from backend join, so we use 'any' cast
    const slotWithOwner = slot as any;
    if (slotWithOwner.owner?.name) {
      return slotWithOwner.owner.name;
    }
    if (slotWithOwner.owner?.nickname) {
      return slotWithOwner.owner.nickname;
    }
    return slot.ownerId;
  }

  onReserve(slot: CalendarSlot): void {
    this.reserve.emit(slot);
  }

  onCancelReservation(slot: CalendarSlot): void {
    // Find the reservation ID for this slot
    const reservation = this.reservations().find(
      (res) =>
        res.slotId === slot.id &&
        res.status === ReservationStatus.CREATED &&
        res.userId === this.currentUserId(),
    );
    if (reservation) {
      this.cancelReservation.emit(reservation.id);
    } else {
      console.warn(
        `[ExploreSlotsDayModal] Could not find active reservation for slot ${slot.id} and user ${this.currentUserId()}`,
      );
    }
  }

  onClose(): void {
    this.uiModalService.closeDayModal();
    this.close.emit();
  }

  @HostListener('keydown.escape')
  onEscapeKey(): void {
    this.onClose();
  }
}
