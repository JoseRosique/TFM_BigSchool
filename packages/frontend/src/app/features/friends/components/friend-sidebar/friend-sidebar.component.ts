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
  @Input() selectedListId: string | null = null;
  @Output() listSelect = new EventEmitter<string>();
  @Output() createList = new EventEmitter<void>();
  @Output() manageLists = new EventEmitter<void>();

  onListClick(listId: string): void {
    this.listSelect.emit(listId);
  }

  onCreateList(): void {
    this.createList.emit();
  }

  onManageLists(): void {
    this.manageLists.emit();
  }
}
