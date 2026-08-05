import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '@/core/config.js';
import type {
  EmailMessage,
  IEmailProvider,
} from '@/modules/notification/notification.types.js';

export class SmtpEmailProvider implements IEmailProvider {
  private readonly transporter: Transporter;

  constructor() {
    // Gmail App Passwords are 16 chars; strip spaces if pasted as "abcd efgh ijkl mnop"
    const pass = config.SMTP_PASS.replace(/\s+/g, '').trim();

    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER.trim(),
        pass,
      },
    });
  }

  async sendEmail(to: string, message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: config.EMAIL_FROM,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
