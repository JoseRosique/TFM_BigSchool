import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

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
        from: {
          email: this.fromAddress,
          name: 'MeetWithFriends',
        },
        replyTo: this.fromAddress,
        subject: 'Recupera tu contraseña de MeetWithFriends',
        html,
        text: `Recupera tu contraseña\n\nHemos recibido una solicitud para resetear la contraseña de tu cuenta.\n\nHaz clic en este enlace para crear una nueva contraseña:\n${resetUrl}\n\nEste enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este email.\n\n© ${new Date().getFullYear()} MeetWithFriends`,
        trackingSettings: {
          clickTracking: {
            enable: false,
          },
          openTracking: {
            enable: false,
          },
        },
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
        from: {
          email: this.fromAddress,
          name: 'MeetWithFriends',
        },
        replyTo: this.fromAddress,
        subject: '¡Bienvenido a MeetWithFriends!',
        html,
        text: `¡Bienvenido, ${name || 'amigo'}!\n\nGracias por unirte a MeetWithFriends. Ya puedes empezar a crear y compartir tus slots.\n\nNos alegra tenerte aquí.\n\n© ${new Date().getFullYear()} MeetWithFriends`,
        trackingSettings: {
          clickTracking: {
            enable: false,
          },
          openTracking: {
            enable: false,
          },
        },
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
        from: {
          email: this.fromAddress,
          name: 'MeetWithFriends',
        },
        replyTo: this.fromAddress,
        subject: 'Email de prueba - MeetWithFriends',
        html: this.buildTestHtml(),
        text:
          'Email de prueba\n\nSi ves este correo, SendGrid funciona correctamente.\n\n© ' +
          new Date().getFullYear() +
          ' MeetWithFriends',
        trackingSettings: {
          clickTracking: {
            enable: false,
          },
          openTracking: {
            enable: false,
          },
        },
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="background-color: #0d6efd; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">MeetWithFriends</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #111; margin: 0 0 16px; font-size: 20px;">Recupera tu contraseña</h2>
            <p style="color: #555; margin: 0 0 24px; line-height: 1.6;">
              Hemos recibido una solicitud para resetear la contraseña de tu cuenta. 
              Haz clic en el botón de abajo para crear una nueva contraseña.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #0d6efd; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Resetear Contraseña
              </a>
            </div>
            <p style="color: #777; margin: 24px 0 0; font-size: 14px; line-height: 1.6;">
              Este enlace expirará en 1 hora por seguridad. Si no solicitaste este cambio, 
              puedes ignorar este email de forma segura.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #999; margin: 0; font-size: 12px; line-height: 1.4;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <a href="${resetUrl}" style="color: #0d6efd; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #666; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} MeetWithFriends. Todos los derechos reservados.
            </p>
            <p style="color: #999; margin: 8px 0 0; font-size: 11px;">
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private buildWelcomeHtml(name?: string): string {
    const safeName = name || 'amigo';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="background-color: #0d6efd; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">MeetWithFriends</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #111; margin: 0 0 16px; font-size: 20px;">¡Bienvenido, ${safeName}!</h2>
            <p style="color: #555; margin: 0 0 20px; line-height: 1.6;">
              Gracias por unirte a MeetWithFriends. Estamos emocionados de tenerte con nosotros.
            </p>
            <p style="color: #555; margin: 0 0 20px; line-height: 1.6;">
              Ya puedes empezar a crear y compartir tus slots de disponibilidad con tus amigos.
            </p>
            <div style="background-color: #f8f9fa; padding: 16px; border-left: 4px solid #0d6efd; margin: 20px 0;">
              <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.4;">
                💡 <strong>Tip:</strong> Completa tu perfil para que tus amigos puedan encontrarte fácilmente.
              </p>
            </div>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="color: #666; margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} MeetWithFriends. Todos los derechos reservados.
            </p>
            <p style="color: #999; margin: 8px 0 0; font-size: 11px;">
              Este es un correo automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
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
