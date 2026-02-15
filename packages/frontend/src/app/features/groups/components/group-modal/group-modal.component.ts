import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { GroupMember } from '../../../../shared/models/group.model';

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './group-modal.component.html',
  styleUrls: ['./group-modal.component.scss'],
})
export class GroupModalComponent {
  @Input() isOpen = false;
  @Input() mode: ModalMode = 'create';
  @Input() name = '';
  @Input() description = '';
  @Input() icon = '';
  @Input() color = '';
  @Input() iconOptions: string[] = [];
  @Input() colorOptions: string[] = [];
  @Input() availableFriends: GroupMember[] = [];
  @Input() selectedMembers: GroupMember[] = [];
  @Input() searchQuery = '';
  @Input() isSaving = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() changeName = new EventEmitter<string>();
  @Output() changeDescription = new EventEmitter<string>();
  @Output() changeIcon = new EventEmitter<string>();
  @Output() changeColor = new EventEmitter<string>();
  @Output() searchFriends = new EventEmitter<string>();
  @Output() toggleMember = new EventEmitter<GroupMember>();

  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    this.save.emit();
  }
}
