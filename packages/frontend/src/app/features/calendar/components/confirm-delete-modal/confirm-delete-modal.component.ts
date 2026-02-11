import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './confirm-delete-modal.component.html',
  styleUrl: './confirm-delete-modal.component.scss',
})
export class ConfirmDeleteModalComponent {
  isProcessing = input<boolean>(false);

  close = output<void>();
  confirm = output<void>();

  onOverlayClick(): void {
    this.close.emit();
  }

  onClose(): void {
    this.close.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }
}
