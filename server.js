const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "orders",
  user: process.env.DB_USER || "orderuser",
  password: process.env.DB_PASSWORD || "changeme"
});

app.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, customer_name, product_name, quantity, status FROM orders ORDER BY id"
    );
    res.json({
      application: "Customer Order Portal",
      version: "1.0.0",
      orders: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch orders:", error.message);
    res.status(500).json({ error: "Unable to retrieve orders" });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, customer_name, product_name, quantity, status FROM orders ORDER BY id"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch orders:", error.message);
    res.status(500).json({ error: "Unable to retrieve orders" });
  }
});

app.get("/orders/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, customer_name, product_name, quantity, status FROM orders WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to fetch order:", error.message);
    res.status(500).json({ error: "Unable to retrieve order" });
  }
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "UP", database: "UP" });
  } catch (error) {
    res.status(503).json({ status: "DOWN", database: "DOWN" });
  }
});

app.get("/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Customer Order Portal listening on port ${port}`);
});

function shutdown() {
  console.log("Shutting down application...");
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
