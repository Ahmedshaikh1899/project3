const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve frontend files from /public
app.use(express.static("public"));

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "orders",
  user: process.env.DB_USER || "orderuser",
  password: process.env.DB_PASSWORD || "changeme"
});

// --------------------------------------------------
// API: Application information + orders
// --------------------------------------------------
app.get("/api", async (req, res) => {
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

    res.status(500).json({
      error: "Unable to retrieve orders"
    });
  }
});

// --------------------------------------------------
// API: Get all orders
// --------------------------------------------------
app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, customer_name, product_name, quantity, status FROM orders ORDER BY id"
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch orders:", error.message);

    res.status(500).json({
      error: "Unable to retrieve orders"
    });
  }
});

// --------------------------------------------------
// API: Get order by ID
// --------------------------------------------------
app.get("/api/orders/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, customer_name, product_name, quantity, status
       FROM orders
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to fetch order:", error.message);

    res.status(500).json({
      error: "Unable to retrieve order"
    });
  }
});

// --------------------------------------------------
// Health check
// Used by Kubernetes liveness probe
// --------------------------------------------------
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "UP",
      database: "UP"
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    res.status(503).json({
      status: "DOWN",
      database: "DOWN"
    });
  }
});

// --------------------------------------------------
// Readiness check
// Used by Kubernetes readiness probe
// --------------------------------------------------
app.get("/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      ready: true
    });
  } catch (error) {
    console.error("Readiness check failed:", error.message);

    res.status(503).json({
      ready: false
    });
  }
});

// --------------------------------------------------
// 404 handler
// --------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

// --------------------------------------------------
// Global error handler
// --------------------------------------------------
app.use((err, req, res, next) => {
  console.error("Unhandled application error:", err);

  res.status(500).json({
    error: "Internal server error"
  });
});

// --------------------------------------------------
// Start server
// --------------------------------------------------
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Customer Order Portal listening on port ${port}`);
});

// --------------------------------------------------
// Graceful shutdown
// Important for Kubernetes
// --------------------------------------------------
function shutdown() {
  console.log("Shutting down application...");

  server.close(async () => {
    try {
      await pool.end();
      console.log("Database connection pool closed.");
      process.exit(0);
    } catch (error) {
      console.error("Error closing database pool:", error.message);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
