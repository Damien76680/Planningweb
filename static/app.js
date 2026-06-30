let draggedId = null;

function loadTasks() {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(data => {

      let html = "";

      data.forEach(t => {

        let classe = "task afaire";
        if (t.etat === "Terminé") classe = "task termine";
        if (t.retard) classe += " retard";

        html += `
        <div class="${classe}" draggable="true" data-id="${t.id}">

          <h3>${t.nom}</h3>

          ${t.etat !== "Terminé" ? `
            <p>⏱ ${t.duree}h</p>
            <p>${t.debut} → ${t.fin}</p>
          ` : `
            <p style="color:green">✅ Terminée</p>
          `}

          <p>📅 ${t.deadline || "-"}</p>

          ${t.retard ? "<p style='color:red'>⚠️ RETARD</p>" : ""}

          <div>
            ${t.etat !== "Terminé" ? `<button onclick="finishTask(${t.id})">✅</button>` : ""}
            <button onclick="deleteTask(${t.id})">🗑</button>
          </div>

        </div>
        `;
      });

      document.getElementById("tasks").innerHTML = html;

      enableDrag();
    });
}


// ✅ FINIR
function finishTask(id) {
  fetch(`/api/tasks/${id}/done`, {
    method: "POST"
  }).then(loadTasks);
}


// ✅ DELETE
function deleteTask(id) {
  if (!confirm("Supprimer ?")) return;

  fetch(`/api/tasks/${id}`, {
    method: "DELETE"
  }).then(loadTasks);
}


// ✅ AJOUT DEADLINE CORRIGÉE
function addTask() {

  const nom = document.getElementById("nom").value.trim();
  const duree = parseFloat(document.getElementById("duree").value);
  const dl = document.getElementById("deadline").value.trim();

  if (!nom || isNaN(duree)) {
    alert("Erreur saisie");
    return;
  }

  let deadline = null;

  // ✅ VALIDATION STRICTE JJMMAAAA
  if (/^\d{8}$/.test(dl)) {
    const day = dl.substring(0,2);
    const month = dl.substring(2,4);
    const year = dl.substring(4,8);

    deadline = `${year}-${month}-${day}T00:00:00`;
  }

  console.log("Deadline envoyée :", deadline);

  fetch("/api/tasks", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({nom, duree, deadline})
  }).then(loadTasks);
}


// ✅ DRAG
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

setInterval(loadTasks, 3000);
loadTasks();
