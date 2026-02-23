import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService implements OnModuleInit {
  private fromAddress!: string;
  private frontendUrl!: string;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    console.log('[EmailService] Initializing SendGrid...');
    try {
      const apiKey = this.configService.getOrThrow<string>('SENDGRID_API_KEY');
      this.fromAddress = this.configService.getOrThrow<string>('EMAIL_FROM');
      this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

      sgMail.setApiKey(apiKey);
      this.isInitialized = true;
      console.log('[EmailService] SendGrid initialized successfully.');
      console.log('[EmailService] From address:', this.fromAddress);
      console.log('[EmailService] Frontend URL:', this.frontendUrl);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[EmailService] Initialization failed:', errorMsg);
      console.warn(
        '[EmailService] ⚠️  Server will start but email functionality will be unavailable.',
      );
      console.warn('[EmailService] Required environment variables:');
      console.warn('[EmailService]   - SENDGRID_API_KEY: Your SendGrid API key');
      console.warn(
        '[EmailService]   - EMAIL_FROM: Sender email address (must be verified in SendGrid)',
      );
      console.warn('[EmailService]   - FRONTEND_URL: Your frontend URL for password reset links');
    }
  }

  private assertInitialized(): void {
    if (!this.isInitialized) {
      throw new InternalServerErrorException(
        'Email service is not initialized. Check that SENDGRID_API_KEY, EMAIL_FROM, and FRONTEND_URL are properly configured in environment variables.',
      );
    }
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    console.log('[EmailService] Sending password reset email to:', email);
    this.assertInitialized();

    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const html = this.buildPasswordResetHtml(resetUrl);

    try {
      const msg = {
        to: email,
        from: this.fromAddress,
        subject: 'Recupera tu password - MeetWithFriends',
        html,
      };

      const response = await sgMail.send(msg);
      console.log('[EmailService] ✅ Password reset email sent successfully.');
      console.log('[EmailService] Message ID:', response[0].headers['x-message-id']);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[EmailService] ❌ Failed to send password reset email:', errorMsg);
      console.error('[EmailService] Email:', email);

      if (errorMsg.includes('Invalid email')) {
        console.error('[EmailService] Error: Invalid recipient email address');
      } else if (errorMsg.includes('Forbidden')) {
        console.error('[EmailService] Error: API key is invalid or account is restricted');
      } else if (errorMsg.includes('Unauthorized')) {
        console.error('[EmailService] Error: SENDGRID_API_KEY is not set or invalid');
      }

      throw error;
    }
  }

  async sendWelcomeEmailForUser(params: {
    email: string;
    name?: string;
    isGoogleUser?: boolean;
    emailVerified?: boolean;
  }): Promise<void> {
    this.assertInitialized();
    const { email, name, isGoogleUser = false, emailVerified = false } = params;
    const effectiveEmailVerified = isGoogleUser ? true : emailVerified;

    if (!effectiveEmailVerified) {
      console.log(`[EmailService] Skipping welcome email (email not verified): ${email}`);
      return;
    }

    const html = this.buildWelcomeHtml(name);

    console.log(
      `[EmailService] Sending welcome email (${isGoogleUser ? 'google' : 'local'}): ${email}`,
    );

    try {
      const msg = {
        to: email,
        from: this.fromAddress,
        subject: 'Bienvenido a MeetWithFriends',
        html,
      };

      const response = await sgMail.send(msg);
      console.log('[EmailService] ✅ Welcome email sent successfully.');
      console.log('[EmailService] Message ID:', response[0].headers['x-message-id']);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[EmailService] ❌ Failed to send welcome email:', errorMsg);
      console.error('[EmailService] Email:', email);

      if (errorMsg.includes('Invalid email')) {
        console.error('[EmailService] Error: Invalid recipient email address');
      } else if (errorMsg.includes('Forbidden')) {
        console.error('[EmailService] Error: API key is invalid or account is restricted');
      } else if (errorMsg.includes('Unauthorized')) {
        console.error('[EmailService] Error: SENDGRID_API_KEY is not set or invalid');
      }

      throw error;
    }
  }

  async sendTestEmail(email: string): Promise<void> {
    console.log('[EmailService] Sending test email to:', email);
    this.assertInitialized();

    try {
      const msg = {
        to: email,
        from: this.fromAddress,
        subject: 'Test Email - MeetWithFriends',
        html: this.buildTestHtml(),
      };

      const response = await sgMail.send(msg);
      console.log('[EmailService] ✅ Test email sent successfully.');
      console.log('[EmailService] Message ID:', response[0].headers['x-message-id']);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[EmailService] ❌ Failed to send test email:', errorMsg);
      console.error('[EmailService] Email:', email);

      if (errorMsg.includes('Invalid email')) {
        console.error('[EmailService] Error: Invalid recipient email address');
      } else if (errorMsg.includes('Forbidden')) {
        console.error('[EmailService] Error: API key is invalid or account is restricted');
      } else if (errorMsg.includes('Unauthorized')) {
        console.error('[EmailService] Error: SENDGRID_API_KEY is not set or invalid');
      }

      throw error;
    }
  }

  private buildPasswordResetHtml(resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
        <h2 style="margin: 0 0 12px;">Recupera tu password</h2>
        <p style="margin: 0 0 20px;">Haz click en el boton para crear un nuevo password.</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 20px; background: #0d6efd; color: #fff; text-decoration: none; border-radius: 6px;">
          Resetear password
        </a>
        <p style="margin: 20px 0 0; font-size: 12px; color: #666;">Si no solicitaste esto, puedes ignorar este email.</p>
      </div>
    `;
  }

  private buildWelcomeHtml(name?: string): string {
    const safeName = name || 'amigo';
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
        <h2 style="margin: 0 0 12px;">Bienvenido, ${safeName}!</h2>
        <p style="margin: 0 0 20px;">Gracias por unirte a MeetWithFriends. Ya puedes empezar a crear y compartir tus slots.</p>
        <p style="margin: 0; font-size: 12px; color: #666;">Nos alegra tenerte aqui.</p>
      </div>
    `;
  }

  private buildTestHtml(): string {
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
        <h2 style="margin: 0 0 12px;">Email de prueba</h2>
        <p style="margin: 0;">Si ves este correo, SendGrid funciona correctamente.</p>
      </div>
    `;
  }
}
