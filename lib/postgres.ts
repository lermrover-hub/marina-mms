import { Pool, type PoolClient, type QueryResultRow } from "pg"

declare global {
  var marinaPostgresPool: Pool | undefined
}

function getPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not configured")

  if (!global.marinaPostgresPool) {
    global.marinaPostgresPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    })
  }
  return global.marinaPostgresPool
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values)
}

export async function dbTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const result = await work(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export function apiErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) return String(error.message)
  return String(error)
}

export function buildUpdate(input: Record<string, unknown>, allowed: readonly string[]) {
  const keys = allowed.filter((key) => Object.prototype.hasOwnProperty.call(input, key))
  return {
    keys,
    clause: keys.map((key, index) => `${key} = $${index + 1}`).join(", "),
    values: keys.map((key) => input[key] === "" ? null : input[key]),
  }
}
