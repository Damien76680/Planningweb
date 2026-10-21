const CHARGES_AFFAIRE = [
    "Damien",
    "Samuel",
    "Quentin",
    "Georges",
    "Sylvain"
];

const USER =
    new URLSearchParams(window.location.search)
    .get("user") || "stephane";

const ATELIER =
    new URLSearchParams(window.location.search)
    .get("vue") === "atelier";
window.addEventListener("DOMContentLoaded", () => {

    const title = document.getElementById("planningTitle");

    if (ATELIER) {

        const admin = document.getElementById("adminPanel");

        if (admin) {
            admin.style.display = "none";
        }

        if (title) {
            title.innerText = "Planning Atelier";
        }

    } else {

        if (title) {
            title.innerText =
                "Planning " +
                USER.charAt(0).toUpperCase() +
                USER.slice(1);
        }

    }

});

if (ATELIER) {

    document.getElementById("tasks").style.display = "none";

    const header = document.querySelector(".header");
    if (header) {
        header.style.display = "none";
    }

    loadAtelier();

}

console.log("USER =", USER);



// ---------------- TASKS ----------------

function loadTasks() {

    fetch(`/api/tasks?user=${USER}`)
        .then(r => r.json())
        .then(data => {

            const container =
                document.getElementById("tasks");

            container.innerHTML = "";

            if (!data || data.length === 0) {

                container.innerHTML =
                    "<p>⚠️ Aucune tâche</p>";

                return;
            }

            let separationAjoutee = false;

            data.forEach(t => {

                if (
                    t.etat === "Terminé" &&
                    !separationAjoutee
                ) {

                    const sep =
                        document.createElement("div");

                    sep.innerHTML = `
                        <div style="
                            margin:20px 0;
                            text-align:center;
                            font-weight:bold;
                            color:#666;
                            border-top:2px solid #ccc;
                            border-bottom:2px solid #ccc;
                            padding:8px;
                        ">
                            ✅ TÂCHES TERMINÉES
                        </div>
                    `;

                    container.appendChild(sep);

                    separationAjoutee = true;
                }

                const div =
                    document.createElement("div");

                div.className = "task";

                if (t.retard)
                    div.className += " retard";

                if (t.etat === "Terminé")
                    div.className += " done";

                div.draggable = true;

                div.dataset.id = t.id;

                div.innerHTML = `
                    <span class="col-nom">
                        ${t.nom}
                    </span>

                    <span class="col-client">
                        ${t.client}
                    </span>

                    <span class="col-charge">
                        ${t.charge_affaire}
                    </span>

                    <span class="col-duree">
                        ${t.duree}h
                    </span>

                    <span class="col-debut">
                        ${t.debut}
                    </span>

                    <span class="col-fin">
                        ${t.fin}
                    </span>

                    <span class="col-deadline">
                        ${t.deadline}
                    </span>

                    <span class="col-etat">
                        ${
                            t.etat === "Terminé"
                                ? "Fini"
                                : t.retard
                                    ? "En retard"
                                    : ""
                        }
                    </span>

                    ${
                        ATELIER
                        ? ""
                        : `
                        <span class="col-actions">
                            <button onclick="editTask(${t.id})">✏️</button>
                            <button onclick="finishTask(${t.id})">✅</button>
                            <button onclick="deleteTask(${t.id})">🗑️</button>
                        </span>
                        `
                    }
                `;

                container.appendChild(div);

            });

            enableDrag();

        });

}
// ---------------- ADD TASK ----------------
function addTask() {
  const nom = document.getElementById("nom").value;
  const charge_affaire =
    document.getElementById("charge_affaire").value;
  const client = document.getElementById("client").value;
  const duree = parseFloat(document.getElementById("duree").value);
  let dl = document.getElementById("deadline").value;

  if (/^\d{8}$/.test(dl)) {
    dl = `${dl.slice(4,8)}-${dl.slice(2,4)}-${dl.slice(0,2)}T00:00:00`;
  } else dl = null;

  fetch("/api/tasks", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
    user: USER,
    nom,
    client,
    charge_affaire,
    duree,
    deadline: dl
})
  }).then(loadTasks);
}


