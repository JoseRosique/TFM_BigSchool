import {
  Component,
  input,
  output,
  signal,
  effect,
  ElementRef,
  ChangeDetectionStrategy,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true,
    },
  ],
})
export class CustomSelectComponent implements ControlValueAccessor {
  options = input.required<SelectOption[]>();
  disabled = signal<boolean>(false);
  placeholder = input<string>('Select an option');
  ariaLabel = input<string>('');
  value = input<string>('');
  valueChange = output<string>();

  private selectedValue = signal<string>('');
  private isFormControlled = signal<boolean>(false);

  isOpen = signal<boolean>(false);
  focusedIndex = signal<number>(-1);

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {
    effect(() => {
      // Skip syncing if component is form-controlled (writeValue was called)
      if (this.isFormControlled()) return;

      const currentValue = this.value();
      if (currentValue !== this.selectedValue()) {
        this.selectedValue.set(currentValue);
      }
    });

    effect(() => {
      const currentValue = this.selectedValue();
      const index = this.options().findIndex((opt) => opt.value === currentValue);
      if (index >= 0) {
        this.focusedIndex.set(index);
      }
    });
  }

  writeValue(value: any): void {
    this.isFormControlled.set(true);
    this.selectedValue.set(value ?? '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled); // Corrected to use 'set' for mutable signal
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
    this.selectedValue.set(option.value);
    this.valueChange.emit(option.value);
    this.onChange(option.value);
    this.onTouched();
    this.close(); // Ensure 'close' is accessible
  }

  getSelectedLabel(): string {
    const selectedOption = this.options().find((opt) => opt.value === this.selectedValue());
    return selectedOption ? selectedOption.label : this.placeholder();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open(); // Ensure 'open' is accessible
        } else {
          this.focusNext();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open(); // Ensure 'open' is accessible
        } else {
          this.focusPrevious();
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open(); // Ensure 'open' is accessible
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
    return option.value === this.selectedValue();
  }

  onOptionMouseEnter(index: number): void {
    this.focusedIndex.set(index);
  }
}
