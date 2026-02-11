import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-legend-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './legend-panel.component.html',
  styleUrl: './legend-panel.component.scss',
})
export class LegendPanelComponent {}
