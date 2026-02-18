import {
  Component,
  input,
  output,
  signal,
  effect,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomSelectComponent {
  options = input.required<SelectOption[]>();
  value = input<string>('');
  disabled = input<boolean>(false);
  placeholder = input<string>('Select an option');
  ariaLabel = input<string>('');

  valueChange = output<string>();

  isOpen = signal<boolean>(false);
  focusedIndex = signal<number>(-1);

  constructor(private elementRef: ElementRef) {
    effect(() => {
      // Cuando el valor cambia, actualizar el índice enfocado
      const currentValue = this.value();
      const index = this.options().findIndex((opt) => opt.value === currentValue);
      if (index >= 0) {
        this.focusedIndex.set(index);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  toggle(): void {
    if (this.disabled()) return;
    this.isOpen.update((open) => !open);
  }

  open(): void {
    if (this.disabled()) return;
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  selectOption(option: SelectOption): void {
    if (this.disabled()) return;
    this.valueChange.emit(option.value);
    this.close();
  }

  getSelectedLabel(): string {
    const selectedOption = this.options().find((opt) => opt.value === this.value());
    return selectedOption ? selectedOption.label : this.placeholder();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open();
        } else {
          this.focusNext();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open();
        } else {
          this.focusPrevious();
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open();
        } else {
          const focused = this.focusedIndex();
          if (focused >= 0 && focused < this.options().length) {
            this.selectOption(this.options()[focused]);
          }
        }
        break;
      case 'Home':
        event.preventDefault();
        this.focusedIndex.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusedIndex.set(this.options().length - 1);
        break;
    }
  }

  private focusNext(): void {
    const currentIndex = this.focusedIndex();
    const nextIndex = Math.min(currentIndex + 1, this.options().length - 1);
    this.focusedIndex.set(nextIndex);
  }

  private focusPrevious(): void {
    const currentIndex = this.focusedIndex();
    const prevIndex = Math.max(currentIndex - 1, 0);
    this.focusedIndex.set(prevIndex);
  }

  isOptionFocused(index: number): boolean {
    return this.focusedIndex() === index;
  }

  isOptionSelected(option: SelectOption): boolean {
    return option.value === this.value();
  }

  onOptionMouseEnter(index: number): void {
    this.focusedIndex.set(index);
  }
}
