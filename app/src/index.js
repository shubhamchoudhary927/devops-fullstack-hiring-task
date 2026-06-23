const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// database connection using environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,

  ssl: {
    rejectUnauthorized: false
  }
});

// Auto-migration: Create table if it doesn't exist
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err.message);
  }
};
initDB();

// CRUD: Create a Task
app.post('/api/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  
  try {
    const result = await pool.query('INSERT INTO tasks (title) VALUES ($1) RETURNING *', [title]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD: Read Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deep Health Check Endpoint
app.get('/health', async (req, res) => {
  const healthStatus = {
    uptime: process.uptime(),
    status: 'HEALTHY',
    timestamp: new Date(),
    services: {
      database: 'DOWN'
    }
  };

  try {
    // Active ping to database
    await pool.query('SELECT 1');
    healthStatus.services.database = 'UP';
    res.status(200).json(healthStatus);
  } catch (err) {
    healthStatus.status = 'UNHEALTHY';
    healthStatus.error = err.message;
    res.status(500).json(healthStatus);
  }
});

app.get('/', (req, res) => {
  res.status(200).send(`
    <h1> Welcome to DevOps Task API</h1>
    <p>Application is running successfully.</p>
    <ul>
      <li><a href="/health">Health Check</a></li>
      <li><a href="/api/tasks">View Tasks</a></li>
    </ul>
  `);
});

app.listen(port, () => {
  console.log(`Application environment running on port ${port}`);
});