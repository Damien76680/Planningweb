// ---------------- TASKS ----------------
function loadTasks() {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(data => {

      let html = "";

      data.forEach((t, i) => {
        html += `
        <div class="task ${t.retard ? "retard" : ""}">

          <span class="col-nom">${t.nom || "-"}</span>
          <span class="col-client">${t.client || "-"}</span>

          ${t.etat !== "Terminé" ? `
            <span class="col-duree">${t.duree}h</span>
            <span class="col-temps">${t.debut} → ${t.fin}</span>
          ` : `<span class="col-duree">✅</span>`}

          <span class="col-deadline">${t.deadline}</span>

          <span class="col-actions">
            ${i > 0 ? `<button onclick="moveUp(${t.id})">🔼</button>` : ""}
            ${i < data.length - 1 ? `<button onclick="moveDown(${t.id})">🔽</button>` : ""}

            ${t.etat !== "Terminé" ? `<button onclick="finishTask(${t.id})">✅</button>` : ""}
            <button onclick="deleteTask(${t.id})">🗑</button>
          </span>

        </div>`;
      });

      document.getElementById("tasks").innerHTML = html;
    })
    .catch(err => console.error("Erreur loadTasks:", err));
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
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      nom: nom,
      client: client,
      duree: duree,
      deadline: dl
    })
  })
  .then(r => r.json())
  .then(() => loadTasks())
  .catch(err => console.error("Erreur addTask:", err));
}


// ---------------- MOVE ----------------
function moveUp(id) {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(tasks => {

      const ids = tasks.map(t => t.id);
      const index = ids.indexOf(id);

      if (index > 0) {
        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];

        fetch("/api/tasks/reorder", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(ids)
        }).then(loadTasks);
      }
    });
}

function moveDown(id) {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(tasks => {

      const ids = tasks.map(t => t.id);
      const index = ids.indexOf(id);

      if (index < ids.length - 1) {
        [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];

        fetch("/api/tasks/reorder", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(ids)
        }).then(loadTasks);
      }
    });
}


// ---------------- ACTIONS ----------------
function finishTask(id) {
  fetch(`/api/tasks/${id}/done`, { method:"POST" })
    .then(loadTasks);
}

function deleteTask(id) {
  fetch(`/api/tasks/${id}`, { method:"DELETE" })
    .then(loadTasks);
}


// ---------------- HOLIDAYS ----------------
function loadHolidays() {
  fetch("/api/holidays")
    .then(r => r.json())
    .then(data => {

      let html = "";

      data.forEach(d => {
        html += `<li>${d}</li>`;
      });

      document.getElementById("holidayList").innerHTML = html;
    });
}


function addHoliday() {

  let val = document.getElementById("holiday").value.trim();

  if (!/^\d{8}$/.test(val)) {
    alert("Format JJMMAAAA");
    return;
  }

  const date = `${val.slice(4,8)}-${val.slice(2,4)}-${val.slice(0,2)}`;

  fetch("/api/holidays", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({date})
  })
  .then(() => loadHolidays())
  .then(() => loadTasks()); // ✅ impact planning
}


// ---------------- SETTINGS ----------------
function loadSettings() {
  fetch("/api/settings")
    .then(r => r.json())
    .then(data => {

      const wh = data.work_hours;

      function set(day, i) {
        if (wh[day] && wh[day][i]) {
          document.getElementById(`${day}${i+1}_start`).value = wh[day][i][0];
          document.getElementById(`${day}${i+1}_end`).value = wh[day][i][1];
        }
      }

      set("mon",0); set("mon",1);
      set("tue",0); set("tue",1);
      set("wed",0); set("wed",1);
      set("thu",0); set("thu",1);
      set("fri",0);
    });
}


function saveSettings(){

  function get(day, index){
    let s = document.getElementById(`${day}${index}_start`).value;
    let e = document.getElementById(`${day}${index}_end`).value;

    if (s && e) return [s, e];
    return null;
  }

  const work_hours = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: []
  };

  if(get("mon",1)) work_hours.mon.push(get("mon",1));
  if(get("mon",2)) work_hours.mon.push(get("mon",2));

  if(get("tue",1)) work_hours.tue.push(get("tue",1));
  if(get("tue",2)) work_hours.tue.push(get("tue",2));

  if(get("wed",1)) work_hours.wed.push(get("wed",1));
  if(get("wed",2)) work_hours.wed.push(get("wed",2));

  if(get("thu",1)) work_hours.thu.push(get("thu",1));
  if(get("thu",2)) work_hours.thu.push(get("thu",2));

  if(get("fri",1)) work_hours.fri.push(get("fri",1));

  const data = { work_hours };

  console.log("SETTINGS ENVOYÉS :", data);

  fetch("/api/settings", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(data)
  })
  .then(() => {
    alert("✅ sauvegardé");
    loadTasks(); // ✅ recalcul planning
  });
}


// ---------------- INIT ----------------
loadTasks();
loadHolidays();
loadSettings();
