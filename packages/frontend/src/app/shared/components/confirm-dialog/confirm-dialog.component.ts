import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  title = input<string>('');
  message = input<string>('');
  confirmLabel = input<string>('GROUPS_MANAGEMENT.MODAL.CONFIRM');
  cancelLabel = input<string>('GROUPS_MANAGEMENT.MODAL.CANCEL');
  isDestructive = input<boolean>(false);
  isProcessing = input<boolean>(false);

  close = output<void>();
  confirm = output<void>();

  // Generate stable unique ID for accessibility attributes
  private readonly dialogId = `dialog-${crypto.randomUUID()}`;
  readonly titleId = `${this.dialogId}-title`;
  readonly descId = `${this.dialogId}-description`;

  onOverlayClick(): void {
    if (!this.isProcessing()) {
      this.close.emit();
    }
  }

  onClose(): void {
    if (!this.isProcessing()) {
      this.close.emit();
    }
  }

  onConfirm(): void {
    if (!this.isProcessing()) {
      this.confirm.emit();
    }
  }
}
