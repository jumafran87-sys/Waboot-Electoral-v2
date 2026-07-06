import mysql from "mysql2/promise";

let db;

export async function connectDB() {
  try {
    db = await mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "padron_2026",
      waitForConnections: true,
      connectionLimit: 10,
    });

    // Probar conexión
    await db.query("SELECT 1");
    console.log("✅ MySQL conectado correctamente");
    return db;
  } catch (err) {
    console.error("❌ Error conectando a MySQL. Reintentando en 5 segundos...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectDB();
  }
}

export { db };