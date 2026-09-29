interface EmailLayoutOptions {
    title: string;
    heading: string;
    content: string;
    accentColor?: string;
    eyebrow?: string;
}

// Sourced from the client's src/index.css @theme block — keep these in sync
// with the app's actual brand tokens so transactional emails don't visually
// drift from the product.
const BRAND = {
    primary: "#138B78",
    danger: "#E74C3C",
    dangerBg: "#FDECEA",
    warning: "#B7791F",
    warningBg: "#FEF6E7",
    info: "#2563A8",
    infoBg: "#EAF2FB",
    success: "#1F9254",
    successBg: "#E8F7EE",
};

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

export function emailLayout({ title, heading, content, accentColor = BRAND.primary, eyebrow }: EmailLayoutOptions): string {
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

function emailButton(href: string, label: string, accentColor: string = BRAND.primary): string {
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

// A bordered box that puts a single important value front and center —
// e.g. a username — instead of burying it inline in a paragraph.
function emailCredentialBox(label: string, value: string): string {
    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
  <tr>
    <td align="center" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 20px;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94A3B8;">${label}</p>
      <p style="margin: 0; font-size: 20px; font-weight: 700; color: #0F172A; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; letter-spacing: 0.02em;">${value}</p>
    </td>
  </tr>
</table>`;
}

// A two-column fact table for structured data (failed attempts, locked
// until, IP, appointment counts, etc.) instead of a paragraph of prose.
function emailStatGrid(rows: { label: string; value: string }[]): string {
    const rowsHtml = rows
        .map(
            (row, i) => `
    <tr>
      <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #64748B; ${i === 0 ? "" : "border-top: 1px solid #E2E8F0;"}">${row.label}</td>
      <td align="right" style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0F172A; ${i === 0 ? "" : "border-top: 1px solid #E2E8F0;"}">${row.value}</td>
    </tr>`,
        )
        .join("");

    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px; border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;">
  ${rowsHtml}
</table>`;
}

const NOTICE_TONES = {
    info: { bg: BRAND.infoBg, border: BRAND.info, text: "#1E4E80" },
    warning: { bg: BRAND.warningBg, border: BRAND.warning, text: "#8A5A14" },
    danger: { bg: BRAND.dangerBg, border: BRAND.danger, text: "#B03A2E" },
} as const;

// A tinted callout box for reassurance/warning copy — gives that copy actual
// visual weight instead of trailing off as unstyled gray text.
function emailNoticeBox(text: string, tone: keyof typeof NOTICE_TONES = "warning"): string {
    const t = NOTICE_TONES[tone];
    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="background-color: ${t.bg}; border-left: 3px solid ${t.border}; border-radius: 6px; padding: 14px 16px;">
      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${t.text};">${text}</p>
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
        heading: "Checkout blocked — fees not configured ⚠️",
        eyebrow: "ACTION REQUIRED",
        accentColor: BRAND.warning,
        content: `
<p style="margin-top: 0; margin-bottom: 16px;">A receptionist just attempted to check out a patient for <strong style="color: #0F172A;">Dr. ${doctorName}</strong>, but the doctor's consultation fees (old-case / new-case) are not yet configured.</p>

<p style="margin-top: 0; margin-bottom: 24px;">Checkout for this doctor's patients will remain blocked until both fees are set.</p>

${emailNoticeBox("Please set these fees as soon as possible from the admin Pricing Management page.", "warning")}
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
        heading: `Welcome, ${firstName}! 🔑`,
        eyebrow: "WELCOME",
        content: `
<p style="margin-top: 0; margin-bottom: 20px;">An administrator has just created a new staff account for you at Sarjan Healthcare. Before you can sign in, activate your account and set up your password.</p>

${emailCredentialBox("Your username", username)}

${emailButton(activationLink, "Activate Account")}

${emailNoticeBox("This activation link expires in 7 days. If you did not expect this email, you can safely ignore it — your account will remain inactive.", "warning")}
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
        heading: `Reset your password, ${firstName} 🔒`,
        eyebrow: "SECURITY",
        content: `
<p style="margin-top: 0; margin-bottom: 8px;">We received a request to reset the password for your Sarjan Healthcare account.</p>
<p style="margin-top: 0; margin-bottom: 24px; font-size: 14px; color: #64748B;">Username: <strong style="color: #0F172A;">${username}</strong></p>

${emailButton(resetLink, "Reset Password")}

${emailNoticeBox("This link expires in 1 hour. If you did not request this password reset, you can safely ignore this email — your password will not be changed.", "warning")}
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
        heading: `Confirm email change, ${firstName} ✉️`,
        eyebrow: "ACCOUNT",
        accentColor: BRAND.info,
        content: `
<p style="margin-top: 0; margin-bottom: 20px;">We received a request to change the email address associated with your Sarjan Healthcare account.</p>

${emailCredentialBox("Your username", username)}

${emailButton(confirmLink, "Confirm Email Address", BRAND.info)}

${emailNoticeBox("This confirmation link expires in 24 hours. If you did not request this change, you can safely ignore this email — your current email address will remain unchanged.", "info")}
`,
    });
}

interface AnnouncementTemplateOptions {
    firstName: string;
    message: string;
    type: "info" | "warning" | "danger";
}

const ANNOUNCEMENT_THEME: Record<AnnouncementTemplateOptions["type"], { accentColor: string; eyebrow: string; heading: string }> = {
    info: { accentColor: BRAND.info, eyebrow: "ANNOUNCEMENT", heading: "New announcement" },
    warning: { accentColor: BRAND.warning, eyebrow: "WARNING", heading: "Important notice" },
    danger: { accentColor: BRAND.danger, eyebrow: "URGENT", heading: "Urgent announcement" },
};

interface SecurityAlertTemplateOptions {
    developerFirstName: string;
    staffName: string;
    username: string;
    failedAttempts: number;
    lockedUntilFormatted: string;
    ipAddress?: string;
}

export function securityAlertTemplate({
    developerFirstName,
    staffName,
    username,
    failedAttempts,
    lockedUntilFormatted,
    ipAddress,
}: SecurityAlertTemplateOptions): string {
    return emailLayout({
        title: "Security alert: account locked after repeated failed logins",
        heading: `Security alert, ${developerFirstName} 🛡️`,
        eyebrow: "SECURITY ALERT",
        accentColor: BRAND.danger,
        content: `
<p style="margin-top: 0; margin-bottom: 20px;">The account below was automatically locked after repeated failed login attempts — a pattern consistent with a brute-force attempt.</p>

${emailStatGrid([
    { label: "Account", value: `${staffName} (${username})` },
    { label: "Failed attempts", value: String(failedAttempts) },
    { label: "Locked until", value: lockedUntilFormatted },
    ...(ipAddress ? [{ label: "Last IP address", value: ipAddress }] : []),
])}

${emailNoticeBox("This is an automated alert — no action is required unless you suspect this wasn't the account owner attempting to log in. The owner has separately been emailed a link to reset their password and unlock the account early.", "danger")}
`,
    });
}

interface AccountLockedTemplateOptions {
    firstName: string;
    username: string;
    failedAttempts: number;
    lockedUntilFormatted: string;
    resetLink: string;
}

export function accountLockedTemplate({
    firstName,
    username,
    failedAttempts,
    lockedUntilFormatted,
    resetLink,
}: AccountLockedTemplateOptions): string {
    return emailLayout({
        title: "Your Sarjan Healthcare account has been locked",
        heading: `Your account was locked, ${firstName} 🔒`,
        eyebrow: "ACCOUNT LOCKED",
        accentColor: BRAND.danger,
        content: `
<p style="margin-top: 0; margin-bottom: 20px;">Your account (<strong style="color: #0F172A;">${username}</strong>) was temporarily locked after too many failed login attempts.</p>

${emailStatGrid([
    { label: "Failed attempts", value: String(failedAttempts) },
    { label: "Auto-unlocks at", value: lockedUntilFormatted },
])}

<p style="margin-top: 0; margin-bottom: 20px; font-size: 15px; font-weight: 600; color: #0F172A;">Reset your password now to unlock your account immediately — no need to wait.</p>

${emailButton(resetLink, "Reset Password & Unlock Now", BRAND.primary)}

${emailNoticeBox("If this was you, resetting your password will unlock your account right away. If this <strong>wasn't</strong> you, reset your password anyway to secure your account — this link expires in 1 hour.", "info")}
`,
    });
}

interface DoctorShiftNoticeTemplateOptions {
    firstName: string;
    appointmentCount: number;
    firstSlotTime: string;
}

export function doctorShiftNoticeTemplate({ firstName, appointmentCount, firstSlotTime }: DoctorShiftNoticeTemplateOptions): string {
    return emailLayout({
        title: "Your Sarjan Healthcare shift notice",
        heading: `Tomorrow's schedule, Dr. ${firstName} 📅`,
        eyebrow: "SHIFT NOTICE",
        content: `
<p style="margin-top: 0; margin-bottom: 20px;">Here's a quick look at tomorrow's schedule.</p>

${emailStatGrid([
    { label: "Booked appointments", value: `${appointmentCount}` },
    { label: "First appointment", value: firstSlotTime },
])}
`,
    });
}

