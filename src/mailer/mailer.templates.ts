interface EmailLayoutOptions {
    title: string;
    heading: string;
    content: string;
}

export function emailLayout({ title, heading, content }: EmailLayoutOptions): string {
    // URL encoded SVG for the logo
    const logoSvg = "https://sarjan-healthcare-client-dqg8.vercel.app/images/logo-icon.svg"

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
        padding: 30px 20px 20px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; -webkit-font-smoothing: antialiased;">
  <table id="backgroundTable" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; width: 100%; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <table class="content-table" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          
          <!-- Green Accent Line -->
          <tr>
            <td height="4" style="background-color: #138B78; font-size: 4px; line-height: 4px;">&nbsp;</td>
          </tr>

          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 32px 20px 10px 20px; border-bottom: 1px solid #F1F5F9;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <!-- Logo Icon -->
                  <td align="center" valign="middle" style="padding-right: 12px;">
                    <div style="background-color: rgba(19, 139, 120, 0.1); padding: 8px; border-radius: 10px; display: inline-block;">
                      <img src="${logoSvg}" alt="Logo" width="24" height="24" style="display: block; width: 24px; height: 24px;" />
                    </div>
                  </td>
                  <!-- Logo Text -->
                  <td align="left" valign="middle">
                    <div style="font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      <div style="font-weight: 800; font-size: 18px; color: #111827; letter-spacing: -0.02em; line-height: 1;">SARJAN</div>
                      <div style="font-weight: 700; font-size: 11px; color: #138B78; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 2px; line-height: 1;">HEALTHCARE</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="content-cell" style="padding: 40px 40px 30px 40px;">
              <h2 style="color: #0F172A; margin-top: 0; margin-bottom: 24px; font-size: 20px; font-weight: 600; letter-spacing: -0.01em;">${heading}</h2>
              
              <div style="color: #475569; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #F8FAFC; padding: 24px 30px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 8px 0; color: #94A3B8; font-size: 13px;">
                &copy; 2026 Sarjan Healthcare. All rights reserved.
              </p>
              <p style="margin: 0; color: #94A3B8; font-size: 13px;">
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
        content: `
<p style="margin-top: 0; margin-bottom: 16px;">An administrator has just created a new staff account for you at Sarjan Healthcare.</p>

<p style="margin-top: 0; margin-bottom: 16px;">Your login username is: <strong style="color: #0F172A; background-color: #F1F5F9; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${username}</strong></p>

<p style="margin-top: 0; margin-bottom: 24px;">Before you can sign in and access the system, you must activate your account and set up your password.</p>

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
  <tr>
    <td>
      <table border="0" cellspacing="0" cellpadding="0">
        <tr>
          <!-- The button background and border-radius match .btn-primary (.rounded-lg, .bg-primary) -->
          <td align="center" style="border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" bgcolor="#138B78">
            <a href="${activationLink}" target="_blank" style="font-size: 15px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 24px; display: inline-block; font-weight: 600;">Activate Account</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

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
        content: `
<p style="margin-top: 0; margin-bottom: 16px;">We received a request to reset the password for your Sarjan Healthcare account.</p>

<p style="margin-top: 0; margin-bottom: 16px;">Your login username is: <strong style="color: #0F172A; background-color: #F1F5F9; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${username}</strong></p>

<p style="margin-top: 0; margin-bottom: 24px;">Click the button below to create a new password. This link will expire in 1 hour.</p>

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
  <tr>
    <td>
      <table border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" bgcolor="#138B78">
            <a href="${resetLink}" target="_blank" style="font-size: 15px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 24px; display: inline-block; font-weight: 600;">Reset Password</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

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
        content: `
<p style="margin-top: 0; margin-bottom: 16px;">We received a request to change the email address associated with your Sarjan Healthcare account.</p>

<p style="margin-top: 0; margin-bottom: 16px;">Your login username is: <strong style="color: #0F172A; background-color: #F1F5F9; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${username}</strong></p>

<p style="margin-top: 0; margin-bottom: 24px;">Click the button below to verify this new email address and complete the update. This link will expire in 24 hours.</p>

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
  <tr>
    <td>
      <table border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" bgcolor="#138B78">
            <a href="${confirmLink}" target="_blank" style="font-size: 15px; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 24px; display: inline-block; font-weight: 600;">Confirm Email Address</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<p style="margin-top: 0; margin-bottom: 16px; font-size: 14px;">For security reasons, this confirmation link will expire in 24 hours.</p>

<p style="margin-top: 0; margin-bottom: 0; font-size: 14px; color: #A0AAB5;">If you did not request to change your email address or believe it was sent in error, you can safely ignore this email. Your current email address will remain unchanged.</p>
`,
    });
}

