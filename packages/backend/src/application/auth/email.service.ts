import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendPasswordReset(_email: string, _token: string): Promise<void> {
    // Mock email sender: intentionally no-op for now.
  }
}
