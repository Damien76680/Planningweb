// ---------------- LOAD TASKS ----------------
function loadTasks() {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(data => {

      console.log("TASKS:", data);

      let html = "";

      data.forEach(t => {
        html += `
        <div class="task">
          <span><b>${t.nom}</b></span>
          <span>${t.client || "-"}</span>

          ${t.etat !== "Terminé" ? `
            <span>${t.duree}h</span>
            <span>${t.debut} → ${t.fin}</span>
          ` : `<span style="color:green">✅</span>`}

          <span>📅 ${t.deadline}</span>

          ${t.retard ? "<span style='color:red'>⚠️</span>" : ""}

          <span>
            ${t.etat !== "Terminé" ? `<button onclick="finishTask(${t.id})">✅</button>` : ""}
            <button onclick="deleteTask(${t.id})">🗑</button>
          </span>
        </div>`;
      });

      document.getElementById("tasks").innerHTML = html;
    })
    .catch(err => {
      console.error("Erreur loadTasks :", err);
    });
}


// ---------------- ADD TASK ----------------
function addTask() {

  const nom = document.getElementById("nom").value.trim();
  const client = document.getElementById("client").value.trim();
  const duree = parseFloat(document.getElementById("duree").value);
  let dl = document.getElementById("deadline").value.trim();

  if (!nom || isNaN(duree)) {
    alert("Erreur saisie");
    return;
  }

  // format deadline
  if (/^\d{8}$/.test(dl)) {
    dl = `${dl.slice(4,8)}-${dl.slice(2,4)}-${dl.slice(0,2)}T00:00:00`;
  } else {
    dl = null;
  }

  fetch("/api/tasks", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      nom: nom,
      client: client,
      duree: duree,
      deadline: dl
    })
  })
  .then(() => loadTasks())
  .catch(err => console.error("Erreur addTask :", err));
}


// ---------------- FINISH ----------------
function finishTask(id) {
  fetch(`/api/tasks/${id}/done`, {
    method: "POST"
  }).then(loadTasks);
}


// ---------------- DELETE ----------------
function deleteTask(id) {
  fetch(`/api/tasks/${id}`, {
    method: "DELETE"
  }).then(loadTasks);
}


// ---------------- HOLIDAYS ----------------
function loadHolidays() {
  fetch("/api/holidays")
    .then(r => r.json())
    .then(data => {

      console.log("HOLIDAYS:", data);

      let html = "";

      data.forEach(d => {
        html += `<li>${d} <button onclick="deleteHoliday('${d}')">✖</button></li>`;
      });

      document.getElementById("holidayList").innerHTML = html;
    })
    .catch(err => console.error("Erreur loadHolidays :", err));
}


function addHoliday() {

  let val = document.getElementById("holiday").value.trim();

  if (!/^\d{8}$/.test(val)) {
    alert("Format attendu : JJMMAAAA");
    return;
  }

  const date =
    `${val.slice(4,8)}-${val.slice(2,4)}-${val.slice(0,2)}`;

  fetch("/api/holidays", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({date})
  })
  .then(() => loadHolidays());
}


function deleteHoliday(date) {
  fetch(`/api/holidays/${date}`, {
    method: "DELETE"
  })
  .then(() => loadHolidays());
}


// ---------------- SETTINGS ----------------
function loadSettings(){
  fetch("/api/settings")
    .then(r=>r.json())
    .then(data=>{
      document.getElementById("settingsBox").value =
        JSON.stringify(data, null, 2);
    });
}


function saveSettings(){

  let text = document.getElementById("settingsBox").value;

  try {
    JSON.parse(text);
  } catch {
    alert("JSON invalide");
    return;
  }

  fetch("/api/settings", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: text
  });
}


// ---------------- INIT ----------------
setInterval(loadTasks, 3000);

loadTasks();
loadHolidays();
loadSettings();
