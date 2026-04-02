// ============================
// CONFIG
// ============================
const API = "/api";

const leaguesConfig = [
  { name: "🇪🇸 La Liga", id: 140 },
  { name: "🏴 Premier", id: 39 },
  { name: "🇮🇹 Serie A", id: 135 },
  { name: "🇩🇪 Bundesliga", id: 78 },
  { name: "🇫🇷 Ligue 1", id: 61 },
  { name: "🇦🇷 Argentina", id: 128 },
  { name: "🇲🇽 Liga MX", id: 262 }
];

// ============================
// LIGAS (TABS)
// ============================

function loadLeagueTabs() {
  const container = document.getElementById("leagueTabs");
  container.innerHTML = "";

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

async function loadLeague(leagueId) {
  const container = document.getElementById("leagueContent");
  container.innerHTML = "Cargando...";

  try {
    const res = await fetch(`${API}/standings/${leagueId}`);
    const data = await res.json();

    if (!data || !data.length) {
      container.innerHTML = "Sin datos";
      return;
    }

    container.innerHTML = `
      <div class="league-card">
        ${data.slice(0,10).map((t,i)=>{

          const logo = t.team.logo || t.team.crest || "https://via.placeholder.com/20";

          return `
            <div class="team-row">
              <div class="team-info">
                <span>${i+1}</span>
                <img src="${logo}">
                <span>${t.team.name}</span>
              </div>

              <div>${t.points} pts</div>
            </div>
          `;
        }).join("")}
      </div>
    `;

  } catch {
    container.innerHTML = "Error cargando liga";
  }
}

// ============================
// AUTH
// ============================

async function register() {
  const email = emailInput();
  const password = passwordInput();

  if (!email || !password) return alert("Completa los campos");

  const res = await fetch(`${API}/register`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!res.ok) return alert(data.error);

  alert("Usuario creado ✅");
}

async function login() {
  const email = emailInput();
  const password = passwordInput();

  const msg = document.getElementById("msg");

  if (!email || !password) {
    msg.textContent = "Completa los campos";
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

  toggleLogin();
  updateAuthUI();
}

function logout() {
  localStorage.clear();
  location.reload();
}

function toggleLogin() {
  document.getElementById("authBox").classList.toggle("hidden");
}

function emailInput() {
  return document.getElementById("email").value.trim();
}

function passwordInput() {
  return document.getElementById("password").value.trim();
}

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
// FILTROS + PARTIDOS
// ============================

let currentFilter = "all";

function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filters button")
    .forEach(b => b.classList.remove("active"));

  document.getElementById("f_" + filter).classList.add("active");

  loadMatches();
}

async function loadMatches() {
  const container = document.getElementById("matches");
  container.innerHTML = "Cargando...";

  try {
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

  } catch {
    container.innerHTML = "Error cargando partidos";
  }
}

async function fetchData(url) {
  const res = await fetch(`${API}${url}`);
  return await res.json();
}

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
        ${match.fixture.status?.elapsed 
          ? "⏱ " + match.fixture.status.elapsed + "'" 
          : "Programado"}
      </div>
    `;

    container.appendChild(div);
  });
}

// ============================
// MODAL PARTIDO
// ============================

async function openMatch(id) {
  const res = await fetch(`${API}/match/${id}`);
  const data = await res.json();

  const match = data.fixture;
  const teams = data.teams;

  document.getElementById("matchDetail").innerHTML = `
    <div class="match-header-pro">
      <div>${match.league.name}</div>

      <div class="score-big">
        ${match.goals.home} - ${match.goals.away}
      </div>

      <div>
        ${teams.home.name} vs ${teams.away.name}
      </div>
    </div>
  `;

  document.getElementById("matchModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("matchModal").style.display = "none";
}

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  loadMatches();
  loadLeagueTabs();

  setInterval(loadMatches, 30000);
});