import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  isCollapsed = signal(false);

  toggleSidebar() {
    this.isCollapsed.update((value) => !value);
  }

  getToggleLabelKey() {
    return this.isCollapsed() ? 'SIDEBAR.EXPAND' : 'SIDEBAR.COLLAPSE';
  }
}
