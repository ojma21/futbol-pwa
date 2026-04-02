const API = "/api";

let currentFilter = "all";

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

  document.getElementById("f_" + filter).classList.add("active");

  loadMatches();
}

// ============================
// MATCHES
// ============================

async function loadMatches() {
  const container = document.getElementById("matches");

  // skeleton loading
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

  renderMatches(data);
}

function renderMatches(data) {
  const container = document.getElementById("matches");

  if (!data || !data.length) {
    container.innerHTML = `<p style="opacity:.6">No hay partidos disponibles</p>`;
    return;
  }

  container.innerHTML = "";

  data.forEach(match => {
    if (!match.fixture) return;

    const isLive = match.fixture.status?.elapsed;

    const div = document.createElement("div");
    div.className = "match-card";

    div.onclick = () => openMatch(match.fixture.id);

    div.innerHTML = `
      <div class="league">
        ${match.league.name}
        ${isLive ? '<span style="color:red;"> ● EN VIVO</span>' : ''}
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
        ${isLive ? `⏱ ${match.fixture.status.elapsed}'` : "Programado"}
      </div>
    `;

    container.appendChild(div);
  });
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

  container.innerHTML = "Cargando...";

  const data = await fetchData(`/standings/${leagueId}`);

  if (!data || !data.length) {
    container.innerHTML = "No hay datos";
    return;
  }

  container.innerHTML = `
    <div class="table">
      ${data.map((team, i) => `
        <div class="table-row">
          <span class="pos">${i + 1}</span>
          <img src="${team.team?.logo || ''}" width="20">
          <span class="name">${team.team?.name || ''}</span>
          <span class="pts">${team.points || '-'}</span>
        </div>
      `).join("")}
    </div>
  `;
}

// ============================
// DETALLE PARTIDO
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
// LOGIN (simple)
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

  setInterval(loadMatches, 30000);
});