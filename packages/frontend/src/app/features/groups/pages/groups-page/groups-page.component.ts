import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  switchMap,
  catchError,
  finalize,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupSearchComponent } from '../../components/group-search/group-search.component';
import { GroupListComponent } from '../../components/group-list/group-list.component';
import { GroupModalComponent } from '../../components/group-modal/group-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { GroupsService } from '../../../../shared/services/groups.service';
import { Group, GroupMember } from '../../../../shared/models/group.model';
import { FriendsService, Friend } from '../../../friends/services/friends.service';
import { ToastService } from '../../../../shared/services/toast.service';

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-groups-page',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    GroupSearchComponent,
    GroupListComponent,
    GroupModalComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './groups-page.component.html',
  styleUrls: ['./groups-page.component.scss'],
})
export class GroupsPageComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly friendsService = inject(FriendsService);
  private readonly toastService = inject(ToastService);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly search$ = new Subject<string>();
  groups = computed(() => this.groupsService.groups());
  searchQuery = signal('');
  isLoading = signal(false);
  errorKey = signal<string | null>(null);

  isModalOpen = signal(false);
  modalMode = signal<ModalMode>('create');
  isSaving = signal(false);
  editingGroupId = signal<string | null>(null);

  formName = signal('');
  formDescription = signal('');
  formIcon = signal('group');
  formColor = signal('blue');

  iconOptions = ['group', 'diversity_3', 'workspaces', 'school', 'sports_soccer', 'favorite'];
  colorOptions = ['blue', 'pink', 'orange', 'purple', 'green', 'teal'];

  selectedMembers = signal<GroupMember[]>([]);
  originalMemberIds = signal<string[]>([]);
  availableFriends = signal<GroupMember[]>([]);
  memberSearchQuery = signal('');
  private allFriendsCache = signal<GroupMember[] | null>(null);

  isConfirmDialogOpen = signal(false);
  groupToDelete = signal<Group | null>(null);
  isDeleting = signal(false);

  constructor() {
    this.loadGroups();
    this.bindSearch();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.search$.next(query);
  }

  openCreateModal(): void {
    this.modalMode.set('create');
    this.editingGroupId.set(null);
    this.resetForm();
    this.selectedMembers.set([]);
    this.originalMemberIds.set([]);
    this.isModalOpen.set(true);
    this.memberSearchQuery.set('');
    this.loadFriendsForCreate('').pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  openEditModal(group: Group): void {
    this.modalMode.set('edit');
    this.editingGroupId.set(group.id);
    this.formName.set(group.name);
    this.formDescription.set(group.description ?? '');
    this.formIcon.set(group.icon);
    this.formColor.set(group.color);
    this.selectedMembers.set(group.members ?? []);
    this.originalMemberIds.set(group.members?.map((member) => member.id) ?? []);
    this.isModalOpen.set(true);
    this.memberSearchQuery.set('');
    this.loadAvailableFriends(group.id, '').pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  openDeleteConfirm(group: Group): void {
    this.groupToDelete.set(group);
    this.isConfirmDialogOpen.set(true);
  }

  closeDeleteConfirm(): void {
    this.isConfirmDialogOpen.set(false);
    this.groupToDelete.set(null);
    this.isDeleting.set(false);
  }

  confirmDelete(): void {
    const group = this.groupToDelete();
    if (!group) return;

    this.isDeleting.set(true);
    this.groupsService
      .deleteGroup(group.id)
      .pipe(
        switchMap(() => this.groupsService.loadGroups(this.searchQuery())),
        tap(() => {
          if (this.editingGroupId() === group.id) {
            this.closeModal();
            this.editingGroupId.set(null);
          }
          this.toastService.success('GROUPS_MANAGEMENT.TOASTS.DELETED_SUCCESS');
          this.closeDeleteConfirm();
        }),
        catchError((error) => {
          this.toastService.error(this.resolveErrorKey(error));
          return of([] as Group[]);
        }),
        finalize(() => this.isDeleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  deleteGroup(group: Group): void {
    const confirmMessage = this.translateService.instant('GROUPS_MANAGEMENT.DELETE_CONFIRMATION', {
      groupName: group.name,
    });
    const confirmDelete = window.confirm(confirmMessage);
    if (!confirmDelete) {
      return;
    }

    this.isSaving.set(true);
    this.groupsService
      .deleteGroup(group.id)
      .pipe(
        switchMap(() => this.groupsService.loadGroups(this.searchQuery())),
        tap(() => {
          // Clear selection if the deleted group was selected
          if (this.editingGroupId() === group.id) {
            this.closeModal();
            this.editingGroupId.set(null);
          }
          this.toastService.success('GROUPS_MANAGEMENT.TOASTS.DELETED_SUCCESS');
          // Clear search if needed to show remaining groups
          this.searchQuery.set('');
        }),
        catchError((error) => {
          this.toastService.error(this.resolveErrorKey(error));
          return of([] as Group[]);
        }),
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  updateName(value: string): void {
    this.formName.set(value);
  }

  updateDescription(value: string): void {
    this.formDescription.set(value);
  }

  updateIcon(value: string): void {
    this.formIcon.set(value);
  }

  updateColor(value: string): void {
    this.formColor.set(value);
  }

  toggleMember(member: GroupMember): void {
    const current = this.selectedMembers();
    const exists = current.some((item) => item.id === member.id);
    if (exists) {
      this.selectedMembers.set(current.filter((item) => item.id !== member.id));
      this.availableFriends.update((friends) =>
        friends.some((friend) => friend.id === member.id) ? friends : [member, ...friends],
      );
    } else {
      this.selectedMembers.set([...current, member]);
      this.availableFriends.update((friends) =>
        friends.filter((friend) => friend.id !== member.id),
      );
    }
  }

  onMemberSearch(query: string): void {
    this.memberSearchQuery.set(query);
  }

  saveGroup(): void {
    const name = this.formName().trim();
    const icon = this.formIcon().trim();
    const color = this.formColor().trim();
    if (!name || !icon || !color) {
      this.toastService.error('GROUPS_MANAGEMENT.TOASTS.ERROR_GENERIC');
      return;
    }

    this.isSaving.set(true);
    const memberIds = this.selectedMembers().map((member) => member.id);

    const description = this.formDescription().trim();

    if (this.modalMode() === 'create') {
      this.groupsService
        .createGroup({
          name,
          description,
          icon,
          color,
          memberIds,
        })
        .pipe(
          switchMap(() => this.groupsService.loadGroups(this.searchQuery())),
          tap(() => {
            this.toastService.success('GROUPS_MANAGEMENT.TOASTS.CREATED', undefined, {
              count: memberIds.length,
            });
            this.closeModal();
          }),
          catchError((error) => {
            this.toastService.error(this.resolveErrorKey(error));
            return of([] as Group[]);
          }),
          finalize(() => this.isSaving.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe();
      return;
    }

    const groupId = this.editingGroupId();
    if (!groupId) {
      this.isSaving.set(false);
      return;
    }

    const originalIds = new Set(this.originalMemberIds());
    const currentIds = new Set(memberIds);
    const addMemberIds = memberIds.filter((id) => !originalIds.has(id));
    const removeMemberIds = this.originalMemberIds().filter((id) => !currentIds.has(id));

    this.groupsService
      .updateGroup(groupId, {
        name,
        description,
        icon,
        color,
        addMemberIds: addMemberIds.length ? addMemberIds : undefined,
        removeMemberIds: removeMemberIds.length ? removeMemberIds : undefined,
      })
      .pipe(
        switchMap(() => this.groupsService.loadGroups(this.searchQuery())),
        tap(() => {
          this.toastService.success('GROUPS_MANAGEMENT.TOASTS.UPDATED');
          this.closeModal();
        }),
        catchError((error) => {
          this.toastService.error(this.resolveErrorKey(error));
          return of([] as Group[]);
        }),
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private loadGroups(): void {
    this.isLoading.set(true);
    this.errorKey.set(null);
    this.groupsService
      .loadGroups()
      .pipe(
        catchError((error) => {
          this.errorKey.set('GROUPS_MANAGEMENT.TOASTS.ERROR_GENERIC');
          this.toastService.error(this.resolveErrorKey(error));
          return of([] as Group[]);
        }),
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private bindSearch(): void {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          this.isLoading.set(true);
          this.errorKey.set(null);
          return this.groupsService.searchGroups(query).pipe(
            catchError((error) => {
              this.errorKey.set('GROUPS_MANAGEMENT.TOASTS.ERROR_GENERIC');
              this.toastService.error(this.resolveErrorKey(error));
              return of([] as Group[]);
            }),
            finalize(() => this.isLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private loadAvailableFriends(groupId: string, query: string) {
    return this.groupsService.getAvailableFriends(groupId, query).pipe(
      tap((friends) => this.availableFriends.set(this.excludeSelected(friends))),
      catchError((error) => {
        this.toastService.error(this.resolveErrorKey(error));
        this.availableFriends.set([]);
        return of([] as GroupMember[]);
      }),
    );
  }

  private loadFriendsForCreate(query: string) {
    const cached = this.allFriendsCache();
    if (cached) {
      const filtered = this.filterFriendsList(cached, query);
      this.availableFriends.set(this.excludeSelected(filtered));
      return of(filtered);
    }

    return this.friendsService.getFriends().pipe(
      tap((friends) => {
        const mapped = this.mapFriendsToMembers(friends);
        this.allFriendsCache.set(mapped);
        const filtered = this.filterFriendsList(mapped, query);
        this.availableFriends.set(this.excludeSelected(filtered));
      }),
      catchError((error) => {
        this.toastService.error(this.resolveErrorKey(error));
        this.availableFriends.set([]);
        return of([] as GroupMember[]);
      }),
    );
  }

  private mapFriendsToMembers(friends: Friend[]): GroupMember[] {
    return friends.map((friend) => ({
      id: friend.id,
      name: friend.name,
      username: friend.username,
      avatarUrl: friend.avatarUrl,
    }));
  }

  private filterFriendsList(friends: GroupMember[], query: string): GroupMember[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return friends;
    }

    return friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(trimmed) ||
        friend.username.toLowerCase().includes(trimmed),
    );
  }

  private excludeSelected(friends: GroupMember[]): GroupMember[] {
    const selectedIds = new Set(this.selectedMembers().map((member) => member.id));
    return friends.filter((friend) => !selectedIds.has(friend.id));
  }

  private resetForm(): void {
    this.formName.set('');
    this.formDescription.set('');
    this.formIcon.set('group');
    this.formColor.set('blue');
    this.memberSearchQuery.set('');
  }

  private resolveErrorKey(error: unknown): string {
    const fallback = 'GROUPS_MANAGEMENT.TOASTS.ERROR_GENERIC';
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
}
