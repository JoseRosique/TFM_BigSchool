import { Component, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AvatarService } from '../../services/avatar.service';

@Component({
  selector: 'app-avatar-selector-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './avatar-selector-modal.component.html',
  styleUrl: './avatar-selector-modal.component.scss',
})
export class AvatarSelectorModalComponent implements OnInit {
  private readonly avatarService = inject(AvatarService);

  avatars = signal<string[]>([]);
  selectedAvatar = signal<string | null>(null);
  currentAvatar = input<string | null>(null);

  onClose = output<void>();
  onSave = output<string>();

  private readonly syncSelection = effect(() => {
    const current = this.currentAvatar();
    const available = this.avatars();
    if (!current || !available.length || this.selectedAvatar()) return;
    if (available.includes(current)) {
      this.selectedAvatar.set(current);
    }
  });

  ngOnInit(): void {
    this.loadAvatars();
  }

  loadAvatars(): void {
    this.avatarService.getAvailableAvatars().subscribe({
      next: (response) => {
        this.avatars.set(response.avatars);
      },
      error: (error) => {
        console.error('Error loading avatars:', error);
      },
    });
  }

  selectAvatar(avatar: string): void {
    this.selectedAvatar.set(avatar);
  }

  save(): void {
    const selected = this.selectedAvatar();
    if (selected) {
      this.onSave.emit(selected);
    }
  }

  cancel(): void {
    this.onClose.emit();
  }

  isSelected(avatar: string): boolean {
    return this.selectedAvatar() === avatar;
  }
}
