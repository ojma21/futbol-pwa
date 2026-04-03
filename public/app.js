const API = "/api";

let currentFilter = "all";
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let notifiedEvents = {}; // para no repetir notificaciones
let lastScreen = "home";

//------------
//NAVEGACION TIPO APP
//------------
function goTab(tab) {
  lastScreen = tab; // 🔥 guarda de dónde vienes

  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));

  if (tab === "home") {
    document.getElementById("screen_home").classList.add("active");
    renderHome();
  }

  if (tab === "favorites") {
    document.getElementById("screen_matches").classList.add("active");
    showFavorites();
  }

  if (tab === "leagues") {
    document.getElementById("screen_matches").classList.add("active");
    loadLeagues();
  }

  if (tab === "profile") {
    document.getElementById("screen_profile").classList.add("active");
    renderProfile();
  }
}

//-----------
//home
//-----------
function renderHome() {
  const container = document.getElementById("screen_home");

  container.innerHTML = `
    <div class="stories">
      <div class="story">🔥</div>
      <div class="story">⚽</div>
      <div class="story">🏆</div>
    </div>

    <div class="card-big">
      <h3>Partido destacado</h3>
      <p>Contenido dinámico próximamente</p>
    </div>

    <div class="news-card">📰 Noticias pronto...</div>
  `;
}

//------------
//perfil
//------------
function renderProfile() {
  const container = document.getElementById("screen_profile");

  const user = localStorage.getItem("user") || "Invitado";

  container.innerHTML = `
    <div class="profile-header">
      <div class="avatar-big"></div>
      <h2>${user}</h2>
      <p>Nivel 1 🔥</p>
    </div>

    <div class="profile-menu">
      <div>📊 Estadísticas</div>
      <div>🏆 Insignias</div>
      <div>⚙️ Configuración</div>
    </div>
  `;
}



//-----------------
//PANTALLA FAVORITOS REAL
//-----------------
function showFavorites() {
  const container = document.getElementById("matches");

  container.innerHTML = "<h2>⭐ Favoritos</h2>";

  if (!favorites.length) {
    container.innerHTML += "<p>No tienes favoritos</p>";
    return;
  }

  fetchData("/today").then(data => {
    const favMatches = data.filter(m => favorites.includes(m.fixture.id));

    if (!favMatches.length) {
      container.innerHTML += "<p>No hay partidos activos en favoritos</p>";
      return;
    }

    favMatches.forEach(match => {
      const div = document.createElement("div");
      div.className = "match-card";

      div.innerHTML = `
        <div class="match-row">
          <div class="team">
            <img src="${match.teams.home.logo}">
            ${match.teams.home.name}
          </div>

          <div class="score">
            ${match.goals.home ?? "-"} - ${match.goals.away ?? "-"}
          </div>

          <div class="team">
            ${match.teams.away.name}
            <img src="${match.teams.away.logo}">
          </div>
        </div>
      `;

      container.appendChild(div);
    });
  });

  document.getElementById("leagueContent").style.display = "none";
}




// ============================
// FETCH
// ============================

async function fetchData(url) {
  try {
    const res = await fetch(API + url);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.log("Error:", e);
    return [];
  }
}

// ============================
// FILTROS
// ============================

function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filters button").forEach(btn => {
    btn.classList.remove("active");
  });

  const el = document.getElementById("f_" + filter);
  if (el) el.classList.add("active");

  loadMatches();
}

// ============================
// FAVORITOS
// ============================

function toggleFavorite(matchId) {
  if (favorites.includes(matchId)) {
    favorites = favorites.filter(id => id !== matchId);
  } else {
    favorites.push(matchId);
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));
  loadMatches();
}

function isFavorite(matchId) {
  return favorites.includes(matchId);
}

// ============================
// MATCHES
// ============================

