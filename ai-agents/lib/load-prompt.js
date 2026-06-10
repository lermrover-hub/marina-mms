/**
 * Load a prompt from /prompts/<name>.md at module init.
 * Falls back to the provided embedded string if the file is not found.
 *
 * Usage:
 *   import { loadPrompt } from "../lib/load-prompt.js"
 *   const SYSTEM = loadPrompt("comms-agent-system", FALLBACK_STRING)
 */
import fs   from "fs"
import path from "path"
import { fileURLToPath } from "url"

const PROMPTS_DIR = path.join(fileURLToPath(import.meta.url), "..", "..", "prompts")

export function loadPrompt(name, fallback = "") {
  try {
    const filePath = path.join(PROMPTS_DIR, `${name}.md`)
    return fs.readFileSync(filePath, "utf8").trim()
  } catch {
    return fallback
  }
}
