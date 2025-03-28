import { log } from './vite';

interface SmsOptions {
  body: string;
  to: string;
  from?: string;
}

class TwilioService {
  private twilio: any = null;
  private isConfigured: boolean = false;

  constructor() {
    this.configureTwilio();
  }

  /**
   * Configures the Twilio client with environment variables
   */
  private configureTwilio(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      log('Twilio credentials not found in environment. SMS functionality will be disabled.', 'twilio');
      this.isConfigured = false;
      return;
    }

    try {
      // Lazy load the twilio library only if credentials are available
      this.twilio = require('twilio')(accountSid, authToken);
      this.isConfigured = true;
      log('Twilio service configured successfully.', 'twilio');
    } catch (error) {
      log(`Failed to initialize Twilio client: ${error}`, 'twilio');
      this.isConfigured = false;
    }
  }

  /**
   * Sends an SMS using the Twilio API
   * @param options SMS options including body, to, and optionally from number
   * @returns Promise with the message details or error
   */
  async sendSms(options: SmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      log('Attempted to send SMS but Twilio is not configured.', 'twilio');
      return { 
        success: false, 
        error: 'Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.' 
      };
    }

    if (!options.to || !options.body) {
      return { success: false, error: 'Missing required parameters: to and body' };
    }

    // Format the phone number to ensure it includes the country code
    const formattedNumber = this.formatPhoneNumber(options.to);
    
    try {
      const message = await this.twilio.messages.create({
        body: options.body,
        to: formattedNumber,
        from: options.from || process.env.TWILIO_PHONE_NUMBER,
      });

      log(`SMS sent successfully to ${options.to}`, 'twilio');
      return { success: true, messageId: message.sid };
    } catch (error: any) {
      log(`Error sending SMS: ${error.message}`, 'twilio');
      return { success: false, error: error.message };
    }
  }

  /**
   * Sends a batch of SMS messages
   * @param messages Array of SMS options
   * @returns Promise with array of results
   */
  async sendBatch(messages: SmsOptions[]): Promise<Array<{ success: boolean; to: string; messageId?: string; error?: string }>> {
    const results = [];
    
    for (const message of messages) {
      const result = await this.sendSms(message);
      results.push({
        ...result,
        to: message.to
      });
    }
    
    return results;
  }

  /**
   * Formats a phone number to ensure it has the proper country code
   * @param phoneNumber The phone number to format
   * @returns Formatted phone number with country code
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // If the number doesn't start with '+', add the default country code
    if (!phoneNumber.startsWith('+')) {
      // Default to +1 (US) if not otherwise specified
      const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '+1';
      
      // If the number already has a country code (usually 10 digits for US), don't add it
      if (digitsOnly.length <= 10) {
        return `${defaultCountryCode}${digitsOnly}`;
      }
    }
    
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digitsOnly}`;
  }

  /**
   * Checks if Twilio is properly configured
   * @returns Boolean indicating whether Twilio is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}

// Export a singleton instance
export const twilioService = new TwilioService();