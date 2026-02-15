import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

type TabType = 'search' | 'all' | 'pending' | 'blocked';

interface TabItem {
  id: TabType;
  label: string;
  count: number;
}

@Component({
  selector: 'app-friend-tabs',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './friend-tabs.component.html',
  styleUrls: ['./friend-tabs.component.scss'],
})
export class FriendTabsComponent {
  @Input() tabs: TabItem[] = [];
  @Input() activeTab: TabType = 'search';
  @Output() tabChange = new EventEmitter<TabType>();

  onTabClick(tabId: TabType): void {
    this.tabChange.emit(tabId);
  }
}
