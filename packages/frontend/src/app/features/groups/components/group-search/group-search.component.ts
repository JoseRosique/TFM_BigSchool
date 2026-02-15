import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-group-search',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './group-search.component.html',
  styleUrls: ['./group-search.component.scss'],
})
export class GroupSearchComponent {
  @Input() value = '';
  @Output() search = new EventEmitter<string>();

  onSearchChange(value: string): void {
    this.search.emit(value);
  }
}
