// ---------------- LOAD TASKS ----------------
function loadTasks() {
  fetch("/api/tasks")
    .then(r => r.json())
    .then(data => {

      const container = document.getElementById("tasks");
      container.innerHTML = "";

      if (!data || data.length === 0) {
        container.innerHTML = "<p>⚠️ Aucune tâche</p>";
        return;
      }

      data.forEach(t => {

        const div = document.createElement("div");
        div.className = "task" + (t.retard ? " retard" : "");
        div.draggable = true;
        div.dataset.id = t.id;

        div.innerHTML = `
          <span class="col-nom">${t.nom}</span>
          <span class="col-client">${t.client}</span>
          <span class="col-duree">${t.duree}h</span>
          <span class="col-temps">${t.debut} → ${t.fin}</span>
          <span class="col-deadline">${t.deadline}</span>

          <span class="col-actions">
            <button onclick="editTask(${t.id})">✏️</button>
            <button onclick="finishTask(${t.id})">✅</button>
            <button onclick="deleteTask(${t.id})">🗑</button>
          </span>
        `;

        container.appendChild(div);
      });

      enableDragAndDrop();
    });
}


// ---------------- EDIT TASK ----------------
function editTask(id){

  fetch("/api/tasks")
    .then(r=>r.json())
    .then(tasks=>{
      const t = tasks.find(x => x.id === id);

      const nom = prompt("Nom :", t.nom);
      const client = prompt("Client :", t.client);
      const duree = prompt("Durée :", t.duree);
      const deadline = prompt("Deadline (JJMMAAAA) :", "");

      fetch(`/api/tasks/${id}/edit`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          nom,
          client,
          duree,
          deadline
        })
      }).then(loadTasks);
    });
}


// ---------------- ADD TASK ----------------
function addTask() {

  const nom = document.getElementById("nom").value;
  const client = document.getElementById("client").value;
  const duree = parseFloat(document.getElementById("duree").value);
  let dl = document.getElementById("deadline").value;

  if (/^\d{8}$/.test(dl)) {
    dl = `${dl.slice(4,8)}-${dl.slice(2,4)}-${dl.slice(0,2)}T00:00:00`;
  } else dl = null;

  fetch("/api/tasks", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({nom, client, duree, deadline: dl})
  }).then(loadTasks);
}


// ---------------- DELETE ----------------
function deleteTask(id){
  fetch(`/api/tasks/${id}`, {method:"DELETE"})
    .then(loadTasks);
}


// ---------------- FINISH ----------------
function finishTask(id){
  fetch(`/api/tasks/${id}/done`, {method:"POST"})
    .then(loadTasks);
}


// ---------------- DRAG & DROP ----------------
function enableDragAndDrop(){

  const items = document.querySelectorAll(".task");
  let dragged = null;

  items.forEach(item => {

    item.addEventListener("dragstart", () => {
      dragged = item;
    });

    item.addEventListener("dragover", e => {
      e.preventDefault();
    });

    item.addEventListener("drop", e => {
      e.preventDefault();

      const parent = item.parentNode;
      parent.insertBefore(dragged, item);

      updateOrder();
    });
  });
}


function updateOrder(){

  const ids = [...document.querySelectorAll(".task")]
    .map(el => parseInt(el.dataset.id));

  fetch("/api/tasks/reorder", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(ids)
  });
}


// ---------------- INIT ----------------
loadTasks();
