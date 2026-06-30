function loadTasks() {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(data => {

      let html = "";

      data.forEach(t => {
        html += `
        <div class="task">
          <span><b>${t.nom}</b></span>
          <span>${t.client || "-"}</span>
          ${t.etat !== "Terminé" ? `
            <span>${t.duree}h</span>
            <span>${t.debut} → ${t.fin}</span>
          ` : `<span>✅</span>`}
          <span>${t.deadline}</span>
          ${t.retard ? "<span style='color:red'>⚠️</span>" : ""}
          ${t.etat !== "Terminé" ? `<button onclick="finishTask(${t.id})">✅</button>` : ""}
        </div>`;
      });

      document.getElementById("tasks").innerHTML = html;
    });
}


function addTask() {
  let dl = document.getElementById("deadline").value;

  if (/^\d{8}$/.test(dl)) {
    dl = `${dl.slice(4,8)}-${dl.slice(2,4)}-${dl.slice(0,2)}T00:00:00`;
  } else dl = null;

  fetch("/api/tasks", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      nom: nom.value,
      client: client.value,
      duree: duree.value,
      deadline: dl
    })
  }).then(loadTasks);
}


function finishTask(id) {
  fetch(`/api/tasks/${id}/done`, {method:"POST"}).then(loadTasks);
}


// -------- HOLIDAYS --------
function loadHolidays() {
  fetch("/api/holidays")
    .then(r => r.json())
    .then(d => {
      holidayList.innerHTML =
        d.map(x=>`<li>${x}</li>`).join("");
    });
}

function addHoliday() {
  let v = holiday.value;
  if (/^\d{8}$/.test(v)) {
    v = `${v.slice(4,8)}-${v.slice(2,4)}-${v.slice(0,2)}`;
  }
  fetch("/api/holidays", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({date:v})
  }).then(loadHolidays);
}


// -------- SETTINGS --------
function loadSettings(){
  fetch("/api/settings")
    .then(r=>r.json())
    .then(d=>{
      settingsBox.value = JSON.stringify(d,null,2);
    });
}

function saveSettings(){
  fetch("/api/settings", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: settingsBox.value
  });
}


// INIT
setInterval(loadTasks, 3000);
loadTasks();
loadHolidays();
loadSettings();
