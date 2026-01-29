import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '../../shared/services/users.service';
import { User, CreateUserRequest } from '../../shared/models/user.model';

@Component({
    selector: 'app-users-test',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './users-test.component.html',
    styleUrl: './users-test.component.scss',
})
export class UsersTestComponent implements OnInit {
    private readonly usersService = inject(UsersService);

    users = signal<User[]>([]);
    isLoading = signal(false);
    error = signal<string | null>(null);
    successMessage = signal<string | null>(null);
    /**
     * Holds the timeout id for clearing messages, to avoid memory leaks.
     * Only used for test/demo purposes.
     */
    private clearMessagesTimeoutId: any = null;

    userCount = computed(() => this.users().length);

    ngOnInit(): void {
        this.refreshUsers();
    }

    generateRandomUser(): void {
        this.clearMessages();
        this.isLoading.set(true);

        const randomUser: CreateUserRequest = {
            name: this.generateRandomName(),
            email: this.generateRandomEmail(),
            password: this.generateRandomPassword(),
            timezone: this.getRandomTimezone(),
        };

        this.usersService.createUser(randomUser).subscribe({
            next: (user: User) => {
                this.users.update((current) => [user, ...current]);
                this.successMessage.set(`Usuario "${user.name}" creado exitosamente`);
                this.isLoading.set(false);
                this.clearMessagesAfterDelay();
            },
            error: (err: any) => {
                this.error.set(err.error?.message || 'Error al crear usuario');
                this.isLoading.set(false);
                this.clearMessagesAfterDelay();
            },
        });
    }

    refreshUsers(): void {
        this.clearMessages();
        this.isLoading.set(true);

        this.usersService.getAllUsers().subscribe({
            next: (users: User[]) => {
                this.users.set(users);
                this.isLoading.set(false);
            },
            error: (err: any) => {
                this.error.set(err.error?.message || 'Error al cargar usuarios');
                this.isLoading.set(false);
                this.clearMessagesAfterDelay();
            },
        });
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    private generateRandomName(): string {
        const names = [
            'Ana García',
            'Carlos López',
            'María Rodríguez',
            'Juan Martínez',
            'Laura Sánchez',
            'Pedro Fernández',
            'Sofia González',
            'Diego Pérez',
            'Carmen Ruiz',
            'Miguel Torres',
        ];
        return names[Math.floor(Math.random() * names.length)];
    }

    private generateRandomEmail(): string {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `user${timestamp}${random}@meetwithfriends.test`;
    }

    private getRandomTimezone(): string {
        const timezones = ['UTC', 'America/New_York', 'Europe/Madrid', 'Asia/Tokyo', 'Australia/Sydney'];
        return timezones[Math.floor(Math.random() * timezones.length)];
    }

    private clearMessages(): void {
        this.error.set(null);
        this.successMessage.set(null);
    }

    private clearMessagesAfterDelay(): void {
        if (this.clearMessagesTimeoutId) {
            clearTimeout(this.clearMessagesTimeoutId);
            this.clearMessagesTimeoutId = null;
        }
        this.clearMessagesTimeoutId = setTimeout(() => {
            this.successMessage.set(null);
            this.error.set(null);
            this.isLoading.set(false);
            this.clearMessagesTimeoutId = null;
        }, 5000);
    }

    /**
     * Generates a random password for test users. Only for test/demo use.
     * @returns {string} A random 16-character password with mixed charset.
     */
    private generateRandomPassword(): string {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        const length = 16;
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        return password;
    }

    ngOnDestroy(): void {
        if (this.clearMessagesTimeoutId) {
            clearTimeout(this.clearMessagesTimeoutId);
            this.clearMessagesTimeoutId = null;
        }
    }
}
