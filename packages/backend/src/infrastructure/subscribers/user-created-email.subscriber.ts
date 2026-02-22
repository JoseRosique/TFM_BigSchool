import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { User } from '@/domain/entities/user.entity';
import { EmailService } from '@/infrastructure/services/email.service';

@Injectable()
@EventSubscriber()
export class UserCreatedEmailSubscriber implements EntitySubscriberInterface<User> {
  private readonly logger = new Logger(UserCreatedEmailSubscriber.name);

  constructor(
    dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return User;
  }

  afterInsert(event: InsertEvent<User>): void {
    const user = event.entity;
    const accountType = user?.isGoogleAccount ? 'google' : 'local';

    if (!user?.email) {
      this.logger.warn('Missing email on inserted user. Skipping welcome email.');
      return;
    }

    this.logger.log(`New user inserted (${accountType}) id=${user.id}`);

    void this.emailService
      .sendWelcomeEmailForUser({
        email: user.email,
        name: user.name,
        isGoogleUser: user.isGoogleAccount,
        emailVerified: !user.isGoogleAccount,
      })
      .catch((error) => {
        this.logger.error(`Welcome email failed for user id=${user.id} (${accountType})`, error);
      });
  }
}
