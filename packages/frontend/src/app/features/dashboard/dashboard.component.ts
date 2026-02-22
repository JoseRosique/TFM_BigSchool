import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../shared/services/auth.service';

interface DashboardAction {
  icon: string;
  titleKey: string;
  descriptionKey: string;
  route: string;
  ctaKey: string;
}

interface DashboardInsight {
  icon: string;
  titleKey: string;
  valueKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly quickActions: DashboardAction[] = [
    {
      icon: 'calendar_month',
      titleKey: 'DASHBOARD.ACTIONS.CALENDAR.TITLE',
      descriptionKey: 'DASHBOARD.ACTIONS.CALENDAR.DESCRIPTION',
      route: '/calendar',
      ctaKey: 'DASHBOARD.ACTIONS.CALENDAR.CTA',
    },
    {
      icon: 'group',
      titleKey: 'DASHBOARD.ACTIONS.FRIENDS.TITLE',
      descriptionKey: 'DASHBOARD.ACTIONS.FRIENDS.DESCRIPTION',
      route: '/friends',
      ctaKey: 'DASHBOARD.ACTIONS.FRIENDS.CTA',
    },
    {
      icon: 'groups',
      titleKey: 'DASHBOARD.ACTIONS.GROUPS.TITLE',
      descriptionKey: 'DASHBOARD.ACTIONS.GROUPS.DESCRIPTION',
      route: '/groups',
      ctaKey: 'DASHBOARD.ACTIONS.GROUPS.CTA',
    },
  ];

  readonly insights: DashboardInsight[] = [
    {
      icon: 'bolt',
      titleKey: 'DASHBOARD.INSIGHTS.SPEED.TITLE',
      valueKey: 'DASHBOARD.INSIGHTS.SPEED.VALUE',
      descriptionKey: 'DASHBOARD.INSIGHTS.SPEED.DESCRIPTION',
    },
    {
      icon: 'schedule',
      titleKey: 'DASHBOARD.INSIGHTS.FLEXIBILITY.TITLE',
      valueKey: 'DASHBOARD.INSIGHTS.FLEXIBILITY.VALUE',
      descriptionKey: 'DASHBOARD.INSIGHTS.FLEXIBILITY.DESCRIPTION',
    },
    {
      icon: 'favorite',
      titleKey: 'DASHBOARD.INSIGHTS.CONNECTION.TITLE',
      valueKey: 'DASHBOARD.INSIGHTS.CONNECTION.VALUE',
      descriptionKey: 'DASHBOARD.INSIGHTS.CONNECTION.DESCRIPTION',
    },
  ];

  readonly starterChecklist = [
    'DASHBOARD.CHECKLIST.STEP_1',
    'DASHBOARD.CHECKLIST.STEP_2',
    'DASHBOARD.CHECKLIST.STEP_3',
  ];

  displayName(): string {
    const user = this.authService.currentUser$.value;
    return user?.name?.trim() || user?.nickname?.trim() || 'Friend';
  }

  navigateTo(route: string): void {
    void this.router.navigate([route]);
  }
}
