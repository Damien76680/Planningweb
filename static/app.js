let draggedId = null;

function loadTasks() {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(data => {

      let html = "";

      data.forEach(t => {

        let classe = "task afaire";
        if (t.etat === "En cours") classe = "task encours";
        if (t.etat === "Terminé") classe = "task termine";
        if (t.etat === "Pause") classe = "task pause";
        if (t.retard) classe += " retard";

        html += `
        <div class="${classe}" draggable="true" data-id="${t.id}">
          <h2>${t.nom}</h2>

          <p>Début: ${t.debut} | Fin: ${t.fin}</p>
          <p>Fait: ${t.fait}h | Restant: ${t.restant}h</p>
          <p>Deadline: ${t.deadline || "-"}</p>

          ${t.retard ? "<p style='color:red'>⚠️ RETARD</p>" : ""}

          <div class="buttons">
            <button onclick="setStatus(${t.id}, 'En cours')">▶</button>
            <button onclick="setStatus(${t.id}, 'Pause')">⏸</button>
            <button onclick="setStatus(${t.id}, 'Terminé')">✅</button>
            <button onclick="deleteTask(${t.id})">🗑</button>
          </div>
        </div>`;
      });

      document.getElementById("tasks").innerHTML = html;

      enableDrag();
    });
}


// ✅ DRAG & DROP
function enableDrag() {
  const items = document.querySelectorAll(".task");

  items.forEach(item => {

    item.addEventListener("dragstart", () => {
      draggedId = parseInt(item.dataset.id);
    });

    item.addEventListener("dragover", e => e.preventDefault());

    item.addEventListener("drop", () => {

      const targetId = parseInt(item.dataset.id);
      if (draggedId === targetId) return;

      const ids = Array.from(document.querySelectorAll(".task"))
        .map(el => parseInt(el.dataset.id));

      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(targetId);

      ids.splice(to, 0, ids.splice(from, 1)[0]);

      fetch("/api/tasks/reorder", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(ids)
      }).then(loadTasks);
    });
  });
}


// ✅ SUPPRESSION
function deleteTask(id) {
  if (!confirm("Supprimer cette tâche ?")) return;

  fetch(`/api/tasks/${id}`, {
    method: "DELETE"
  }).then(loadTasks);
}


// ✅ AJOUT AVEC DEADLINE CORRIGÉE
function addTask() {

  const nom = document.getElementById("nom").value.trim();
  const duree = parseFloat(document.getElementById("duree").value);
  const dl = document.getElementById("deadline").value;

  if (!nom || isNaN(duree)) {
    alert("Entrée invalide");
    return;
  }

  let deadline = null;

  if (dl && dl.length === 8) {
    const day = dl.slice(0,2);
    const month = dl.slice(2,4);
    const year = dl.slice(4,8);

    deadline = `${year}-${month}-${day}T00:00:00`;
  }

  fetch("/api/tasks", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({nom, duree, deadline})
  }).then(loadTasks);
}


// ✅ STATUS
function setStatus(id, etat) {
  fetch(`/api/tasks/${id}/status`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({etat})
  }).then(loadTasks);
}


// ✅ AUTO REFRESH
setInterval(loadTasks, 3000);
loadTasks();
``
