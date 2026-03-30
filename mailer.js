const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const baseEmailTemplate = ({ title, subtitle, buttonText, buttonLink, footerText }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, Helvetica, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7fb; padding:40px 0;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg, #2563eb, #1d4ed8); padding:28px 32px; text-align:center;">
                  <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">Account Management System</h1>
                  <p style="margin:8px 0 0; color:#dbeafe; font-size:14px;">Secure account access and verification</p>
                </td>
              </tr>

              <tr>
                <td style="padding:40px 32px; text-align:center;">
                  <h2 style="margin:0 0 12px; color:#111827; font-size:26px;">${title}</h2>
                  <p style="margin:0 0 28px; color:#4b5563; font-size:16px; line-height:1.6;">
                    ${subtitle}
                  </p>

                  <a href="${buttonLink}"
                     style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; font-size:16px; font-weight:700; padding:14px 28px; border-radius:10px;">
                    ${buttonText}
                  </a>

                  <p style="margin:28px 0 8px; color:#6b7280; font-size:13px;">
                    If the button does not work, copy and paste this link into your browser:
                  </p>
                  <p style="margin:0; word-break:break-all; font-size:13px; color:#2563eb;">
                    ${buttonLink}
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:20px 32px; background:#f9fafb; border-top:1px solid #e5e7eb; text-align:center;">
                  <p style="margin:0; color:#6b7280; font-size:13px;">
                    ${footerText}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const successPageTemplate = ({ title, message, buttonText, buttonLink }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, Helvetica, sans-serif;">
      <table width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7fb; min-height:100vh;">
        <tr>
          <td align="center" valign="middle">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg, #16a34a, #15803d); padding:26px 30px; text-align:center;">
                  <h1 style="margin:0; color:#ffffff; font-size:24px;">${title}</h1>
                </td>
              </tr>

              <tr>
                <td style="padding:40px 30px; text-align:center;">
                  <div style="font-size:52px; margin-bottom:14px;">✅</div>
                  <p style="margin:0 0 24px; color:#374151; font-size:16px; line-height:1.7;">
                    ${message}
                  </p>

                  <a href="${buttonLink}"
                     style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; font-size:16px; font-weight:700; padding:14px 28px; border-radius:10px;">
                    ${buttonText}
                  </a>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const errorPageTemplate = ({ title, message, buttonText, buttonLink }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, Helvetica, sans-serif;">
      <table width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7fb; min-height:100vh;">
        <tr>
          <td align="center" valign="middle">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg, #dc2626, #b91c1c); padding:26px 30px; text-align:center;">
                  <h1 style="margin:0; color:#ffffff; font-size:24px;">${title}</h1>
                </td>
              </tr>

              <tr>
                <td style="padding:40px 30px; text-align:center;">
                  <div style="font-size:52px; margin-bottom:14px;">⚠️</div>
                  <p style="margin:0 0 24px; color:#374151; font-size:16px; line-height:1.7;">
                    ${message}
                  </p>

                  <a href="${buttonLink}"
                     style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; font-size:16px; font-weight:700; padding:14px 28px; border-radius:10px;">
                    ${buttonText}
                  </a>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const sendVerificationEmail = async (email, fullname, token) => {
  const verifyLink = `${APP_BASE_URL}/api/verify-email?token=${token}`;

  const html = baseEmailTemplate({
    title: 'Verify Your Email',
    subtitle: `Hello ${fullname}, please confirm your email address to activate your account. Click the button below to continue.`,
    buttonText: 'Click to Verify',
    buttonLink: verifyLink,
    footerText: 'If you did not create an account, you can safely ignore this email.'
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Verify Your Email Address',
    html
  });
};

const sendResetEmail = async (email, fullname, token) => {
  const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;

  const html = baseEmailTemplate({
    title: 'Reset Your Password',
    subtitle: `Hello ${fullname}, we received a request to reset your password. Click the button below to set a new password.`,
    buttonText: 'Reset Password',
    buttonLink: resetLink,
    footerText: 'This password reset link will expire in 1 hour.'
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Reset Your Password',
    html
  });
};

const renderVerificationSuccessPage = () => {
  return successPageTemplate({
    title: 'Email Verified',
    message: 'Thank you. Your email address has been successfully verified. You may now continue to the login page and access your account.',
    buttonText: 'Go to Login',
    buttonLink: `${CLIENT_URL}/login`
  });
};

const renderVerificationErrorPage = () => {
  return errorPageTemplate({
    title: 'Verification Failed',
    message: 'This verification link is invalid, expired, or has already been used. Please try registering again or request a new verification email.',
    buttonText: 'Go to Login',
    buttonLink: `${CLIENT_URL}/login`
  });
};

module.exports = {
  sendVerificationEmail,
  sendResetEmail,
  renderVerificationSuccessPage,
  renderVerificationErrorPage
};