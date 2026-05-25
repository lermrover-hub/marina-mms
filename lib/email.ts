import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.EMAIL_FROM ?? "Marina MMS <noreply@marina-mms.com>"
const SITE_URL   = process.env.NEXTAUTH_URL ?? "https://marina-mms.vercel.app"

export { SITE_URL }

type EmailPayload = {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail(
  payload: EmailPayload,
): Promise<{ success: boolean; id?: string }> {
  if (!resend) {
    console.log(
      "[Email - not configured] Would send to:",
      payload.to,
      "Subject:",
      payload.subject,
    )
    return { success: true, id: "mock-" + Date.now() }
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
    })
    if (error) {
      console.error("[Email error]", error)
      return { success: false }
    }
    return { success: true, id: data?.id }
  } catch (err) {
    console.error("[Email exception]", err)
    return { success: false }
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}
