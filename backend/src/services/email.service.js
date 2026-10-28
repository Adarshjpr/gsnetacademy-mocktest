import nodemailer from 'nodemailer';
import { AppError } from '../utils/AppError.js';

export function getEmailTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const frontendUrl = process.env.FRONTEND_URL?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  let frontend;
  try {
    frontend = new URL(frontendUrl);
  } catch {
    throw new AppError(503, 'Password reset email is not configured. Set FRONTEND_URL to your website address.');
  }
  if (!['http:', 'https:'].includes(frontend.protocol) || !host || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError(503, 'Password reset email is not configured. Check FRONTEND_URL, SMTP_HOST, SMTP_PORT and SMTP_FROM.');
  }

  if (!!process.env.SMTP_USER !== !!process.env.SMTP_PASS) {
    throw new AppError(503, 'Password reset email is not configured. Set both SMTP_USER and SMTP_PASS, or leave both empty.');
  }
  const auth = process.env.SMTP_USER || process.env.SMTP_PASS
    ? { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
    : undefined;
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    ...(auth ? { auth } : {}),
  });
}

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export async function sendPasswordResetEmail(transport, user, token) {
  const resetUrl = new URL('/reset-password', process.env.FRONTEND_URL.trim());
  resetUrl.searchParams.set('token', token);

  const hindi = user.language === 'hi';
  const greeting = hindi ? `नमस्ते ${user.name || ''},` : `Hello ${user.name || ''},`;
  const intro = hindi
    ? 'आपके अकाउंट के लिए पासवर्ड रीसेट का अनुरोध मिला है। नीचे दिए लिंक से एक घंटे के भीतर नया पासवर्ड बनाएँ:'
    : 'We received a request to reset your account password. Use the link below within one hour to choose a new password:';
  const button = hindi ? 'पासवर्ड रीसेट करें' : 'Reset password';
  const ignore = hindi
    ? 'अगर आपने यह अनुरोध नहीं किया, तो इस ईमेल को अनदेखा करें। आपका पासवर्ड नहीं बदलेगा।'
    : 'If you did not request this, you can ignore this email. Your password will not change.';

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: user.email,
    subject: hindi ? 'GS Net Academy पासवर्ड रीसेट' : 'GS Net Academy password reset',
    text: `${greeting}\n\n${intro}\n${resetUrl.toString()}\n\n${ignore}`,
    html: `<p>${escapeHtml(greeting)}</p><p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(resetUrl.toString())}">${escapeHtml(button)}</a></p><p>${escapeHtml(ignore)}</p>`,
  });
}
