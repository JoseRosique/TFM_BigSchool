import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Friend } from '../../services/friends.service';

type TabType = 'search' | 'all' | 'pending' | 'blocked';

type FriendActionType = 'add' | 'accept' | 'reject' | 'message' | 'calendar' | 'delete' | 'unblock';

interface FriendAction {
  type: FriendActionType;
  friend: Friend;
}

@Component({
  selector: 'app-friend-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './friend-list.component.html',
  styleUrls: ['./friend-list.component.scss'],
})
export class FriendListComponent {
  @Input() activeTab: TabType = 'search';
  @Input() friends: Friend[] = [];
  @Input() searchQuery = '';
  @Input() isLoading = false;
  @Input() errorKey: string | null = null;
  @Input() loadingFriendIds: Set<string> = new Set();
  @Output() search = new EventEmitter<string>();
  @Output() action = new EventEmitter<FriendAction>();

  private readonly groupColorMap: Record<string, string> = {
    pink: '#ec64bf',
    blue: '#6490ff',
    orange: '#ffad5e',
    purple: '#8b5cf6',
    green: '#22c55e',
    teal: '#14b8a6',
  };

  onSearchChange(value: string): void {
    this.search.emit(value);
  }

  emitAction(type: FriendActionType, friend: Friend, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.action.emit({ type, friend });
  }

  isFriendLoading(friendId: string): boolean {
    return this.loadingFriendIds.has(friendId);
  }

  /**
   * Convert hex color to dynamic badge styles
   * Example: #ec64bf → { backgroundColor: 'rgba(236, 100, 191, 0.15)', color: '#ec64bf' }
   */
  getGroupBadgeStyles(hexColor: string): { [key: string]: string } {
    if (!hexColor) {
      return {};
    }

    const normalized = hexColor.startsWith('#')
      ? hexColor
      : this.groupColorMap[hexColor.toLowerCase()];

    if (!normalized) {
      return {};
    }

    const hex = normalized.replace('#', '');
    if (hex.length !== 6) {
      return {};
    }

    // Convert hex to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
      color: normalized,
    };
  }
}
