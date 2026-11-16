import { redirect } from "next/navigation"

export default function NewRampBookingPage() {
  redirect("/service-requests/new?workflow=ramp")
}
