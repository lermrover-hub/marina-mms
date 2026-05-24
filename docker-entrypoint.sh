#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Waiting for database..."
  node - <<'NODE'
const net = require("net");
const url = new URL(process.env.DATABASE_URL);
const host = url.hostname;
const port = Number(url.port || 5432);
let attempts = 0;

function check() {
  attempts += 1;
  const socket = net.createConnection({ host, port });
  socket.setTimeout(1000);
  socket.on("connect", () => {
    socket.end();
    process.exit(0);
  });
  socket.on("timeout", retry);
  socket.on("error", retry);
}

function retry() {
  if (attempts >= 60) {
    console.error(`Database not reachable at ${host}:${port}`);
    process.exit(1);
  }
  setTimeout(check, 1000);
}

check();
NODE

  echo "Synchronizing Prisma schema..."
  npx prisma db push
fi

exec "$@"
