interface EmailLayoutOptions {
    title: string;
    heading: string;
    content: string;
    accentColor?: string;
    eyebrow?: string;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function darken(hex: string, amount: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function emailLayout({ title, heading, content, accentColor = "#138B78", eyebrow }: EmailLayoutOptions): string {
    // URL encoded SVG for the logo
    const logoSvg = "https://sarjan-healthcare-client-dqg8.vercel.app/images/logo-icon.svg"
    const accentDark = darken(accentColor, 24);

    return `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style type="text/css">
    #outlook a {padding:0;}
    body{width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; margin:0; padding:0;}
    .ExternalClass {width:100%;}
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height: 100%;}
    #backgroundTable {margin:0; padding:0; width:100% !important; line-height: 100% !important;}
    img {outline:none; text-decoration:none; -ms-interpolation-mode: bicubic;}
    a img {border:none;}
    .image_fix {display:block;}
    table td {border-collapse: collapse;}
    table { border-collapse:collapse}

    @media only screen and (max-width: 600px) {
      table[class="content-table"] {
        width: 100% !important;
        border-radius: 0 !important;
        border: none !important;
      }
      td[class="content-cell"] {
        padding: 32px 20px 24px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table id="backgroundTable" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; width: 100%; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <table class="content-table" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">

          <!-- Accent Line (themed per email type) -->
          <tr>
            <td height="4" bgcolor="${accentColor}" style="background: linear-gradient(90deg, ${accentColor} 0%, ${accentDark} 100%); background-color: ${accentColor}; font-size: 4px; line-height: 4px;">&nbsp;</td>
          </tr>

          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 32px 20px 10px 20px; border-bottom: 1px solid #F1F5F9;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <!-- Logo Icon -->
                  <td align="center" valign="middle" style="padding-right: 12px;">
                    <div style="background-color: ${accentColor}1A; padding: 8px; border-radius: 10px; display: inline-block;">
                      <img src="${logoSvg}" alt="Logo" width="24" height="24" style="display: block; width: 24px; height: 24px;" />
                    </div>
                  </td>
                  <!-- Logo Text -->
                  <td align="left" valign="middle">
                    <div style="font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      <div style="font-weight: 800; font-size: 18px; color: #111827; letter-spacing: -0.02em; line-height: 1;">SARJAN</div>
                      <div style="font-weight: 700; font-size: 11px; color: ${accentColor}; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 2px; line-height: 1;">HEALTHCARE</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content-cell" style="padding: 40px 40px 32px 40px;">
              ${eyebrow ? `<p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${accentColor};">${eyebrow}</p>` : ""}
              <h2 style="color: #0F172A; margin-top: 0; margin-bottom: 24px; font-size: 21px; font-weight: 700; letter-spacing: -0.01em;">${heading}</h2>

              <div style="color: #475569; font-size: 16px; line-height: 1.65;">
                ${content}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #F8FAFC; padding: 24px 30px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 6px 0; color: #94A3B8; font-size: 13px; font-weight: 500;">
                &copy; 2026 Sarjan Healthcare. All rights reserved.
              </p>
              <p style="margin: 0; color: #B0BAC5; font-size: 12px;">
                This email was sent by the Sarjan Healthcare system.
              </p>
            </td>
          </tr>

        </table>

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td height="20" style="font-size: 20px; line-height: 20px;">&nbsp;</td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`
}

function emailButton(href: string, label: string, accentColor: string = "#138B78"): string {
    return `
<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
  <tr>
    <td>
      <table border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" bgcolor="${accentColor}">
            <a href="${href}" target="_blank" style="font-size: 15px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 24px; display: inline-block; font-weight: 600;">${label}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

interface StaffActivationTemplateOptions {
    firstName: string;
    username: string;
    activationLink: string;
}

interface DoctorFeeMissingTemplateOptions {
    doctorName: string;
}

interface PasswordResetTemplateOptions {
    firstName: string;
    username: string;
    resetLink: string;
}

export function doctorFeeMissingTemplate({ doctorName }: DoctorFeeMissingTemplateOptions): string {
    return emailLayout({
        title: "Action required: Doctor consultation fees not configured",
        heading: "Checkout blocked — fees not configured",
        eyebrow: "ACTION REQUIRED",
        content: `
<p style="margin-top: 0; margin-bottom: 16px;">A receptionist just attempted to check out a patient for <strong style="color: #0F172A;">Dr. ${doctorName}</strong>, but the doctor's consultation fees (old-case / new-case) are not yet configured.</p>

<p style="margin-top: 0; margin-bottom: 16px;">Checkout for this doctor's patients will remain blocked until both fees are set.</p>

<p style="margin-top: 0; margin-bottom: 0; font-size: 14px;">Please set these fees as soon as possible from the admin Pricing Management page.</p>
`,
    });
}

export function staffActivationTemplate({
    firstName,
    username,
    activationLink,
}: StaffActivationTemplateOptions): string {
    return emailLayout({
        title: "Activate your Sarjan Healthcare account",
        heading: `Welcome, ${firstName}!`,
        eyebrow: "WELCOME",
        content: `
<p style="margin-top: 0; margin-bottom: 16px;">An administrator has just created a new staff account for you at Sarjan Healthcare.</p>

<p style="margin-top: 0; margin-bottom: 16px;">Your login username is: <strong style="color: #0F172A; background-color: #F1F5F9; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${username}</strong></p>

<p style="margin-top: 0; margin-bottom: 24px;">Before you can sign in and access the system, you must activate your account and set up your password.</p>

${emailButton(activationLink, "Activate Account")}

<p style="margin-top: 0; margin-bottom: 16px; font-size: 14px;">For security reasons, this activation link will expire in 7 days.</p>

<p style="margin-top: 0; margin-bottom: 0; font-size: 14px; color: #A0AAB5;">If you did not expect this email or believe it was sent in error, you can safely ignore it. Your account will remain inactive.</p>
`,
    });
}

export function passwordResetTemplate({
    firstName,
    username,
    resetLink,
}: PasswordResetTemplateOptions): string {
    return emailLayout({
        title: "Reset your Sarjan Healthcare password",
        heading: `Reset your password, ${firstName}`,
        eyebrow: "SECURITY",
        content: `
<p style="margin-top: 0; margin-bottom: 16px;">We received a request to reset the password for your Sarjan Healthcare account.</p>

<p style="margin-top: 0; margin-bottom: 16px;">Your login username is: <strong style="color: #0F172A; background-color: #F1F5F9; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${username}</strong></p>

<p style="margin-top: 0; margin-bottom: 24px;">Click the button below to create a new password. This link will expire in 1 hour.</p>

${emailButton(resetLink, "Reset Password")}

<p style="margin-top: 0; margin-bottom: 16px; font-size: 14px;">For security reasons, this password reset link will expire in 1 hour.</p>

<p style="margin-top: 0; margin-bottom: 0; font-size: 14px; color: #A0AAB5;">If you did not request this password reset or believe it was sent in error, you can safely ignore this email. Your password will not be changed.</p>
`,
    });
}

interface EmailChangeConfirmationTemplateOptions {
    firstName: string;
    username: string;
    confirmLink: string;
}

export function emailChangeConfirmationTemplate({
    firstName,
    username,
    confirmLink,
}: EmailChangeConfirmationTemplateOptions): string {
    return emailLayout({
        title: "Confirm your new Sarjan Healthcare email address",
        heading: `Confirm email change, ${firstName}`,
        eyebrow: "ACCOUNT",
        content: `
<p style="margin-top: 0; margin-bottom: 16px;">We received a request to change the email address associated with your Sarjan Healthcare account.</p>

<p style="margin-top: 0; margin-bottom: 16px;">Your login username is: <strong style="color: #0F172A; background-color: #F1F5F9; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${username}</strong></p>

<p style="margin-top: 0; margin-bottom: 24px;">Click the button below to verify this new email address and complete the update. This link will expire in 24 hours.</p>

${emailButton(confirmLink, "Confirm Email Address")}

<p style="margin-top: 0; margin-bottom: 16px; font-size: 14px;">For security reasons, this confirmation link will expire in 24 hours.</p>

<p style="margin-top: 0; margin-bottom: 0; font-size: 14px; color: #A0AAB5;">If you did not request to change your email address or believe it was sent in error, you can safely ignore this email. Your current email address will remain unchanged.</p>
`,
    });
}

interface AnnouncementTemplateOptions {
    firstName: string;
    message: string;
    type: "info" | "warning" | "danger";
}

const ANNOUNCEMENT_THEME: Record<AnnouncementTemplateOptions["type"], { accentColor: string; eyebrow: string; heading: string }> = {
    info: { accentColor: "#3B82F6", eyebrow: "ANNOUNCEMENT", heading: "New announcement" },
    warning: { accentColor: "#F59E0B", eyebrow: "WARNING", heading: "Important notice" },
    danger: { accentColor: "#EF4444", eyebrow: "URGENT", heading: "Urgent announcement" },
};

interface DoctorShiftNoticeTemplateOptions {
    firstName: string;
    appointmentCount: number;
    firstSlotTime: string;
}

export function doctorShiftNoticeTemplate({ firstName, appointmentCount, firstSlotTime }: DoctorShiftNoticeTemplateOptions): string {
    return emailLayout({
        title: "Your Sarjan Healthcare shift notice",
        heading: `Tomorrow's schedule, Dr. ${firstName}`,
        eyebrow: "SHIFT NOTICE",
        content: `
<p style="margin-top: 0; margin-bottom: 16px;">You have <strong style="color: #0F172A;">${appointmentCount} booked appointment${appointmentCount === 1 ? "" : "s"}</strong> scheduled for tomorrow.</p>

<p style="margin-top: 0; margin-bottom: 0;">Your first appointment is at <strong style="color: #0F172A; background-color: #F1F5F9; padding: 2px 8px; border-radius: 4px;">${firstSlotTime}</strong>.</p>
`,
    });
}

export function announcementTemplate({ firstName, message, type }: AnnouncementTemplateOptions): string {
    const theme = ANNOUNCEMENT_THEME[type];

    return emailLayout({
        title: "Sarjan Healthcare announcement",
        heading: `${theme.heading}, ${firstName}`,
        eyebrow: theme.eyebrow,
        accentColor: theme.accentColor,
        content: `
<p style="margin-top: 0; margin-bottom: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
`,
    });
}
