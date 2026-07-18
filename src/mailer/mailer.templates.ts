interface EmailLayoutOptions {
    title: string;
    heading: string;
    content: string;
}

export function emailLayout({ title, heading, content }: EmailLayoutOptions): string {
    // URL encoded SVG for the logo
    const logoSvg = "data:image/svg+xml,%3Csvg width='96' height='96' viewBox='0 0 96 96' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14.8812 29.0694H31.2273L31.2818 47.454C31.2818 47.454 26.112 53.3771 23.4197 56.1464C20.7274 58.9156 13.7658 65.6464 13.7658 65.6464C3.49659 55.8771 2.95817 39.531 14.8812 29.0694Z' fill='%23355D65'/%3E%3Cpath d='M22.7275 56.8002C19.8184 59.8771 13.766 65.6463 13.766 65.6463C13.766 65.6463 12.0352 67.1079 9.9198 68.5694C13.9967 66.5309 18.8813 62.7232 24.1121 57.3002C29.3429 51.8771 33.0373 47.454 38.6121 41.8002C45.7797 34.5309 54.689 29.4925 64.189 28.4156L65.1506 26.454V13.1848C54.766 1.18478 39.1121 3.41555 31.2281 13.1848V29.2617L31.282 47.454C31.282 47.454 25.6366 53.7232 22.7275 56.8002Z' fill='%2376AA9D'/%3E%3Cpath d='M24.1121 57.3001C18.8813 62.7232 13.8429 66.6463 9.76594 68.6848C8.99689 69.0693 7.95825 69.5694 7.95825 69.5694C9.58499 69.5253 11.2792 68.7842 15.2275 66.7617C16.189 67.4155 17.8044 67.0694 23.5736 67.1463C20.0924 69.1869 18.024 70.1558 14.2275 71.7232C16.8267 71.6095 20.3813 70.4912 27.0736 67.3386C33.7659 64.186 48.3429 52.9925 55.6121 44.1463C62.8813 35.3001 65.9582 27.454 65.9582 27.454C68.2838 20.493 68.6582 18.1508 68.4582 15.9155C67.9955 18.8105 67.6636 20.3277 66.7275 22.5309L64.189 28.4155C54.689 29.4924 45.7797 34.5309 38.6121 41.8001C33.0373 47.454 29.3429 51.8771 24.1121 57.3001Z' fill='%23355D65'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M62.8847 43.6291C59.7693 50.5522 49.5385 62.706 38.3077 65.706C53.9478 55.0221 64.4395 41.2361 67.9231 29.0769C71.5537 29.0769 75.9111 29.0994 78.6924 29.0769C71.2308 31.8599 66 36.706 62.8847 43.6291Z' fill='%23355D65'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M31.2307 82.9615V70.0769C33.7828 68.632 35.9509 67.3144 38.2692 65.7307C49.4999 62.7307 59.7307 50.5769 62.8461 43.6538C65.9615 36.7307 71.1538 31.8598 78.6153 29.0769C79.7507 29.0677 81.4615 29.0769 81.4615 29.0769C75.1153 31.9615 69.3076 34.923 65.0769 42V67.3077V82.9615C55.8076 94.5769 39.8461 93.9231 31.2307 82.9615Z' fill='%2376AA9D'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M65 42C69.2308 34.9231 75.0385 31.9616 81.3846 29.0769C94.7692 40.7692 92.1538 58.7308 81 67.3077H65V42Z' fill='%23355D65'/%3E%3C/svg%3E";

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

export function staffActivationTemplate({
    firstName,
    username,
    activationLink,
}: StaffActivationTemplateOptions): string {
    return emailLayout({
        title: "Activate your Sarjan Healthcare account",
        heading: `Welcome, ${firstName}!`,
        content: `
        <p style="margin-top: 0; margin-bottom: 16px;">Hi ${firstName},</p>

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
