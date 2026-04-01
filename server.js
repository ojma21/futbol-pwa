const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 📌 BASE DE DATOS
const db = new sqlite3.Database("./database.db");

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