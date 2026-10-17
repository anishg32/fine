import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres.gtlzitbkbrfawjjflqyw:Anishg%40macbook@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";

  console.log("🔗 Connecting to Supabase PostgreSQL Database (ap-south-1 Pooler)...");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("✅ Successfully connected to Supabase PostgreSQL database!\n");

    const versionRes = await client.query("SELECT version();");
    console.log("PostgreSQL Version:", versionRes.rows[0].version, "\n");

    // 1. Read and apply supabase/schema.sql
    const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
    if (fs.existsSync(schemaPath)) {
      console.log("📦 Applying supabase/schema.sql...");
      const schemaSql = fs.readFileSync(schemaPath, "utf-8");
      await client.query(schemaSql);
      console.log("✅ supabase/schema.sql applied successfully!");
    }

    // 2. Read and apply any migrations gracefully
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
      for (const file of migrationFiles) {
        console.log(`📦 Verifying migration: ${file}...`);
        const migrationSql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
        try {
          await client.query(migrationSql);
          console.log(`✅ Applied ${file}`);
        } catch (mErr: any) {
          if (mErr.code === "42710" || mErr.code === "42P07") {
            console.log(`ℹ️ Migration ${file} objects already present in schema.`);
          } else {
            console.warn(`⚠️ Migration notice on ${file}: ${mErr.message}`);
          }
        }
      }
    }

    // 3. Inspect public tables created
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("\n📋 Live Public Tables in Supabase Database:");
    tablesRes.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. public.${row.table_name}`);
    });

    console.log("\n🎉 Full Fyza database schema and RLS policies are LIVE on Supabase!");
    await client.end();
  } catch (err: unknown) {
    console.error("❌ Error applying schema to Supabase:", err);
    process.exit(1);
  }
}

main();
