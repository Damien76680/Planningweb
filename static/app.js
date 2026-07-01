// ---------------- TASKS ----------------
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

      enableDrag();
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


// ---------------- EDIT ----------------
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
        body: JSON.stringify({nom, client, duree, deadline})
      }).then(loadTasks);
    });
}


// ---------------- ACTIONS ----------------
function deleteTask(id){
  fetch(`/api/tasks/${id}`, {method:"DELETE"})
    .then(loadTasks);
}

function finishTask(id){
  fetch(`/api/tasks/${id}/done`, {method:"POST"})
    .then(loadTasks);
}


// ---------------- DRAG & DROP ----------------
function enableDrag(){

  let dragged = null;

  document.querySelectorAll(".task").forEach(item => {

    item.addEventListener("dragstart", () => dragged = item);

    item.addEventListener("dragover", e => e.preventDefault());

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
  })
  .then(() => {
    loadTasks(); // ✅ recalcul du planning
  });
}



// ---------------- HOLIDAYS ----------------
function loadHolidays(){
  fetch("/api/holidays")
    .then(r => r.json())
    .then(data => {
      const list = document.getElementById("holidayList");
      list.innerHTML = "";

      data.forEach(d => {
        const li = document.createElement("li");

        li.innerHTML = `
          ${d}
          <button onclick="deleteHoliday('${d}')">❌</button>
        `;

        list.appendChild(li);
      });
    });
}

function addHoliday(){

  let val = document.getElementById("holiday").value.trim();

  console.log("INPUT:", val);

  if (!/^\d{8}$/.test(val)) {
    alert("Format JJMMAAAA");
    return;
  }

  const formatted = `${val.slice(4,8)}-${val.slice(2,4)}-${val.slice(0,2)}`;

  fetch("/api/holidays", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({date: formatted})
  })
  .then(() => {
    loadHolidays();
    loadTasks();
  });
}


function deleteHoliday(date){
  fetch(`/api/holidays/${date}`, {method:"DELETE"})
    .then(() => {
      loadHolidays();
      loadTasks();
    });
}


// ---------------- INIT ----------------
loadTasks();
loadHolidays();
