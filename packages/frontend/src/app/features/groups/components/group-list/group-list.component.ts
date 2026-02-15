import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Group } from '../../../../shared/models/group.model';

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './group-list.component.html',
  styleUrls: ['./group-list.component.scss'],
})
export class GroupListComponent {
  @Input() groups: Group[] = [];
  @Input() isLoading = false;
  @Input() errorKey: string | null = null;
  @Output() edit = new EventEmitter<Group>();

  onEdit(group: Group): void {
    this.edit.emit(group);
  }
}
