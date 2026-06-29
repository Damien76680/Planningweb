from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# --------- Modèle ---------
class Tache(BaseModel):
    titre: str
    jour: str

# --------- "Base de données" (temporaire) ---------
planning = []

# --------- Routes ---------

# 1. Page d'accueil
@app.get("/")
def root():
    return {"message": "API Planning en ligne ✅"}

# 2. Voir tout le planning
@app.get("/planning")
def get_planning():
    return planning

# 3. Ajouter une tâche
@app.post("/planning")
def add_tache(tache: Tache):
    planning.append(tache)
    return {"message": "Tâche ajoutée", "data": tache}

# 4. Supprimer une tâche
@app.delete("/planning/{index}")
def delete_tache(index: int):
    if index < len(planning):
        removed = planning.pop(index)
        return {"message": "Supprimée", "data": removed}
    return {"error": "Index invalide"}

# 5. Modifier une tâche
@app.put("/planning/{index}")
def update_tache(index: int, tache: Tache):
    if index < len(planning):
        planning[index] = tache
        return {"message": "Modifiée", "data": tache}
    return {"error": "Index invalide"}
