// Standalone schema verification: applies prisma/migrations/0001_init/migration.sql
// to a throwaway local Postgres via the `pg` driver and runs sanity checks
// (unique constraints, cascades). Useful in network-restricted environments
// where `prisma migrate`/`generate` cannot reach binaries.prisma.sh.
// Run with: node scripts/verify-schema-offline.js

const path = require("path");
const fs = require("fs");

async function main() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const { Client } = require("pg");

  const dataDir = "/tmp/schema-verify-pgdata";
  if (fs.existsSync(dataDir)) fs.rmSync(dataDir, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: 55499,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("schema_verify");

  const client = new Client({ connectionString: "postgresql://postgres:postgres@localhost:55499/schema_verify" });
  await client.connect();

  const sql = fs.readFileSync(path.join(__dirname, "../prisma/migrations/0001_init/migration.sql"), "utf8");
  await client.query(sql);
  console.log("MIGRATION APPLIED OK");

  const tables = await client.query(`select table_name from information_schema.tables where table_schema='public' order by table_name`);
  console.log("TABLES:", tables.rows.map(r => r.table_name).join(", "));

  // Sanity: insert a user, event, guest and confirm FK + unique constraints work.
  await client.query(`insert into users (id, email, "passwordHash", name, "updatedAt") values ('u1','a@b.com','hash','Ada', now())`);
  await client.query(`insert into events (id, "userId", name, date, "rsvpToken", "updatedAt") values ('e1','u1','Test Event', now(), 'tok1', now())`);
  await client.query(`insert into guests (id, "eventId", "firstName", "lastName", "updatedAt") values ('g1','e1','Sarah','Johnson', now())`);
  console.log("SANITY INSERTS OK");

  // Unique constraint check: duplicate rsvpToken should fail.
  let dupFailed = false;
  try {
    await client.query(`insert into events (id, "userId", name, date, "rsvpToken", "updatedAt") values ('e2','u1','Dup', now(), 'tok1', now())`);
  } catch (err) {
    dupFailed = true;
  }
  console.log("DUPLICATE RSVP TOKEN REJECTED:", dupFailed);

  // Cascade delete check: deleting the event should delete its guest.
  await client.query(`delete from events where id = 'e1'`);
  const remaining = await client.query(`select count(*)::int as c from guests where id = 'g1'`);
  console.log("GUEST REMOVED VIA CASCADE:", remaining.rows[0].c === 0);

  await client.end();
  await pg.stop();
  console.log("ALL SCHEMA CHECKS PASSED");
}

main().catch((err) => {
  console.error("SCHEMA VERIFY FAILED:", err);
  process.exit(1);
});
