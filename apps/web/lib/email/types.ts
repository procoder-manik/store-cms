export type EmailEvent =
  | "welcome" | "verify_email" | "password_reset" | "password_changed" | "new_login"
  | "order_placed" | "payment_received" | "payment_failed" | "order_confirmed" | "order_processing"
  | "order_shipped" | "out_for_delivery" | "order_delivered" | "order_cancelled"
  | "return_received" | "return_approved" | "return_rejected" | "refund_processed"
  | "abandoned_cart_1h" | "abandoned_cart_24h" | "back_in_stock" | "price_drop"
  | "newsletter_confirm" | "loyalty_points" | "contact_autoreply" | "account_deleted"
  | "admin_new_order" | "admin_low_stock" | "admin_review_pending" | "admin_return_request"
  | "staff_invite" | "admin_integration_error" | "admin_daily_summary";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer | string }[];
  replyTo?: string;
}

/** Resend, Brevo or SMTP implement this. Sends go through the email_queue table. */
export interface EmailProvider {
  id: "resend" | "brevo" | "smtp";
  send(message: EmailMessage): Promise<{ id: string }>;
}
