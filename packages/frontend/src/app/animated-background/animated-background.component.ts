import {
  Component,
  Input,
  OnInit,
  ElementRef,
  Renderer2,
  ViewChild,
  AfterViewInit,
} from '@angular/core';

@Component({
  selector: 'app-animated-background',
  templateUrl: './animated-background.component.html',
  styleUrls: ['./animated-background.component.scss'],
  standalone: true,
})
export class AnimatedBackgroundComponent implements OnInit, AfterViewInit {
  // Referencia al elemento <video> del HTML
  @ViewChild('bgVideo') videoPlayer!: ElementRef<HTMLVideoElement>;

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

  // Se ejecuta después de que la vista se ha inicializado
  ngAfterViewInit(): void {
    const video = this.videoPlayer.nativeElement;

    // Forzamos el mute y el play para evitar bloqueos del navegador
    video.muted = true;
    video.play().catch((err) => {
      console.warn('El auto-play fue bloqueado o el video no está listo:', err);
    });
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
