const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const SECRET = "secreto_super_seguro";

// ============================
// DB
// ============================
const db = new sqlite3.Database("/tmp/database.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    team_name TEXT,
    team_logo TEXT
  )`);
});

// ============================
// CONFIG APIs
// ============================
const API_FOOTBALL = "https://v3.football.api-sports.io";
const API_FD = "https://api.football-data.org/v4";

// ============================
// CACHE
// ============================
const cache = {
  live: { data: null, time: 0 },
  today: { data: null, time: 0 },
  standings: {}
};

function isValid(cacheObj, ttl) {
  return cacheObj.data && (Date.now() - cacheObj.time < ttl);
}

async function fetchApiFootball(url) {
  const res = await axios.get(`${API_FOOTBALL}${url}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY }
  });
  return res.data.response;
}

async function fetchFootballData(url) {
  const res = await axios.get(`${API_FD}${url}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_KEY }
  });
  return res.data;
}

// ============================
// AUTH
// ============================
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No autorizado" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// ============================
// LOGIN / REGISTER
// ============================
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, hashed],
    err => {
      if (err) return res.status(400).json({ error: "Usuario existe" });
      res.json({ ok: true });
    }
  );
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email=?", [email], async (err, user) => {
    if (!user) return res.status(400).json({ error: "No existe" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Error" });

    const token = jwt.sign({ id: user.id }, SECRET);
    res.json({ token });
  });
});

// ============================
// FAVORITOS
// ============================
app.get("/api/favorites", auth, (req, res) => {
  db.all("SELECT * FROM favorites WHERE user_id=?", [req.user.id], (e, rows) => {
    res.json(rows);
  });
});

app.post("/api/favorites", auth, (req, res) => {
  const { team_name, team_logo } = req.body;

  db.run(
    "INSERT INTO favorites (user_id, team_name, team_logo) VALUES (?, ?, ?)",
    [req.user.id, team_name, team_logo],
    () => res.json({ ok: true })
  );
});

// ============================
// 🔴 LIVE (CACHE 30s)
// ============================
app.get("/api/live-matches", async (req, res) => {
  if (isValid(cache.live, 30000)) return res.json(cache.live.data);

  const data = await fetchApiFootball("/fixtures?live=all");

  cache.live = { data, time: Date.now() };
  res.json(data);
});

// ============================
// 📅 TODAY (CACHE 5min)
// ============================
app.get("/api/today", async (req, res) => {
  if (isValid(cache.today, 300000)) return res.json(cache.today.data);

  const today = new Date().toISOString().split("T")[0];
  const data = await fetchApiFootball(`/fixtures?date=${today}`);

  cache.today = { data, time: Date.now() };
  res.json(data);
});

// ============================
// 🏆 STANDINGS MIX
// ============================
const mapFD = { 140:"PD",39:"PL",135:"SA",78:"BL1",61:"FL1" };

app.get("/api/standings/:league", async (req, res) => {
  const league = req.params.league;

  if (cache.standings[league] && Date.now() - cache.standings[league].time < 3600000) {
    return res.json(cache.standings[league].data);
  }

  let data;

  if (mapFD[league]) {
    const fd = await fetchFootballData(`/competitions/${mapFD[league]}/standings`);
    data = fd.standings[0].table.map(t => ({
      team:{ name:t.team.name, logo:t.team.crest },
      points:t.points
    }));
  } else {
    const af = await fetchApiFootball(`/standings?league=${league}&season=2024`);
    data = af[0].league.standings[0];
  }

  cache.standings[league] = { data, time: Date.now() };
  res.json(data);
});

// ============================
// DETALLE PARTIDO
// ============================
app.get("/api/match/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // 🔹 PARTIDO
    const match = await fetchApiFootball(`/fixtures?id=${id}`);

    // 🔥 EVENTOS (CLAVE)
    const events = await fetchApiFootball(`/fixtures/events?fixture=${id}`);

    res.json({
      ...match[0],
      events: events || []
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error cargando partido" });
  }
});

