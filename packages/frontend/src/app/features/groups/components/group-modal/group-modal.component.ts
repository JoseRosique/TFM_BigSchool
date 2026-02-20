import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
  startWith,
  Subject,
} from 'rxjs';
import { GroupMember } from '../../../../shared/models/group.model';

type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './group-modal.component.html',
  styleUrls: ['./group-modal.component.scss'],
})
export class GroupModalComponent implements OnChanges, OnDestroy {
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

  @ViewChild('friendSelect') friendSelect?: ElementRef<HTMLElement>;

  isDropdownOpen = false;
  searchControl = new FormControl<string>('', { nonNullable: true });

  private readonly availableFriends$ = new BehaviorSubject<GroupMember[]>([]);
  private readonly destroy$ = new Subject<void>();

  filteredFriends$ = combineLatest([
    this.searchControl.valueChanges.pipe(startWith(''), distinctUntilChanged()),
    this.availableFriends$,
  ]).pipe(map(([query, friends]) => this.filterFriends(friends, query)));

  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    this.save.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['availableFriends']) {
      this.availableFriends$.next(this.availableFriends ?? []);
    }

    if (changes['searchQuery'] && this.searchQuery !== this.searchControl.value) {
      this.searchControl.setValue(this.searchQuery ?? '', { emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.availableFriends$.complete();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (!this.isDropdownOpen) {
      this.searchControl.setValue('', { emitEvent: true });
    }
    this.searchFriends.emit(this.searchControl.value ?? '');
  }

  handleToggleMember(member: GroupMember): void {
    this.toggleMember.emit(member);
    this.isDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isDropdownOpen) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target || !this.friendSelect?.nativeElement) {
      return;
    }
    if (!this.friendSelect.nativeElement.contains(target)) {
      this.isDropdownOpen = false;
    }
  }

  private filterFriends(friends: GroupMember[], query: string): GroupMember[] {
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
}
