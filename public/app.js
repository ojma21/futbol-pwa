const API = "/api";

//REGISTRO
async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await fetch(`${API}/register`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  alert("Usuario creado");
}

//LOGIN
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    alert("Login exitoso");
  } else {
    alert("Error login");
  }
}


//GUARDAR FAV
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

  alert("Agregado a favoritos ⭐");
  loadFavorites();
}

//CARGAR FAV
async function loadFavorites() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/favorites`, {
    headers: {
      "Authorization": token
    }
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


//ELIMINAR FAV
async function deleteFavorite(id) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/favorites/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": token
    }
  });

  loadFavorites();
}


// 📌 PARTIDOS GUARDADOS
async function loadMatches() {
  const res = await fetch(`${API}/matches`);
  const data = await res.json();

  const container = document.getElementById("matches");
  container.innerHTML = "";

  data.forEach(m => {
    const div = document.createElement("div");
    div.className = "match";
    div.textContent = `${m.teamA} ${m.scoreA} - ${m.scoreB} ${m.teamB}`;
    container.appendChild(div);
  });
}

// 📡 PARTIDOS EN VIVO (CON LOGOS)
async function loadLiveMatches() {
  try {
    const res = await fetch(`${API}/live-matches`);
    const data = await res.json();

    const selectedLeague = document.getElementById("liveLeague").value;

    const container = document.getElementById("live");
    container.innerHTML = "";

    data.forEach(match => {

      // 🔥 FILTRO
      if (selectedLeague !== "all" && match.league.id != selectedLeague) {
        return;
      }

      const div = document.createElement("div");
      div.className = "match-card";
      div.onclick = () => openMatch(match.fixture.id);
      div.innerHTML = `
        <div class="team">
          <img src="${match.teams.home.logo}" />
          <span>${match.teams.home.name}</span>
        </div>

        <div class="score">
          ${match.goals.home ?? 0} - ${match.goals.away ?? 0}
          <small>${match.fixture.status.elapsed ?? 0}'</small>
        </div>

        <div class="team">
          <img src="${match.teams.away.logo}" />
          <span>${match.teams.away.name}</span>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error("ERROR LIVE:", err);
  }
}

//ABRIR DETALLE
async function openMatch(id) {
  try {
    const res = await fetch(`${API}/match/${id}`);
    const match = await res.json();

    const statsHTML = await loadMatchStats(id);

    const container = document.getElementById("matchDetail");

    container.innerHTML = `
      <h3>${match.teams.home.name} vs ${match.teams.away.name}</h3>

      <p><strong>${match.goals.home} - ${match.goals.away}</strong></p>
      <p>⏱️ ${match.fixture.status.elapsed}'</p>

      ${statsHTML}

      <h4>Eventos:</h4>
      ${
        match.events.map(e => `
          <p>
            ${e.time.elapsed}' 
            ${e.team.name} 
            - ${e.type}
          </p>
        `).join("")
      }
    `;

    document.getElementById("matchModal").style.display = "block";

  } catch (err) {
    console.error("ERROR DETALLE:", err);
  }
}

function closeModal() {
  document.getElementById("matchModal").style.display = "none";
}

//ESTADISTICAS
async function loadMatchStats(id) {
  try {
    const res = await fetch(`${API}/match-stats/${id}`);
    const data = await res.json();

    if (!data || data.length < 2) {
      return "<p>No hay estadísticas disponibles</p>";
    }

    const home = data[0];
    const away = data[1];

    // 🔎 Helper para buscar stat
    function getStat(team, name) {
      const stat = team.statistics.find(s => s.type === name);
      return stat ? stat.value : 0;
    }

    return `
      <h4>📊 Estadísticas</h4>

      <p>Posesión: ${getStat(home, "Ball Possession")} - ${getStat(away, "Ball Possession")}</p>
      <p>Tiros: ${getStat(home, "Total Shots")} - ${getStat(away, "Total Shots")}</p>
      <p>Tiros al arco: ${getStat(home, "Shots on Goal")} - ${getStat(away, "Shots on Goal")}</p>
      <p>Faltas: ${getStat(home, "Fouls")} - ${getStat(away, "Fouls")}</p>
      <p>Corners: ${getStat(home, "Corner Kicks")} - ${getStat(away, "Corner Kicks")}</p>
    `;

  } catch (err) {
    console.error("ERROR STATS:", err);
    return "<p>Error cargando estadísticas</p>";
  }
}



// 📡 PARTIDOS DEL DIA (CON LOGOS)
async function loadTodayMatches() {
  try {
    const res = await fetch(`${API}/today`);
    const data = await res.json();

    const selectedLeague = document.getElementById("liveLeague").value;

    const container = document.getElementById("today");
    container.innerHTML = "";

    data.forEach(match => {

      if (selectedLeague !== "all" && match.league.id != selectedLeague) {
        return;
      }

      const div = document.createElement("div");
      div.className = "match-card";

      const time = new Date(match.fixture.date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      div.innerHTML = `
        <div class="team">
          <img src="${match.teams.home.logo}" />
          <span>${match.teams.home.name}</span>
        </div>

        <div class="score">${time}</div>

        <div class="team">
          <img src="${match.teams.away.logo}" />
          <span>${match.teams.away.name}</span>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error("ERROR TODAY:", err);
  }
}



// 🏆 TABLA REAL
async function loadStandings() {
  const league = document.getElementById("leagueSelect").value;

  const res = await fetch(`${API}/standings/${league}`);
  const data = await res.json();

  const table = document.getElementById("table");
  table.innerHTML = "";

  if (!data || data.length === 0) {
    table.innerHTML = "<tr><td>No hay datos</td></tr>";
    return;
  }

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


// 🔮 PREDICCIÓN SIMPLE
async function predict() {
  const teamA = document.getElementById("pTeamA").value;
  const teamB = document.getElementById("pTeamB").value;

  const res = await fetch(`${API}/predict/${teamA}/${teamB}`);
  const data = await res.json();

  document.getElementById("result").textContent = data.prediction;
}

// 🚀 INICIO
//loadMatches();
loadLiveMatches();
loadStandings();
loadTodayMatches();
loadFavorites();

// 🔄 ACTUALIZACIÓN EN VIVO
setInterval(loadLiveMatches, 30000);