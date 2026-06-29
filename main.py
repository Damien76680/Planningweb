from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime

app = FastAPI()

# --------- Modèle ---------
class Task(BaseModel):
    nom: str
    duree: float
    deadline: str | None = None

# --------- "Base de données" ---------
tasks = []

# --------- ROUTES ---------

# ✅ 1. récupérer toutes les tâches
@app.get("/tasks")
def get_tasks():
    return tasks

# ✅ 2. ajouter une tâche
@app.post("/tasks")
def add_task(task: Task):
    new_task = {
        "nom": task.nom,
        "duree": task.duree,
        "deadline": task.deadline,
        "etat": "À faire",
        "temps_fait": 0,
        "start_time": None
    }
    tasks.append(new_task)
    return {"message": "Tâche ajoutée", "data": new_task}

# ✅ 3. supprimer une tâche
@app.delete("/tasks/{index}")
def delete_task(index: int):
    if index < 0 or index >= len(tasks):
        return {"error": "Index invalide"}
    deleted = tasks.pop(index)
    return {"message": "Supprimée", "data": deleted}

# ✅ 4. démarrer une tâche
@app.post("/tasks/{index}/start")
def start_task(index: int):
    if index >= len(tasks):
        return {"error": "Index invalide"}

    t = tasks[index]
    t["etat"] = "En cours"
    t["start_time"] = datetime.now().isoformat()
    return t

# ✅ 5. pause
@app.post("/tasks/{index}/pause")
def pause_task(index: int):
    if index >= len(tasks):
        return {"error": "Index invalide"}

    t = tasks[index]
    t["etat"] = "Pause"
    t["start_time"] = None
    return t

# ✅ 6. terminer
@app.post("/tasks/{index}/finish")
def finish_task(index: int):
    if index >= len(tasks):
        return {"error": "Index invalide"}

    t = tasks[index]
    t["etat"] = "Terminé"
    t["start_time"] = None
    return t