// ---------------- EDIT ----------------
let currentEditId = null;

function editTask(id){

    fetch(`/api/tasks?user=${USER}`)
        .then(r => r.json())
        .then(tasks => {

            const t = tasks.find(
                x => x.id === id
            );

            currentEditId = id;

            document.getElementById(
                "edit_nom"
            ).value = t.nom || "";

            document.getElementById(
                "edit_client"
            ).value = t.client || "";

            document.getElementById(
                "edit_charge_affaire"
            ).value = t.charge_affaire || "";

            document.getElementById(
                "edit_duree"
            ).value = t.duree || "";

            document.getElementById(
                "edit_deadline"
            ).value = "";

            document.getElementById(
                "editModal"
            ).style.display = "block";
        });
}

function closeModal(){

    document.getElementById(
        "editModal"
    ).style.display = "none";
}

function saveEdit(){

    const nom =
        document.getElementById(
            "edit_nom"
        ).value;

    const client =
        document.getElementById(
            "edit_client"
        ).value;

    const charge_affaire =
        document.getElementById(
            "edit_charge_affaire"
        ).value;

    const duree =
        document.getElementById(
            "edit_duree"
        ).value;

    const deadline =
        document.getElementById(
            "edit_deadline"
        ).value;

    fetch(`/api/tasks/${currentEditId}/edit`, {
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body: JSON.stringify({
            nom,
            client,
            charge_affaire,
            duree,
            deadline
        })
    })
    .then(() => {

        closeModal();

        loadTasks();
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
const ids = [...document.querySelectorAll(".task[data-id]")]
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
  fetch(`/api/holidays?user=${USER}`)
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
    body: JSON.stringify({
    user: USER,
    date: formatted
})
  })
  .then(() => {
    loadHolidays();
    loadTasks();
  });
}


function deleteHoliday(date){
  fetch(`/api/holidays/${date}?user=${USER}`, {
    method:"DELETE"
    })

    .then(() => {
      loadHolidays();
      loadTasks();
    });
}

function loadAtelier(){

    fetch("/api/atelier")
        .then(r => r.json())
        .then(data => {

            const div =
                document.getElementById("atelierView");

            let html = `
                <div style="
                    display:flex;
                    gap:15px;
                    align-items:flex-start;
                    overflow-x:auto;
                ">
            `;

            data.forEach(user => {

                html += `
                    <div style="
                        min-width:350px;
                        border:1px solid #ccc;
                        padding:10px;
                        background:#f8f8f8;
                    ">
                        <h2>${user.user}</h2>
                `;

                user.tasks.forEach(t => {

                    let color = "#ffffff";

                    if (t.retard)
                        color = "#ffe5e5";

                    if (t.etat === "Terminé")
                        color = "#d4ffd4";

                    html += `
                        <div style="
                            background:${color};
                            border:1px solid #ddd;
                            padding:6px;
                            margin-bottom:5px;
                        ">
                            <b>${t.nom}</b><br>
                            Client : ${t.client}<br>
                            Durée : ${t.duree} h<br>
                            Début : ${t.debut}<br>
                            Fin : ${t.fin}<br>
                            Deadline : ${t.deadline}
                        </div>
                    `;
                });

                html += `
                    </div>
                `;
            });

            html += `
                </div>
            `;

            div.innerHTML = html;
        });
}


// ---------------- INIT ----------------
if (ATELIER) {

    document.getElementById("tasks").style.display = "none";

    loadAtelier();

} else {

    loadTasks();
    loadHolidays();
    loadSettings();
}

// Rafraîchissement automatique toutes les 5 secondes
setInterval(() => {

    if (ATELIER) {
        loadAtelier();
    } else {
        loadTasks();
        loadHolidays();
    }

}, 5000);
// ---------------- EXPORT ----------------

