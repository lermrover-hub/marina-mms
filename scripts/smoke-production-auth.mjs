const baseUrl = process.argv[2] ?? "https://marina-mms.vercel.app"

function mergeCookies(existing, response) {
  const setCookie = response.headers.getSetCookie?.() ?? []
  const jar = new Map(existing.split(";").filter(Boolean).map((part) => {
    const [key, ...rest] = part.trim().split("=")
    return [key, rest.join("=")]
  }))
  for (const cookie of setCookie) {
    const [pair] = cookie.split(";")
    const [key, ...rest] = pair.split("=")
    jar.set(key, rest.join("="))
  }
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ")
}

let cookies = ""
const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`)
cookies = mergeCookies(cookies, csrfResponse)
const { csrfToken } = await csrfResponse.json()

const form = new URLSearchParams({
  csrfToken,
  email: "admin@marina.com",
  password: "admin123",
  redirect: "false",
  callbackUrl: `${baseUrl}/dashboard`,
  json: "true",
})

const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    cookie: cookies,
  },
  body: form,
  redirect: "manual",
})
cookies = mergeCookies(cookies, loginResponse)

const checks = []
for (const path of [
  "/api/auth/session",
  "/api/db/notifications",
  "/api/db/customers",
  "/api/db/berth-assignments",
]) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { cookie: cookies }, redirect: "manual" })
  checks.push({ path, status: response.status, location: response.headers.get("location") })
}

console.log(JSON.stringify({ loginStatus: loginResponse.status, checks }, null, 2))
