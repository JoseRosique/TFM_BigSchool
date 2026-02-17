import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface FriendList {
  id: string;
  name: string;
  count: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-friend-sidebar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './friend-sidebar.component.html',
  styleUrls: ['./friend-sidebar.component.scss'],
})
export class FriendSidebarComponent {
  @Input() lists: FriendList[] = [];
  @Input() selectedListIds: string[] = [];
  @Output() listSelect = new EventEmitter<string>();
  @Output() manageLists = new EventEmitter<void>();

  onListClick(listId: string): void {
    this.listSelect.emit(listId);
  }

  onManageLists(): void {
    this.manageLists.emit();
  }
}
