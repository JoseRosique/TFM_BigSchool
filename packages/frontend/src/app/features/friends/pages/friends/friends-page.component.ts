import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  skip,
  Subject,
  switchMap,
  catchError,
  finalize,
  tap,
} from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FriendTabsComponent } from '../../components/friend-tabs/friend-tabs.component';
import { FriendListComponent } from '../../components/friend-list/friend-list.component';
import { FriendSidebarComponent } from '../../components/friend-sidebar/friend-sidebar.component';
import { FriendsService, Friend } from '../../services/friends.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { GroupsService } from '../../../../shared/services/groups.service';
import { Group } from '../../../../shared/models/group.model';

type TabType = 'search' | 'all' | 'pending' | 'blocked';

type FriendActionType = 'add' | 'accept' | 'reject' | 'message' | 'calendar' | 'delete' | 'unblock';

interface FriendAction {
  type: FriendActionType;
  friend: Friend;
}

interface TabItem {
  id: TabType;
  label: string;
  count: number;
}

@Component({
  selector: 'app-friends-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FriendTabsComponent,
    FriendListComponent,
    FriendSidebarComponent,
  ],
  templateUrl: './friends-page.component.html',
  styleUrls: ['./friends-page.component.scss'],
})
export class FriendsPageComponent {
  private readonly friendsService = inject(FriendsService);
  private readonly groupsService = inject(GroupsService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchQuery$ = new Subject<string>();

  activeTab = signal<TabType>('search');
  searchQuery = signal<string>('');
  selectedList = signal<string | null>(null);
  tabFriends = signal<Friend[]>([]);
  searchResults = signal<Friend[]>([]);
  friendLists = computed(() => this.mapGroupsToLists(this.groupsService.groups()));
  isLoading = signal<boolean>(false);
  errorKey = signal<string | null>(null);
  loadingFriendIds = signal<Set<string>>(new Set());

  private friendsCount = signal<number>(0);
  private pendingCount = signal<number>(0);
  private blockedCount = signal<number>(0);

  tabs = computed<TabItem[]>(() => [
    { id: 'search', label: 'FRIENDS_PAGE.TABS.SEARCH', count: this.searchResults().length },
    { id: 'all', label: 'FRIENDS_PAGE.TABS.ALL', count: this.friendsCount() },
    { id: 'pending', label: 'FRIENDS_PAGE.TABS.PENDING', count: this.pendingCount() },
    { id: 'blocked', label: 'FRIENDS_PAGE.TABS.BLOCKED', count: this.blockedCount() },
  ]);

  visibleFriends = computed<Friend[]>(() => {
    const tab = this.activeTab();
    const query = this.searchQuery().trim().toLowerCase();
    const base = tab === 'search' ? this.searchResults() : this.tabFriends();
    if (!query || tab === 'search') {
      return base;
    }
    return base.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) || friend.username.toLowerCase().includes(query),
    );
  });

  constructor() {
    this.loadInitialData();
    this.bindTabChanges();
    this.bindSearch();
    this.bindGroupUpdates();
  }

  private loadInitialData(): void {
    this.isLoading.set(true);
    forkJoin({
      friends: this.friendsService.getFriends().pipe(
        catchError((error) => {
          this.toastService.error(this.resolveErrorKey(error));
          return of([] as Friend[]);
        }),
      ),
      pending: this.friendsService.getPendingRequests().pipe(
        catchError((error) => {
          this.toastService.error(this.resolveErrorKey(error));
          return of([] as Friend[]);
        }),
      ),
      blocked: this.friendsService.getBlockedUsers().pipe(
        catchError((error) => {
          this.toastService.error(this.resolveErrorKey(error));
          return of([] as Friend[]);
        }),
      ),
      groups: this.groupsService.loadGroups().pipe(
        catchError((error) => {
          this.toastService.error(this.resolveErrorKey(error));
          return of([] as Group[]);
        }),
      ),
    })
      .pipe(
        shareReplay(1),
        tap(({ friends, pending, blocked }) => {
          this.friendsCount.set(friends.length);
          this.pendingCount.set(pending.length);
          this.blockedCount.set(blocked.length);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  selectTab(tabId: TabType): void {
    this.activeTab.set(tabId);
    this.searchQuery.set('');
    this.errorKey.set(null);
    if (tabId === 'search') {
      this.searchResults.set([]);
    }
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    if (this.activeTab() === 'search') {
      this.searchQuery$.next(query);
    }
  }

  handleListAction(action: FriendAction): void {
    switch (action.type) {
      case 'add':
        this.runAction(this.friendsService.sendFriendRequest(action.friend.id), {
          successKey: 'FRIENDS_PAGE.TOASTS.REQUEST_SENT',
          refreshTabs: ['search'],
        });
        break;
      case 'accept':
        this.runAction(this.friendsService.acceptRequest(this.getRequestId(action.friend)), {
          successKey: 'FRIENDS_PAGE.TOASTS.REQUEST_ACCEPTED',
          refreshTabs: ['all', 'pending'],
        });
        break;
      case 'reject':
        this.runAction(this.friendsService.declineRequest(this.getRequestId(action.friend)), {
          successKey: 'FRIENDS_PAGE.TOASTS.REQUEST_DECLINED',
          refreshTabs: ['pending'],
        });
        break;
      case 'message':
        this.onMessageFriend(action.friend);
        break;
      case 'calendar':
        this.onViewCalendar(action.friend);
        break;
      case 'delete':
        this.runAction(this.friendsService.removeFriend(action.friend.id), {
          successKey: 'FRIENDS_PAGE.TOASTS.FRIEND_REMOVED',
          refreshTabs: ['all'],
        });
        break;
      case 'unblock':
        this.runAction(this.friendsService.unblockUser(action.friend.id), {
          successKey: 'FRIENDS_PAGE.TOASTS.USER_UNBLOCKED',
          refreshTabs: ['blocked'],
        });
        break;
    }
  }

  selectFriendList(listId: string): void {
    this.selectedList.set(this.selectedList() === listId ? null : listId);
  }

  onCreateNewList(): void {
    console.log('Create new list clicked');
    // TODO: Implement create list modal
  }

  onManageLists(): void {
    console.log('Manage lists clicked');
    // TODO: Implement manage lists modal
  }

  private bindTabChanges(): void {
    toObservable(this.activeTab)
      .pipe(
        skip(1), // Ignorar emisión inicial para no duplicar carga
        distinctUntilChanged(), // Evitar cambios innecesarios
        switchMap((tab) => {
          this.errorKey.set(null);
          if (tab === 'search') {
            this.isLoading.set(false);
            return of({ tab, friends: [] as Friend[] });
          }
          this.isLoading.set(true);
          return this.fetchTab(tab).pipe(
            map((friends) => ({ tab, friends })),
            catchError(() => {
              this.errorKey.set('ERROR.UNKNOWN');
              return of({ tab, friends: [] as Friend[] });
            }),
            finalize(() => this.isLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ tab, friends }) => {
        if (tab !== 'search') {
          this.tabFriends.set(friends);
          this.updateTabCount(tab, friends.length);
        }
      });
  }

  private bindSearch(): void {
    this.searchQuery$
      .pipe(
        map((query) => query.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          this.errorKey.set(null);
          if (!query) {
            this.searchResults.set([]);
            this.updateTabCount('search', 0);
            this.isLoading.set(false);
            return of([] as Friend[]);
          }
          this.isLoading.set(true);
          return this.friendsService.searchUsers(query).pipe(
            catchError((error) => {
              this.toastService.error(this.resolveErrorKey(error));
              return of([] as Friend[]);
            }),
            finalize(() => this.isLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.searchResults.set(results);
        this.updateTabCount('search', results.length);
      });
  }

  private bindGroupUpdates(): void {
    this.groupsService
      .onGroupUpdated()
      .pipe(
        tap(() => {
          // Show loading state on all friends while reloading
          this.loadingFriendIds.set(new Set(this.tabFriends().map((f) => f.id)));
        }),
        // Reload friends list when a group is updated
        // This ensures that friend group assignments are reflected immediately
        switchMap(() => this.refreshTabs(['all', 'pending'])),
        finalize(() => {
          // Clear loading state after reload completes or fails
          this.loadingFriendIds.set(new Set());
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private fetchTab(tab: TabType): Observable<Friend[]> {
    switch (tab) {
      case 'pending':
        return this.friendsService.getPendingRequests();
      case 'blocked':
        return this.friendsService.getBlockedUsers();
      default:
        return this.friendsService.getFriends();
    }
  }

  private refreshTabs(tabs: TabType[]): Observable<void> {
    const uniqueTabs = Array.from(new Set(tabs));
    const dataTabs = uniqueTabs.filter((tab) => tab !== 'search');

    if (uniqueTabs.includes('search')) {
      const query = this.searchQuery().trim();
      if (query) {
        this.searchQuery$.next(query);
      } else {
        this.searchResults.set([]);
        this.updateTabCount('search', 0);
      }
    }

    if (dataTabs.length === 0) {
      return of(void 0);
    }

    const requests = dataTabs.map((tab) =>
      this.fetchTab(tab).pipe(
        tap((friends) => {
          if (tab === this.activeTab()) {
            this.tabFriends.set(friends);
          }
          this.updateTabCount(tab, friends.length);
        }),
      ),
    );

    return forkJoin(requests).pipe(map(() => void 0));
  }

  private runAction(
    request$: Observable<void>,
    options: { successKey: string; refreshTabs: TabType[] },
  ): void {
    this.isLoading.set(true);
    this.errorKey.set(null);
    request$
      .pipe(
        tap(() => this.toastService.success(options.successKey)),
        switchMap(() => this.refreshTabs(options.refreshTabs)),
        catchError((error) => {
          this.toastService.error(this.resolveErrorKey(error));
          return of(void 0);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private loadGroups(): void {
    this.groupsService
      .loadGroups()
      .pipe(
        catchError((error) => {
          this.toastService.error(this.resolveErrorKey(error));
          return of([] as Group[]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private updateTabCount(tab: TabType, count: number): void {
    switch (tab) {
      case 'all':
        this.friendsCount.set(count);
        break;
      case 'pending':
        this.pendingCount.set(count);
        break;
      case 'blocked':
        this.blockedCount.set(count);
        break;
      case 'search':
        break;
    }
  }

  private getRequestId(friend: Friend): string {
    return friend.requestId ?? friend.id;
  }

  private mapGroupsToLists(groups: Group[]) {
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      count: group.memberCount ?? group.members.length,
      icon: group.icon,
      color: group.color,
    }));
  }

  private resolveErrorKey(error: unknown): string {
    const fallback = 'FRIENDS_PAGE.TOASTS.ERROR_GENERIC';
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const rawMessage = (error as any).error?.message ?? (error as any).message;
    if (Array.isArray(rawMessage)) {
      return rawMessage[0] ?? fallback;
    }
    if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
      return rawMessage;
    }
    return fallback;
  }

  private onMessageFriend(friend: Friend): void {
    console.log('Message friend:', friend.name);
    // TODO: Implement messaging
  }

  private onViewCalendar(friend: Friend): void {
    console.log('View calendar of:', friend.name);
    // TODO: Implement view calendar navigation
  }
}
