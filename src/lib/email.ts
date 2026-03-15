import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendPasswordResetEmailParams {
  to: string;
  resetLink: string;
}

export async function sendPasswordResetEmail({
  to,
  resetLink,
}: SendPasswordResetEmailParams) {
  const emailFrom = process.env.EMAIL_FROM;

  if (!emailFrom) {
    throw new Error(
      "EMAIL_FROM environment variable is not configured. Please set it to send password reset emails.",
    );
  }

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to,
      subject: "Reset your bugbook password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Reset Your Password</h1>
          <p style="color: #666; font-size: 16px;">
            You requested a password reset for your bugbook account. 
            Click the button below to reset your password.
          </p>
          <a 
            href="${resetLink}" 
            style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;"
          >
            Reset Password
          </a>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this password reset, 
            you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <a href="${resetLink}" style="color: #0070f3;">${resetLink}</a>
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.error("Resend API error:", result.error);
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    return result;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}

