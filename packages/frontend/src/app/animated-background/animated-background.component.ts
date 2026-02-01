import { Component, Input, OnInit, ElementRef, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-animated-background',
  templateUrl: './animated-background.component.html',
  styleUrls: ['./animated-background.component.scss'],
  standalone: true,
})
export class AnimatedBackgroundComponent implements OnInit {
  @Input() primaryColor: string = '#FF6B6B';
  @Input() secondaryColor: string = '#FF8C7A';
  @Input() accentColor: string = '#FFD1C8';

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
  ) {}

  ngOnInit(): void {
    this.setCustomColors();
  }

  private setCustomColors(): void {
    this.renderer.setStyle(this.el.nativeElement, '--color-primary', this.primaryColor);
    this.renderer.setStyle(this.el.nativeElement, '--color-secondary', this.secondaryColor);
    this.renderer.setStyle(this.el.nativeElement, '--color-accent', this.accentColor);
  }
}