function exportData() {

    fetch("/api/export")
        .then(response => response.json())
        .then(data => {

            const json =
                JSON.stringify(data, null, 2);

            const blob = new Blob(
                [json],
                { type: "application/json" }
            );

            const url =
                window.URL.createObjectURL(blob);

            const a =
                document.createElement("a");

            a.href = url;

            a.download =
                "planning_backup_" +
                new Date().toISOString().slice(0, 10) +
                ".json";

            document.body.appendChild(a);

            a.click();

            document.body.removeChild(a);

            window.URL.revokeObjectURL(url);

            alert("Sauvegarde téléchargée");
        })
        .catch(error => {

            console.error(error);

            alert("Erreur lors de l'export");

        });

}

// ---------------- IMPORT ----------------

function importData() {

    const file =
        document.getElementById("importFile")
        .files[0];

    if (!file) {

        alert("Choisissez un fichier");

        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {

        fetch("/api/import", {

            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: e.target.result

        })
        .then(() => {

            alert("Import terminé");

            location.reload();

        });

    };

    reader.readAsText(file);

}

function loadSettings() {

    fetch(`/api/settings?user=${USER}`)
        .then(r => r.json())
        .then(data => {

            const h = data.work_hours;

            if (!h) return;

            if (h.mon?.[0]) {
                document.getElementById("mon1_start").value = h.mon[0][0];
                document.getElementById("mon1_end").value = h.mon[0][1];
            }

            if (h.mon?.[1]) {
                document.getElementById("mon2_start").value = h.mon[1][0];
                document.getElementById("mon2_end").value = h.mon[1][1];
            }

            if (h.tue?.[0]) {
                document.getElementById("tue1_start").value = h.tue[0][0];
                document.getElementById("tue1_end").value = h.tue[0][1];
            }

            if (h.tue?.[1]) {
                document.getElementById("tue2_start").value = h.tue[1][0];
                document.getElementById("tue2_end").value = h.tue[1][1];
            }

            if (h.wed?.[0]) {
                document.getElementById("wed1_start").value = h.wed[0][0];
                document.getElementById("wed1_end").value = h.wed[0][1];
            }

            if (h.wed?.[1]) {
                document.getElementById("wed2_start").value = h.wed[1][0];
                document.getElementById("wed2_end").value = h.wed[1][1];
            }

            if (h.thu?.[0]) {
                document.getElementById("thu1_start").value = h.thu[0][0];
                document.getElementById("thu1_end").value = h.thu[0][1];
            }

            if (h.thu?.[1]) {
                document.getElementById("thu2_start").value = h.thu[1][0];
                document.getElementById("thu2_end").value = h.thu[1][1];
            }

            if (h.fri?.[0]) {
                document.getElementById("fri1_start").value = h.fri[0][0];
                document.getElementById("fri1_end").value = h.fri[0][1];
            }

        });

}



function saveSettings() {

    const work_hours = {

        mon: [
            [document.getElementById("mon1_start").value,
             document.getElementById("mon1_end").value],
            [document.getElementById("mon2_start").value,
             document.getElementById("mon2_end").value]
        ],

        tue: [
            [document.getElementById("tue1_start").value,
             document.getElementById("tue1_end").value],
            [document.getElementById("tue2_start").value,
             document.getElementById("tue2_end").value]
        ],

        wed: [
            [document.getElementById("wed1_start").value,
             document.getElementById("wed1_end").value],
            [document.getElementById("wed2_start").value,
             document.getElementById("wed2_end").value]
        ],

        thu: [
            [document.getElementById("thu1_start").value,
             document.getElementById("thu1_end").value],
            [document.getElementById("thu2_start").value,
             document.getElementById("thu2_end").value]
        ],

        fri: [
            [document.getElementById("fri1_start").value,
             document.getElementById("fri1_end").value]
        ],

        sat: [],
        sun: []
    };

    fetch(`/api/settings?user=${USER}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            work_hours: work_hours
        })
    })
    .then(() => {
        alert("Horaires sauvegardés");
        loadTasks();
    });

}
function toggleAdmin() {

    const panel =
        document.getElementById("adminPanel");

    if (
        panel.style.display === "none"
    ) {
        panel.style.display = "block";
    } else {
        panel.style.display = "none";
    }
}
