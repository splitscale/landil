import nodemailer from "nodemailer";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: EmailPayload) {
  const transporter = getTransporter();
  if (!transporter) return; // silently skip if SMTP not configured
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? `Landil <noreply@landil.app>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

// ── Notification email templates ──────────────────────────────────────────────

function layout(title: string, body: string, ctaHref?: string, ctaLabel?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { padding: 24px 32px 0; }
    .brand { font-size: 16px; font-weight: 700; color: #111827; }
    .content { padding: 24px 32px; }
    .title { font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px; }
    .body { font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px; }
    .cta { display: inline-block; background: #111827; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; }
    .footer { padding: 16px 32px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><span class="brand">Landil</span></div>
    <div class="content">
      <p class="title">${title}</p>
      <p class="body">${body}</p>
      ${ctaHref ? `<a href="${BASE_URL}${ctaHref}" class="cta">${ctaLabel ?? "View"}</a>` : ""}
    </div>
    <div class="footer">You received this because you have an account on Landil.</div>
  </div>
</body>
</html>`;
}

export type NotificationEmailParams = {
  recipientEmail: string;
  type: string;
  title: string;
  body: string;
  /** offerId — used to build the CTA link */
  offerId?: string;
  /** listingId — used to build the CTA link */
  listingId?: string;
  /** true = recipient is buyer */
  isBuyer?: boolean;
  /** formatted counter amount string e.g. "₱480,000" */
  counterAmount?: string;
};

export async function sendNotificationEmail({
  recipientEmail,
  type,
  title,
  body,
  offerId,
  listingId,
  isBuyer,
}: NotificationEmailParams) {
  let ctaHref: string | undefined;

  if (offerId && listingId) {
    ctaHref = isBuyer
      ? `/listings/${listingId}/my-offer`
      : `/listings/${listingId}/offers/${offerId}`;
  }

  const subjectMap: Record<string, string> = {
    new_offer:        "You received a new offer",
    offer_accepted:   "Your offer was accepted",
    offer_rejected:   "Your offer was declined",
    offer_countered:  "Seller sent a counter-offer",
    offer_withdrawn:  "Offer was withdrawn",
    offer_message:    "New message on your offer",
  };

  const subject = subjectMap[type] ?? title;

  await sendEmail({
    to: recipientEmail,
    subject,
    html: layout(title, body, ctaHref, "View offer"),
  });
}
