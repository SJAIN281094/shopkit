import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLoggerService } from '@arhaminnovations/nestjs-pino-logger';
import type { AppConfig } from '../../config/configuration';

const TIMEOUT_MS = 10_000;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName: string;
  replyTo?: string | null;
  tags: string[];
}

/**
 * Sends through the notifyr public API (api/v1/email/send, api/v1/whatsapp/send).
 * Without NOTIFYR_URL and NOTIFYR_API_KEY, messages are only logged.
 */
@Injectable()
export class NotifyrClient {
  private readonly logger: CustomLoggerService;
  private readonly config: AppConfig['notifyr'];

  constructor(config: ConfigService<AppConfig, true>, logger: CustomLoggerService) {
    this.config = config.get('notifyr', { infer: true });
    this.logger = logger.forContext(NotifyrClient.name);
  }

  get enabled(): boolean {
    return !!(this.config.url && this.config.apiKey);
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    await this.post('email/send', {
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      from: { name: message.fromName, email: this.config.fromEmail },
      ...(message.replyTo && { replyTo: message.replyTo }),
      tags: message.tags,
    }, { channel: 'email', to: message.to, subject: message.subject });
  }

  async sendWhatsApp(to: string, text: string): Promise<void> {
    await this.post('whatsapp/send', { to: `+${to}`, text }, { channel: 'whatsapp', to, text });
  }

  private async post(path: string, body: unknown, summary: Record<string, unknown>): Promise<void> {
    if (!this.enabled) {
      this.logger.logWithBindings('info', summary, 'Notification (notifyr not configured, not sent)');
      return;
    }
    const res = await fetch(`${this.config.url}/api/v1/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.config.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`notifyr ${path} responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
  }
}
