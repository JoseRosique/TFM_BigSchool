import { Component, Input, OnInit, ElementRef, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-animated-background',
  templateUrl: './animated-background.component.html',
  styleUrls: ['./animated-background.component.scss'],
  standalone: true,
})
export class AnimatedBackgroundComponent implements OnInit {
  @Input() primaryColor?: string;
  @Input() secondaryColor?: string;
  @Input() accentColor?: string;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
  ) {}

  ngOnInit(): void {
    this.setCustomColors();
  }

  private setCustomColors(): void {
    if (this.primaryColor) {
      this.renderer.setStyle(this.el.nativeElement, '--color-primary', this.primaryColor);
    }
    if (this.secondaryColor) {
      this.renderer.setStyle(this.el.nativeElement, '--color-secondary', this.secondaryColor);
    }
    if (this.accentColor) {
      this.renderer.setStyle(this.el.nativeElement, '--color-accent', this.accentColor);
    }
  }
}
