// ---------------- TASKS ----------------
function loadTasks() {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(data => {

      let html = "";

      data.forEach((t, i) => {
        html += `
        <div class="task ${t.retard ? "retard" : ""}">

          <span class="col-nom">${t.nom}</span>
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
    });
}


// ---------------- ADD ----------------
function addTask() {
  const nom = document.getElementById("nom").value;
  const client = document.getElementById("client").value;
  const duree = parseFloat(document.getElementById("duree").value);
  let dl = document.getElementById("deadline").value;

  if (!nom || isNaN(duree)) return alert("Erreur");

  if (/^\d{8}$/.test(dl)) {
    dl = `${dl.slice(4,8)}-${dl.slice(2,4)}-${dl.slice(0,2)}T00:00:00`;
  } else dl = null;

  fetch("/api/tasks", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({nom, client, duree, deadline: dl})
  }).then(loadTasks);
}


// ---------------- MOVE ----------------
function moveUp(id){
  fetch("/api/tasks")
    .then(r=>r.json())
    .then(tasks=>{
      const ids = tasks.map(t=>t.id);
      const i = ids.indexOf(id);
      if(i>0){
        [ids[i-1], ids[i]]=[ids[i], ids[i-1]];
        fetch("/api/tasks/reorder",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(ids)
        }).then(loadTasks);
      }
    });
}

function moveDown(id){
  fetch("/api/tasks")
    .then(r=>r.json())
    .then(tasks=>{
      const ids = tasks.map(t=>t.id);
      const i = ids.indexOf(id);
      if(i<ids.length-1){
        [ids[i], ids[i+1]]=[ids[i+1], ids[i]];
        fetch("/api/tasks/reorder",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(ids)
        }).then(loadTasks);
      }
    });
}


// ---------------- EVENTS ----------------
function finishTask(id){
  fetch(`/api/tasks/${id}/done`,{method:"POST"}).then(loadTasks);
}

function deleteTask(id){
  fetch(`/api/tasks/${id}`,{method:"DELETE"}).then(loadTasks);
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
  let val = document.getElementById("holiday").value;

  if (/^\d{8}$/.test(val)) {
    val = `${val.slice(4,8)}-${val.slice(2,4)}-${val.slice(0,2)}`;
  }

  fetch("/api/holidays", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({date: val})
  }).then(loadHolidays);
}


// ---------------- SETTINGS ----------------
function loadSettings() {
  fetch("/api/settings").then(r=>r.json()).then(data=>{
    const wh = data.work_hours;

    function set(day,i){
      if(wh[day] && wh[day][i]){
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
  function g(day,i){
    let s=document.getElementById(`${day}${i}_start`).value;
    let e=document.getElementById(`${day}${i}_end`).value;
    return s&&e?[s,e]:null;
  }

  const data={
    work_hours:{
      mon:[g("mon",1),g("mon",2)].filter(x=>x),
      tue:[g("tue",1),g("tue",2)].filter(x=>x),
      wed:[g("wed",1),g("wed",2)].filter(x=>x),
      thu:[g("thu",1),g("thu",2)].filter(x=>x),
      fri:[g("fri",1)].filter(x=>x),
      sat:[],
      sun:[]
    }
  };

  fetch("/api/settings",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(data)
  }).then(()=>alert("✅ sauvegardé"));
}


// ---------------- INIT ----------------
setInterval(loadTasks,3000);

loadTasks();
loadHolidays();
loadSettings();
