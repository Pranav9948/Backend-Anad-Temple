import { config } from '@/core/config.js';
import { META_WHATSAPP_API_VERSION } from '@/modules/notification/notification.constants.js';
import type { IWhatsAppProvider } from '@/modules/notification/whatsapp.provider.js';

type MetaSendMessageResponse = {
  messaging_product?: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
  };
};

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  private readonly baseUrl = `https://graph.facebook.com/${META_WHATSAPP_API_VERSION}`;

  async sendTextMessage(to: string, body: string): Promise<void> {
    const url = `${this.baseUrl}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizeWhatsAppRecipient(to),
        type: 'text',
        text: {
          preview_url: false,
          body,
        },
      }),
    });

    const data = (await response.json()) as MetaSendMessageResponse;

    if (!response.ok) {
      const message =
        data.error?.message ??
        `Meta WhatsApp API request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (!data.messages?.length) {
      throw new Error('Meta WhatsApp API did not return a message id');
    }
  }
}

function normalizeWhatsAppRecipient(phone: string): string {
  return phone.replace(/\D/g, '');
}
