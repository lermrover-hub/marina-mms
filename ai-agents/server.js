/**
 * Agent HTTP Server
 * Exposes channel endpoints so external systems can trigger agents via HTTP.
 *
 * POST /webhook/line      – LINE OA direct events
 * POST /trigger/email     – inbound email (SendGrid/Postmark)
 * POST /trigger/form      – staff / web form manual trigger
 * GET  /health            – liveness check
 *
 * Start: node server.js  (or npm run server)
 */

import "dotenv/config"
import http from "http"
import { handleLinePayload }  from "./channels/line-webhook.js"
import { handleEmail }        from "./channels/email-handler.js"
import { handleWebForm }      from "./channels/web-form-handler.js"

const PORT = process.env.AGENT_SERVER_PORT ?? 4000

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", c => chunks.push(c))
    req.on("end",  () => resolve(Buffer.concat(chunks)))
    req.on("error", reject)
  })
}

function json(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  const url = req.url?.split("?")[0]

  // Health check
  if (req.method === "GET" && url === "/health") {
    return json(res, 200, { ok: true, ts: new Date().toISOString() })
  }

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" })

  let rawBody, parsed
  try {
    rawBody = await readBody(req)
    parsed  = JSON.parse(rawBody.toString())
  } catch {
    return json(res, 400, { error: "Invalid JSON body" })
  }

  try {
    if (url === "/webhook/line") {
      const sig = req.headers["x-line-signature"]
      const result = await handleLinePayload(rawBody.toString(), sig)
      return json(res, 200, { ok: true, result })
    }

    if (url === "/trigger/email") {
      const result = await handleEmail(parsed)
      return json(res, 200, { ok: true, result })
    }

    if (url === "/trigger/form") {
      const result = await handleWebForm(parsed)
      return json(res, 200, { ok: result.ok, result })
    }

    return json(res, 404, { error: "Unknown route" })
  } catch (err) {
    console.error("[Server] Error:", err.message)
    return json(res, 500, { error: err.message })
  }
})

server.listen(PORT, () => {
  console.log(`\nMarina MMS Agent Server`)
  console.log(`  Listening on http://localhost:${PORT}`)
  console.log(`  API base: ${process.env.MARINA_API_BASE ?? "http://localhost:3000"}`)
  console.log(`  Endpoints: /health  /webhook/line  /trigger/email  /trigger/form\n`)
})