interface BugReportTemplateOptions {
    reportId: number;
    reporterName: string;
    reporterRoles: string[];
    reporterUsername: string;
    pageLabel: string;
    pagePath: string;
    description: string;
    userAgent?: string;
    submittedAtFormatted: string;
    serverVersion: string;
}

// Every value here is user-supplied (or user-influenced), and the shared
// helpers above don't escape — so escape at the point of use.
export function bugReportTemplate({
    reportId,
    reporterName,
    reporterRoles,
    reporterUsername,
    pageLabel,
    pagePath,
    description,
    userAgent,
    submittedAtFormatted,
    serverVersion,
}: BugReportTemplateOptions): string {
    const roles = reporterRoles.length > 0 ? reporterRoles.join(", ") : "—";

    return emailLayout({
        title: `Bug report #${reportId}`,
        heading: `Bug report #${reportId}`,
        eyebrow: "STAFF REPORT",
        accentColor: BRAND.warning,
        content: `
<p style="margin-top: 0; margin-bottom: 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #94A3B8;">What they wrote</p>
<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 18px; margin-bottom: 24px;">
  <p style="margin: 0; white-space: pre-wrap; color: #0F172A; font-size: 15px; line-height: 1.6;">${escapeHtml(description)}</p>
</div>

${emailStatGrid([
    { label: "Reported by", value: `${escapeHtml(reporterName)} (${escapeHtml(reporterUsername)})` },
    { label: "Role", value: escapeHtml(roles) },
    { label: "Page", value: escapeHtml(pageLabel) },
    { label: "Page path", value: escapeHtml(pagePath || "—") },
    { label: "Submitted", value: escapeHtml(submittedAtFormatted) },
    { label: "Server version", value: escapeHtml(serverVersion) },
    { label: "Device", value: escapeHtml(userAgent || "—") },
])}

${emailNoticeBox("Reply to this email to answer the reporter directly. The same report is also saved on the Reports page of the developer dashboard.", "info")}
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