async function loadMatches() {
  const container = document.getElementById("matches");

  // skeleton
  container.innerHTML = `
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  `;

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

// 🔥 NUEVO: ORDENAR (LIVE ARRIBA)
data.sort((a, b) => {
  const liveStates = ["1H", "2H", "HT"];

  const aLive = liveStates.includes(a.fixture.status.short);
  const bLive = liveStates.includes(b.fixture.status.short);

  return bLive - aLive;
});

// 🔥 FILTRO POR LIGA (ejemplo)
if (currentFilter === "laliga") {
  data = data.filter(m => m.league.id === 140);
}

  renderMatches(data);
  checkNotifications(data);
}

function renderMatches(matches) {
  const container = document.getElementById("matches");
  container.innerHTML = "";

  if (!matches.length) {
    container.innerHTML = "<p>No hay partidos</p>";
    return;
  }

  // 🔥 AGRUPAR POR LIGA
  const grouped = {};

  matches.forEach(m => {
    const league = `${m.league.country} - ${m.league.name}`;

    if (!grouped[league]) grouped[league] = [];
    grouped[league].push(m);
  });

  // 🔥 RENDER POR BLOQUES
  Object.keys(grouped).forEach(league => {

    const leagueDiv = document.createElement("div");

    leagueDiv.innerHTML = `
      <h3 class="league-title">${league}</h3>
    `;

    grouped[league].forEach(match => {
      const div = document.createElement("div");
      div.className = "match-card";

      div.innerHTML = `
        <div class="match-row" onclick="openMatch(${match.fixture.id})">
          <span>${match.teams.home.name}</span>
          <strong>${match.goals.home ?? "-"} - ${match.goals.away ?? "-"}</strong>
          <span>${match.teams.away.name}</span>
        </div>
      `;

      leagueDiv.appendChild(div);
    });

    container.appendChild(leagueDiv);
  });
}

// ============================
// NOTIFICACIONES (favoritos)
// ============================

function checkNotifications(matches) {
  matches.forEach(match => {
    if (!match.fixture) return;

    const id = match.fixture.id;
    const isFav = favorites.includes(id);
    const goals = `${match.goals.home}-${match.goals.away}`;

    if (!isFav) return;

    if (!notifiedEvents[id]) {
      notifiedEvents[id] = goals;
      return;
    }

    if (notifiedEvents[id] !== goals) {
  showNotification(match);
  showToast(`⚽ Gol en ${match.teams.home.name} vs ${match.teams.away.name}`);
  notifiedEvents[id] = goals;
}
  });
}

function showNotification(match) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification("⚽ Gol en favorito", {
      body: `${match.teams.home.name} ${match.goals.home} - ${match.goals.away} ${match.teams.away.name}`
    });
  }
}

// pedir permiso una vez
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

function showToast(message) {
  const div = document.createElement("div");
  div.className = "goal-notification";
  div.innerText = message;

  document.body.appendChild(div);

  setTimeout(() => div.remove(), 3000);
}

// ============================
// LIGAS
// ============================

const leagues = [
  { id: 140, name: "La Liga" },
  { id: 39, name: "Premier League" },
  { id: 135, name: "Serie A" },
  { id: 78, name: "Bundesliga" },
  { id: 61, name: "Ligue 1" }
];

