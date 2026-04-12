const sql = require("mssql");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  ...(process.env.DB_PORT ? { port: Number(process.env.DB_PORT) } : {}),
  options: {
    ...(!process.env.DB_PORT && process.env.DB_INSTANCE
      ? { instanceName: String(process.env.DB_INSTANCE).trim() }
      : {}),
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== "false",
  },
};

async function migrate() {
  const pool = new sql.ConnectionPool(dbConfig);

  try {
    console.log("🔄 Connecting to SQL Server...");
    await pool.connect();
    console.log("✅ Connected to SQL Server");

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "HostelDB.sql");
    const sqlScript = fs.readFileSync(sqlFilePath, "utf8");

    // Split by GO statements and execute each batch
    const batches = sqlScript.split(/\nGO\s*$/gm).filter((batch) => batch.trim());

    console.log(`📝 Executing ${batches.length} SQL batches...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        try {
          const request = pool.request();
          await request.batch(batch);
          console.log(`✅ Batch ${i + 1}/${batches.length} executed successfully`);
        } catch (error) {
          console.error(`❌ Error in batch ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    console.log("\n🎉 Migration completed successfully!");
    console.log("📊 Tables created:");
    console.log("   - Users");
    console.log("   - Public_Room_Showcase");
    console.log("   - Hostel_Block");
    console.log("   - Room");
    console.log("   - Students");
    console.log("   - Payment");
    console.log("   - Student_Room_Booking");
    console.log("   - Fee_Structure");
    console.log("   - Mess_Menu");
    console.log("   - Maintenance");
    console.log("   - Leave_Request");

    await pool.close();
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
