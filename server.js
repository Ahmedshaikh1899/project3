const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Prometheus registry and default Node.js/process metrics.
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'customer_order_http_requests_total',
  help: 'Total number of HTTP requests handled by the Customer Order Portal',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'customer_order_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register]
});

const httpRequestsInProgress = new client.Gauge({
  name: 'customer_order_http_requests_in_progress',
  help: 'Number of HTTP requests currently being processed',
  registers: [register]
});

app.use((req, res, next) => {
  if (req.path === '/metrics') return next();

  const start = process.hrtime.bigint();
  httpRequestsInProgress.inc();

  res.on('finish', () => {
    const durationSeconds =
      Number(process.hrtime.bigint() - start) / 1e9;

    const route =
      req.route?.path ||
      (req.path.startsWith('/orders/') ? '/orders/:id' : req.path);

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode)
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsInProgress.dec();
  });

  next();
});

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'orders',
  user: process.env.DB_USER || 'orderuser',
  password: process.env.DB_PASSWORD || 'orderpass123'
});

app.get('/', (req, res) => {
  res.json({
    application: 'Customer Order Portal',
    version: '1.1.0',
    status: 'running'
  });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'UP' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ status: 'DOWN' });
  }
});

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'READY' });
  } catch (err) {
    console.error('Readiness check failed:', err.message);
    res.status(503).json({ status: 'NOT_READY' });
  }
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    console.error('Metrics endpoint failed:', err.message);
    res.status(500).end();
  }
});

app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, customer_name, product_name, quantity, status, created_at FROM orders ORDER BY id'
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('GET /orders failed:', err.message);
    res.status(500).json({ error: 'Unable to load orders' });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, customer_name, product_name, quantity, status, created_at FROM orders WHERE id = $1',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(`GET /orders/${req.params.id} failed:`, err.message);
    res.status(500).json({ error: 'Unable to load order' });
  }
});

app.post('/orders', async (req, res) => {
  const { customer_name, product_name, quantity, status } = req.body;

  if (!customer_name || !product_name || !quantity) {
    return res.status(400).json({
      error: 'customer_name, product_name and quantity are required'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders
        (customer_name, product_name, quantity, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, customer_name, product_name, quantity, status, created_at`,
      [customer_name, product_name, Number(quantity), status || 'PENDING']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /orders failed:', err.message);
    res.status(500).json({ error: 'Unable to create order' });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

const server = app.listen(PORT, () => {
  console.log(`Customer Order Portal listening on port ${PORT}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
