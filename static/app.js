function addTask() {

  const nom = document.getElementById("nom").value.trim();
  const duree = parseFloat(document.getElementById("duree").value);
  const dl = document.getElementById("deadline").value;

  if (!nom || isNaN(duree)) {
    alert("Entrée invalide");
    return;
  }

  // ✅ DATE SÉCURISÉE
  let deadline = null;

  if (dl && dl.length === 8) {
    const day = dl.slice(0,2);
    const month = dl.slice(2,4);
    const year = dl.slice(4,8);

    deadline = `${year}-${month}-${day}T00:00:00`;
  }

  fetch("/api/tasks", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({nom, duree, deadline})
  }).then(loadTasks);
}
