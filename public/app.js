const API = "/api";

let currentFilter = "all";

// ============================
// FETCH
// ============================

async function fetchData(url) {
  try {
    const res = await fetch(API + url);

    if (!res.ok) {
      console.log("Error API:", url);
      return [];
    }

    const data = await res.json();
    return data;

  } catch (err) {
    console.log("ERROR FETCH:", err);
    return [];
  }
}

// ============================
// MATCHES
// ============================

async function loadMatches() {
  const container = document.getElementById("matches");

  // 🔥 NO BORRAR contenido mientras carga
  if (!container.innerHTML) {
    container.innerHTML = "<p>Cargando partidos...</p>";
  }

  let data = [];

  if (currentFilter === "live") {
    data = await fetchData("/live-matches");
  } else if (currentFilter === "today") {
    data = await fetchData("/today");
  } else {
    const [live, today] = await Promise.all([
      fetchData("/live-matches"),
      fetchData("/today")
    ]);
    data = [...live, ...today];
  }

  renderMatches(data);
}

function renderMatches(data) {
  const container = document.getElementById("matches");

  if (!data || !data.length) {
    container.innerHTML = "<p>No hay partidos disponibles</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach(match => {

    // 🔒 PROTECCIÓN (muy importante)
    if (!match.fixture || !match.teams) return;

    const div = document.createElement("div");
    div.className = "match-card";

    div.onclick = () => openMatch(match.fixture.id);

    const isLive = match.fixture.status?.elapsed;

    div.innerHTML = `
      <div class="league">
        ${match.league.name}
        ${isLive ? '<span style="color:red;margin-left:10px;">● EN VIVO</span>' : ''}
      </div>

      <div class="match-row">
        <div class="team">
          <img src="${match.teams.home.logo}" width="24">
          <span>${match.teams.home.name}</span>
        </div>

        <div class="score">
          ${match.goals.home ?? "-"} - ${match.goals.away ?? "-"}
        </div>

        <div class="team">
          <span>${match.teams.away.name}</span>
          <img src="${match.teams.away.logo}" width="24">
        </div>
      </div>

      <div style="font-size:12px;opacity:.7;">
        ${isLive ? ⏱ ${match.fixture.status.elapsed}' : 'Programado'}
      </div>
    `;

    container.appendChild(div);
  });
}

// ============================
// 🏆 LIGAS (NO SE TOCA LÓGICA)
// ============================

const leagues = [
  { id: 140, name: "La Liga" },
  { id: 39, name: "Premier League" },
  { id: 135, name: "Serie A" },
  { id: 78, name: "Bundesliga" },
  { id: 61, name: "Ligue 1" }
];

async function loadLeagues() {
  const tabs = document.getElementById("leagueTabs");

  tabs.innerHTML = "";

  leagues.forEach((l, index) => {
    const btn = document.createElement("button");
    btn.textContent = l.name;

    btn.onclick = () => loadStandings(l.id);

    // 🔥 ACTIVO visual
    if (index === 0) btn.classList.add("active");

    tabs.appendChild(btn);
  });

  loadStandings(leagues[0].id);
}

async function loadStandings(leagueId) {
  const container = document.getElementById("leagueContent");

  container.innerHTML = "Cargando tabla...";

  const data = await fetchData(/standings/${leagueId});

  if (!data || !data.length) {
    container.innerHTML = "No hay datos";
    return;
  }

  container.innerHTML = "";

  data.forEach((team, i) => {
    const div = document.createElement("div");
    div.className = "table-row";

    div.innerHTML = `
      <span>${i + 1}</span>
      <img src="${team.team.logo}" width="20">
      <span>${team.team.name}</span>
      <b>${team.points}</b>
    `;

    container.appendChild(div);
  });
}

// ============================
// DETALLE (NO SE ROMPE)
// ============================

async function openMatch(id) {
  try {
    const res = await fetch(API + "/match/" + id);
    const data = await res.json();

    document.getElementById("matchDetail").innerHTML = `
      <h2>${data.teams.home.name} vs ${data.teams.away.name}</h2>
      <h1>${data.goals.home} - ${data.goals.away}</h1>
    `;

    document.getElementById("matchModal").style.display = "flex";

  } catch {
    alert("Error cargando partido");
  }
}

function closeModal() {
  document.getElementById("matchModal").style.display = "none";
}

// ============================
// FILTROS (NO TOCAR)
// ============================

function setFilter(f) {
  currentFilter = f;
  loadMatches();
}

// ============================
// INIT (SIN CAMBIOS)
// ============================

document.addEventListener("DOMContentLoaded", () => {
  loadMatches();
  loadLeagues();

  setInterval(loadMatches, 30000);
});