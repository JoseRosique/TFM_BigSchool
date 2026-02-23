import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter!: Transporter;
  private fromAddress!: string;
  private frontendUrl!: string;
  private smtpHost!: string;
  private smtpPort!: number;
  private smtpUser!: string;
  private smtpPass!: string;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    console.log('[EmailService] Initializing...');
    try {
      // Load configuration
      this.smtpHost = this.configService.getOrThrow<string>('EMAIL_HOST');
      this.smtpPort = this.configService.getOrThrow<number>('EMAIL_PORT');
      this.smtpUser = this.configService.getOrThrow<string>('EMAIL_USER');
      this.smtpPass = this.configService.getOrThrow<string>('EMAIL_PASS');
      this.fromAddress = this.configService.getOrThrow<string>('EMAIL_FROM');
      this.frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

      this.transporter = this.createTransporter();
      this.isInitialized = true;
      console.log('[EmailService] Configuration loaded successfully.');

      // Verify SMTP connection in background (non-blocking)
      // This prevents network timeouts in restricted environments like Render
      this.verifySmtpConnectionAsync();
    } catch (error) {
      console.error(
        '[EmailService] Initialization failed:',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  private async verifySmtpConnectionAsync(): Promise<void> {
    try {
      console.log('[EmailService] Verifying SMTP connection (async)...');
      this.logConfig('verify');
      await this.transporter.verify();
      console.log('[EmailService] SMTP connection verified.');
    } catch (error) {
      console.warn(
        '[EmailService] SMTP verification warning (emails may still work):',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private assertInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        '[EmailService] EmailService is not initialized. Check that onModuleInit completed successfully.',
      );
    }
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    this.assertInitialized();
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const html = this.buildPasswordResetHtml(resetUrl);

    console.log('[EmailService] Sending password reset email:', email);
    this.logConfig('sendPasswordReset');
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Recupera tu password',
        html,
      });
      console.log('[EmailService] Password reset email sent:', info.messageId);
    } catch (error) {
      console.error('[EmailService] Password reset email failed:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const isGoogleUser = false;

    console.log(
      `[EmailService] Attempting welcome email (${isGoogleUser ? 'google' : 'local'}): ${email}`,
    );
    this.logConfig('sendWelcomeEmail');

    await this.sendWelcomeEmailForUser({
      email,
      name,
      isGoogleUser,
      emailVerified: true,
    });
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
      `[EmailService] Attempting welcome email (${isGoogleUser ? 'google' : 'local'}): ${email}`,
    );
    this.logConfig('sendWelcomeEmail');
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Bienvenido a MeetWithFriends',
        html,
      });
      console.log('[EmailService] Welcome email sent:', info.messageId);
    } catch (error) {
      console.error('[EmailService] Welcome email failed:', error);
      throw error;
    }
  }

  async sendTestEmail(email: string): Promise<void> {
    this.assertInitialized();
    console.log('[EmailService] Sending test email:', email);
    this.logConfig('sendTestEmail');
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Test Email - MeetWithFriends',
        html: this.buildTestHtml(),
      });
      console.log('[EmailService] Test email sent:', info.messageId);
    } catch (error) {
      console.error('[EmailService] Test email failed:', error);
      throw error;
    }
  }

  private createTransporter(): Transporter {
    this.smtpHost = this.configService.getOrThrow<string>('EMAIL_HOST');
    this.smtpPort = this.configService.getOrThrow<number>('EMAIL_PORT');
    this.smtpUser = this.configService.getOrThrow<string>('EMAIL_USER');
    this.smtpPass = this.configService.getOrThrow<string>('EMAIL_PASS');
    const secure = this.smtpPort === 465;

    return nodemailer.createTransport({
      host: this.smtpHost,
      port: this.smtpPort,
      secure,
      auth: {
        user: this.smtpUser,
        pass: this.smtpPass,
      },
    });
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
        <p style="margin: 0;">Si ves este correo, la configuracion SMTP funciona.</p>
      </div>
    `;
  }

  private logConfig(context: string): void {
    const maskedPass = this.smtpPass
      ? `${this.smtpPass.slice(0, 3)}***${this.smtpPass.slice(-3)}`
      : 'empty';
    console.log(`[EmailService] SMTP config (${context}):`, {
      host: this.smtpHost,
      port: this.smtpPort,
      user: this.smtpUser,
      pass: maskedPass,
      from: this.fromAddress,
    });
  }
}
