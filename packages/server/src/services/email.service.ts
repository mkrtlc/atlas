import { logger } from '../utils/logger';
import { getRawSmtpSettings } from '../apps/system/service';

/**
 * Send an email using the SMTP settings from System > Email.
 * Returns true if sent, false if email is not configured.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  try {
    const smtp = await getRawSmtpSettings();

    if (!smtp.enabled || !smtp.host || !smtp.user) {
      logger.debug({ to: options.to, subject: options.subject }, 'Email not sent — SMTP not configured');
      return false;
    }

    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass || '' },
    });

    await transport.sendMail({
      from: smtp.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    logger.info({ to: options.to, subject: options.subject }, 'Email sent');
    return true;
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send email');
    return false;
  }
}
