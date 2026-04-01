const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = "secreto_super_seguro"; // luego lo ponemos en env

// 📌 BASE DE DATOS
const db = new sqlite3.Database("/tmp/database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teamA TEXT,
      teamB TEXT,
      scoreA INTEGER,
      scoreB INTEGER
    )
  `);
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  )
`);
});

//REGISTRO
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Campos requeridos" });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: "Contraseña muy corta" });
  }

  const hashed = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, hashed],
    function (err) {
      if (err) return res.status(400).json({ error: "Usuario ya existe" });
      res.json({ message: "Usuario creado" });
    }
  );
});


//LOGIN
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Campos requeridos" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.status(400).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id }, SECRET);

    res.json({ token });
  });
});


//FAVORITOS
db.run(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    team_name TEXT,
    team_logo TEXT
  )
`);


//PROTEGER RUTAS
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No autorizado" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}


//FAVORITOS
app.post("/api/favorites", auth, (req, res) => {
  const { team_name, team_logo } = req.body;

  db.run(
    "INSERT INTO favorites (user_id, team_name, team_logo) VALUES (?, ?, ?)",
    [req.user.id, team_name, team_logo],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ message: "Guardado" });
    }
  );
});


//OBTENER FAVORITOS
app.get("/api/favorites", auth, (req, res) => {
  db.all(
    "SELECT * FROM favorites WHERE user_id = ?",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

//ELIMINAR FAVORITO
app.delete("/api/favorites/:id", auth, (req, res) => {
  db.run(
    "DELETE FROM favorites WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ message: "Eliminado" });
    }
  );
});


// 📌 PARTIDOS GUARDADOS
app.get("/api/matches", (req, res) => {
  db.all("SELECT * FROM matches", [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

// 📌 CREAR PARTIDO
app.post("/api/matches", (req, res) => {
  const { teamA, teamB, scoreA, scoreB } = req.body;

  db.run(
    `INSERT INTO matches (teamA, teamB, scoreA, scoreB) VALUES (?, ?, ?, ?)`,
    [teamA, teamB, scoreA, scoreB],
    function (err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

// 📌 PARTIDOS DEL DIA
app.get("/api/today", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  try {
    const response = await axios.get(
      `https://v3.football.api-sports.io/fixtures?date=${today}`,
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY,
        },
      }
    );

    res.json(response.data.response);
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

// 📡 PARTIDOS EN VIVO
app.get("/api/live-matches", async (req, res) => {
  try {
    const response = await axios.get(
      "https://v3.football.api-sports.io/fixtures?live=all",
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY,
        },
      }
    );

    res.json(response.data.response);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error al obtener partidos" });
  }
});

// 🏆 TABLA REAL (football-data.org)
app.get("/api/standings/:league", async (req, res) => {
  const league = req.params.league;

  // 🔁 MAPEO DE LIGAS
  const leagues = {
    140: "PD",   // La Liga
    39: "PL",    // Premier League
    135: "SA",   // Serie A
    78: "BL1"    // Bundesliga
  };

  const code = leagues[league];

  if (!code) {
    return res.json([]);
  }

  try {
    const response = await axios.get(
      `https://api.football-data.org/v4/competitions/${code}/standings`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_DATA_KEY
        }
      }
    );

    const table = response.data.standings[0].table;

    res.json(table);

  } catch (error) {
    console.error("ERROR FOOTBALL-DATA:", error.response?.data || error.message);
    res.status(500).json({ error: "Error al obtener tabla" });
  }
});


//DETALLE DEL PARTIDO
app.get("/api/match/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const response = await axios.get(
      `https://v3.football.api-sports.io/fixtures?id=${id}`,
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY,
        },
      }
    );

    res.json(response.data.response[0]);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error al obtener detalle" });
  }
});


//ESTADISTICAS
app.get("/api/match-stats/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const response = await axios.get(
      `https://v3.football.api-sports.io/fixtures/statistics?fixture=${id}`,
      {
        headers: {
          "x-apisports-key": process.env.API_FOOTBALL_KEY,
        },
      }
    );

    res.json(response.data.response);

  } catch (error) {
    console.error("ERROR STATS:", error.message);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});


// 🚀 SERVER EN RED
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});