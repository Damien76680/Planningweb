function loadTasks() {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(data => {

      let html = "";

      data.forEach((t, i) => {
        html += `
        <div class="task">

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


// ADD
function addTask() {
  const nom = nomInput.value.trim();
  const client = clientInput.value.trim();
  const duree = parseFloat(dureeInput.value);
  let dl = deadlineInput.value.trim();

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


// MOVE
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


// ACTIONS
function finishTask(id){
  fetch(`/api/tasks/${id}/done`,{method:"POST"}).then(loadTasks);
}

function deleteTask(id){
  fetch(`/api/tasks/${id}`,{method:"DELETE"}).then(loadTasks);
}


// INIT
setInterval(loadTasks,3000);
loadTasks();
