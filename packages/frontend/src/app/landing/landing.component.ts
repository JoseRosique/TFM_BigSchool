import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimatedBackgroundComponent } from '../animated-background/animated-background.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, AnimatedBackgroundComponent],
  styleUrls: ['./landing.component.scss'],
  templateUrl: './landing.component.html',
})
export class LandingComponent {}
