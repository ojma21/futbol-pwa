// ============================
// CONFIG
// ============================
const API = "/api";
const logo = t.team.logo || t.team.crest || "https://via.placeholder.com/20";
const leaguesConfig = [
  { name: "🇪🇸 La Liga", id: 140 },
  { name: "🏴 Premier", id: 39 },
  { name: "🇮🇹 Serie A", id: 135 },
  { name: "🇩🇪 Bundesliga", id: 78 },
  { name: "🇫🇷 Ligue 1", id: 61 },
  { name: "🇦🇷 Argentina", id: 128 },
  { name: "🇲🇽 Liga MX", id: 262 }
];


//
//CREAR PESTAÑAS
//
function loadLeagueTabs() {
  const container = document.getElementById("leagueTabs");

  leaguesConfig.forEach((l, i) => {
    const btn = document.createElement("button");

    btn.textContent = l.name;

    btn.onclick = () => {
      document.querySelectorAll(".league-tabs button")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      loadLeague(l.id);
    };

    if (i === 0) {
      btn.classList.add("active");
      loadLeague(l.id);
    }

    container.appendChild(btn);
  });
}


//
// CARGAR TABLAS
//
async function loadLeague(leagueId) {
  const container = document.getElementById("leagueContent");
  const logo = t.team.logo || t.team.crest || "https://via.placeholder.com/20";
  container.innerHTML = "Cargando...";

  try {
    const res = await fetch(`/api/standings/${leagueId}`);
    const data = await res.json();

    if (!data || !data.length) {
      container.innerHTML = "Sin datos";
      return;
    }

    container.innerHTML = `
      <div class="league-card">
        ${data.slice(0,10).map((t,i)=>`
          <div class="team-row">
            <div class="team-info">
              <span>${i+1}</span>
              <img src="${logo}" width="20">

              <span>${t.team.name}</span>
            </div>

            <div>
              ${t.points} pts
            </div>
          </div>
        `).join("")}
      </div>
    `;

  } catch (e) {
    container.innerHTML = "Error cargando liga";
  }
}

// ============================
// AUTH (LOGIN / REGISTER)
// ============================

async function register() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Completa todos los campos");
    return;
  }

  if (password.length < 4) {
    alert("La contraseña debe tener al menos 4 caracteres");
    return;
  }

  try {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error al registrar");
      return;
    }

    alert("Usuario creado ✅");

  } catch {
    alert("Error de conexión");
  }
}

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  if (!email || !password) {
    msg.textContent = "Completa todos los campos";
    return;
  }

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.error;
    return;
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("email", email);

  showUser();
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  location.reload();
}

function toggleLogin() {
  document.getElementById("authBox").classList.toggle("hidden");
}

// ============================
// SESIÓN / UI
// ============================

function showUser() {
  const email = localStorage.getItem("email");

  const authBox = document.getElementById("authBox");
  const appContent = document.getElementById("appContent");
  const userBox = document.getElementById("userBox");

  if (email) {
    authBox.style.display = "none";
    appContent.style.display = "block";
    userBox.style.display = "flex";

    document.getElementById("userEmail").textContent = email;

    loadLiveMatches();
    loadTodayMatches();
    loadStandings();
    loadFavorites();

  } else {
    authBox.style.display = "block";
    appContent.style.display = "none";
    userBox.style.display = "none";
  }
}

function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
}

// ============================
// FAVORITOS
// ============================

async function addFavorite(name, logo) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/favorites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      team_name: name,
      team_logo: logo
    })
  });

  loadFavorites();
}

async function loadFavorites() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/favorites`, {
    headers: { "Authorization": token }
  });

  const data = await res.json();

  const container = document.getElementById("favorites");
  container.innerHTML = "";

  data.forEach(f => {
    const div = document.createElement("div");

    div.innerHTML = `
      <img src="${f.team_logo}" width="20"/>
      ${f.team_name}
      <button onclick="deleteFavorite(${f.id})">❌</button>
    `;

    container.appendChild(div);
  });
}

async function deleteFavorite(id) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/favorites/${id}`, {
    method: "DELETE",
    headers: { "Authorization": token }
  });

  loadFavorites();
}

// ============================
// PARTIDOS EN VIVO
// ============================

async function loadLiveMatches() {
  const res = await fetch(`${API}/live-matches`);
  const data = await res.json();

  const container = document.getElementById("liveMatches");
  container.innerHTML = "";

  data.forEach(match => {
    const div = document.createElement("div");
    div.className = "match-card";

    div.onclick = () => openMatch(match.fixture.id);

    div.innerHTML = `
      <div class="league">${match.league.name}</div>

      <div class="match-row">
        <div class="team">
          <img src="${match.teams.home.logo}">
          <span>${match.teams.home.name}</span>
        </div>

        <div class="score">
          ${match.goals.home ?? 0} - ${match.goals.away ?? 0}
        </div>

        <div class="team" style="justify-content:end;">
          <span>${match.teams.away.name}</span>
          <img src="${match.teams.away.logo}">
        </div>
      </div>

      <div class="match-row">
        <span class="status">⏱ ${match.fixture.status.elapsed || 0}'</span>
        <button onclick="event.stopPropagation(); addFavorite('${match.teams.home.name}','${match.teams.home.logo}')">⭐</button>
      </div>
    `;

    container.appendChild(div);
  });
}


