const API = "/api";

let currentFilter = "all";
let lastScores = {};
let favoriteTeams = [];

// ============================
// MATCHES
// ============================

async function loadMatches() {
  const container = document.getElementById("matches");

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
    container.innerHTML = "Error";
  }
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

        <div class="team">
          <span>${match.teams.away.name}</span>
          <img src="${match.teams.away.logo}">
        </div>
      </div>
    `;

    container.appendChild(div);
  });
}

async function fetchData(url) {
  const res = await fetch(API + url);
  return res.json();
}

// ============================
// MODAL
// ============================

async function openMatch(id) {
  const res = await fetch(API + "/match/" + id);
  const data = await res.json();

  document.getElementById("matchDetail").innerHTML = `
    <h2>${data.teams.home.name} vs ${data.teams.away.name}</h2>
    <h1>${data.goals.home} - ${data.goals.away}</h1>
  `;

  document.getElementById("matchModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("matchModal").style.display = "none";
}

// ============================
document.addEventListener("DOMContentLoaded", () => {
  loadMatches();
  setInterval(loadMatches, 30000);
});