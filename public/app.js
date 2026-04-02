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

  // 🔥 Skeleton loading
  container.innerHTML = `
    ${Array(8).fill('<div class="skeleton"></div>').join('')}
  `;

  try {
    const res = await fetch(`${API}/standings/${leagueId}`);
    const data = await res.json();

    if (!data || !data.length) {
      container.innerHTML = "Sin datos";
      return;
    }

    container.innerHTML = `
      <div class="league-card fade-in">
        ${data.map((t,i)=>{

          const logo = t.team.logo || t.team.crest || "https://via.placeholder.com/20";

          let classRow = "";
          if (i < 4) classRow = "ucl";
          else if (i < 6) classRow = "uel";
          else if (i >= data.length - 3) classRow = "desc";

          return `
            <div class="team-row ${classRow}">
              
              <div class="pos">${i+1}</div>

              <div class="team-info">
                <img src="${logo}">
                <span>${t.team.name}</span>
              </div>

              <div class="points">${t.points}</div>

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

async function login() {
  const email = val("email");
  const password = val("password");
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

async function register() {
  const email = val("email");
  const password = val("password");

  if (!email || !password) return alert("Completa campos");

  await fetch(`${API}/register`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  alert("Usuario creado");
}

function logout() {
  localStorage.clear();
  location.reload();
}

function toggleLogin() {
  document.getElementById("authBox").classList.toggle("hidden");
}

function val(id) {
  return document.getElementById(id).value.trim();
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
// PARTIDOS
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
  return res.json();
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

  document.getElementById("matchDetail").innerHTML = `
    <div class="match-header-pro">
      <div>${data.fixture.league.name}</div>
      <div class="score-big">
        ${data.fixture.goals.home} - ${data.fixture.goals.away}
      </div>
      <div>${data.teams.home.name} vs ${data.teams.away.name}</div>
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