function loadLeagues() {
  const tabs = document.getElementById("leagueTabs");
  tabs.innerHTML = "";

  leagues.forEach((l, i) => {
    const btn = document.createElement("button");
    btn.textContent = l.name;

    if (i === 0) btn.classList.add("active");

    btn.onclick = () => {
      document.querySelectorAll("#leagueTabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadStandings(l.id);
    };

    tabs.appendChild(btn);
  });

  loadStandings(leagues[0].id);
}

async function loadStandings(leagueId) {
  const container = document.getElementById("leagueContent");

  container.innerHTML = "Cargando tabla...";

  const data = await fetchData(`/standings/${leagueId}`);

  if (!data || !data.length) {
    container.innerHTML = "No hay datos";
    return;
  }

  container.innerHTML = `
    <div class="table">
      ${data.map((team, i) => `
        <div class="table-row">
          <span>${i + 1}</span>
          <img src="${team.team?.logo}" width="20">
          <span>${team.team?.name}</span>
          <span>${team.points}</span>
        </div>
      `).join("")}
    </div>
  `;
}

// ============================
// DETALLE PARTIDO (PRO)
// ============================

async function openMatch(id) {
  const res = await fetch(`/api/match/${id}`);
  const data = await res.json();

  const container = document.getElementById("screen_matches");

  container.innerHTML = `
    <div class="detail-container">

      <!-- HEADER -->
      <div class="detail-header">

        <button class="back-btn" onclick="goBack()">✕</button>

        <div class="teams-row">
          <div class="team">
            <img src="${data.teams.home.logo}">
            <span>${data.teams.home.name}</span>
          </div>

          <div class="score-box">
            <div class="status">${data.fixture.status.long}</div>
            <div class="score">${data.goals.home} - ${data.goals.away}</div>
            <div class="minute">${data.fixture.status.elapsed || ""}'</div>
          </div>

          <div class="team">
            <img src="${data.teams.away.logo}">
            <span>${data.teams.away.name}</span>
          </div>
        </div>

      </div>

      <!-- TIMELINE -->
      <div class="timeline">
        ${renderTimeline(data.events || [])}
      </div>

    </div>
  `;
}

function goBack() {
  goTab(lastScreen || "home");
}


// ============================
// eventos
// ============================
function renderTimeline(events) {
  if (!events.length) {
    return "<p style='opacity:.5'>Sin eventos</p>";
  }

  return events.map((e, i) => {

    const isLeft = i % 2 === 0;

    let icon = "⚽";
    if (e.type === "Card") icon = "🟨";
    if (e.type === "subst") icon = "🔄";

    return `
      <div class="timeline-row ${isLeft ? "left" : "right"}">

        <div class="content">
          <span class="icon">${icon}</span>
          <div>
            <strong>${e.player?.name || ""}</strong>
            <p>${e.detail || ""}</p>
          </div>
        </div>

        <div class="minute">${e.time?.elapsed || ""}'</div>

      </div>
    `;
  }).join("");
}




function renderEvents(events) {
  if (!events.length) {
    return "<p style='opacity:.5'>No hay eventos</p>";
  }

  return events.map(e => {

    let icon = "⚽";
    if (e.type === "Card") icon = "🟨";
    if (e.type === "subst") icon = "🔄";

    return `
      <div class="event">
        <div class="minute">${e.time?.elapsed || ""}'</div>

        <div class="line"></div>

        <div class="event-content">
          <span class="icon">${icon}</span>
          <div>
            <strong>${e.player?.name || ""}</strong>
            <p>${e.detail || ""}</p>
          </div>
        </div>
      </div>
    `;
  }).join("");
}


// ============================
// LOGIN
// ============================

function toggleLogin() {
  document.getElementById("authBox").classList.toggle("hidden");
}

function login() {
  const email = document.getElementById("email").value;

  if (!email) return alert("Ingresa correo");

  localStorage.setItem("user", email);

  document.getElementById("userEmail").textContent = email;
  document.getElementById("userBox").style.display = "block";
  document.getElementById("loginBtn").style.display = "none";

  toggleLogin();
}

function register() {
  alert("Usuario creado (demo)");
}

function logout() {
  localStorage.removeItem("user");

  document.getElementById("userBox").style.display = "none";
  document.getElementById("loginBtn").style.display = "block";
}

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", () => {
  loadMatches();
  loadLeagues();

  const user = localStorage.getItem("user");

  if (user) {
    document.getElementById("userEmail").textContent = user;
    document.getElementById("userBox").style.display = "block";
    document.getElementById("loginBtn").style.display = "none";
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }

  setInterval(loadMatches, 30000);

  // 🔥 IMPORTANTE
  goTab("home");
});