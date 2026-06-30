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
    });
}


// ✅ AJOUT CORRIGÉ
function addTask() {

  const nom = document.getElementById("nom").value.trim();
  const client = document.getElementById("client").value.trim();
  const duree = parseFloat(document.getElementById("duree").value);
  let dl = document.getElementById("deadline").value.trim();

  if (!nom || isNaN(duree)) {
    alert("Erreur saisie");
    return;
  }

  // ✅ format deadline
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
  .then(() => loadTasks());
}


// ✅ TERMINER
function finishTask(id) {
  fetch(`/api/tasks/${id}/done`, {
    method: "POST"
  }).then(loadTasks);
}


// ✅ DELETE
function deleteTask(id) {
  fetch(`/api/tasks/${id}`, {
    method: "DELETE"
  }).then(loadTasks);
}


// 🔄 AUTO REFRESH
setInterval(loadTasks, 3000);
loadTasks();