let currentFilter = "all";

//
function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filters button")
    .forEach(b => b.classList.remove("active"));

  document.getElementById("f_" + filter).classList.add("active");

  loadMatches();
}


//UNIFICAR PARTIDOS
async function loadMatches() {
  const container = document.getElementById("matches");
  container.innerHTML = "Cargando...";

  try {
    let data = [];

    if (currentFilter === "live") {
      const res = await fetch("/api/live-matches");
      data = await res.json();
    }

    else if (currentFilter === "today") {
      const res = await fetch("/api/today");
      data = await res.json();
    }

    else {
      const [liveRes, todayRes] = await Promise.all([
        fetch("/api/live-matches"),
        fetch("/api/today")
      ]);

      const live = await liveRes.json();
      const today = await todayRes.json();

      data = [...live, ...today];
    }

    renderMatches(data);

  } catch {
    container.innerHTML = "Error cargando partidos";
  }
}


//RENDER ESTILO APP REAL
function renderMatches(data) {
  const container = document.getElementById("matches");
  container.innerHTML = "";

  data.forEach(match => {
    const div = document.createElement("div");
    div.className = "match-card";

    div.onclick = () => openMatch(match.fixture.id);

    div.innerHTML = `
      <div class="league">${match.league.name}</div>

      <div class="match-row">
        <div class="team">
          <img src="${match.teams.home.logo}">
          <span>${match.teams.home.name}</span>
        </div>

        <div class="score">
          ${match.goals.home ?? "-"} - ${match.goals.away ?? "-"}
        </div>

        <div class="team" style="justify-content:end;">
          <span>${match.teams.away.name}</span>
          <img src="${match.teams.away.logo}">
        </div>
      </div>

      <div class="status">
        ${match.fixture.status?.elapsed ? "⏱ " + match.fixture.status.elapsed + "'" : "Programado"}
      </div>
    `;

    container.appendChild(div);
  });
}


// ============================
// DETALLE DE PARTIDO (MODAL)
// ============================

async function openMatch(id) {
  const res = await fetch(`${API}/match/${id}`);
  const data = await res.json();

  const match = data.fixture;
  const teams = data.teams;
  const stats = data.statistics || [];
  const events = data.events || [];

  const container = document.getElementById("matchDetail");

  container.innerHTML = `
    <div class="match-header-pro">
      <div>${match.league.name}</div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <img src="${teams.home.logo}">
          <div>${teams.home.name}</div>
        </div>

        <div class="score-big">
          ${match.goals.home} - ${match.goals.away}
        </div>

        <div>
          <img src="${teams.away.logo}">
          <div>${teams.away.name}</div>
        </div>
      </div>

      <div>⏱ ${match.fixture.status.elapsed || 0}'</div>
    </div>

    <div style="padding:15px;">
      <h3>📊 Estadísticas</h3>

      ${
        stats.length
          ? stats.map(s => `
            <div class="stat">
              <span>${s.home}</span>
              <span>${s.type}</span>
              <span>${s.away}</span>
            </div>
          `).join("")
          : "<p>No hay estadísticas disponibles</p>"
      }

      <h3>⚡ Eventos</h3>

      ${events.map(e => `
        <div>
          ${e.time.elapsed}' - ${e.team.name} - ${e.type}
        </div>
      `).join("")}
    </div>
  `;

  document.getElementById("matchModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("matchModal").style.display = "none";
}

// ============================
// PARTIDOS DEL DÍA
// ============================

async function loadTodayMatches() {
  const res = await fetch(`${API}/today`);
  const data = await res.json();

  const container = document.getElementById("todayMatches");
  container.innerHTML = "";

  data.forEach(match => {
    const div = document.createElement("div");
    div.className = "match-card";

    const time = new Date(match.fixture.date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    div.innerHTML = `
      <div class="team">
        <img src="${match.teams.home.logo}">
        ${match.teams.home.name}
      </div>

      <div class="score">${time}</div>

      <div class="team">
        <img src="${match.teams.away.logo}">
        ${match.teams.away.name}
      </div>
    `;

    container.appendChild(div);
  });
}

// ============================
// TABLA DE POSICIONES
// ============================

async function loadStandings() {
  const league = document.getElementById("leagueSelect").value;

  const res = await fetch(`${API}/standings/${league}`);
  const data = await res.json();

  const table = document.getElementById("tableBody");
  table.innerHTML = "";

  data.forEach(team => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <img src="${team.team.crest}" width="20"/>
        ${team.team.name}
      </td>
      <td>${team.points}</td>
      <td>${team.goalsFor}</td>
      <td>${team.goalsAgainst}</td>
    `;

    table.appendChild(row);
  });
}

//LOGICA DE SESIONES
function updateAuthUI() {
  const email = localStorage.getItem("email");

  const userBox = document.getElementById("userBox");
  const loginBtn = document.getElementById("loginBtn");

  if (email) {
    userBox.style.display = "flex";
    loginBtn.style.display = "none";
    document.getElementById("userEmail").textContent = email;
  } else {
    userBox.style.display = "none";
    loginBtn.style.display = "block";
  }
}

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", () => {
  loadMatches();
  updateAuthUI();
  loadLeagueTabs();

  setInterval(loadMatches, 30000);
});