from flask import Flask, render_template, jsonify, request
from models import db, Task
from datetime import datetime
from zoneinfo import ZoneInfo
from utils import next_work_time, add_hours, DEFAULT_CONFIG

app = Flask(__name__)

import os

database_url = os.environ.get("DATABASE_URL")

# ✅ correction Render (important)
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()


def now_paris():
    return datetime.now(ZoneInfo("Europe/Paris"))


@app.route("/")
def index():
    return render_template("index.html")


# ---------------- GET TASKS ----------------
@app.route("/api/tasks")
def get_tasks():

    tasks = Task.query.order_by(Task.ordre).all()

    now = now_paris()
    current = now
    result = []

    for t in tasks:

        restant = 0 if t.etat == "Terminé" else t.duree

        start_time = next_work_time(current, DEFAULT_CONFIG)

        if restant > 0:
            end_time = add_hours(start_time, restant, DEFAULT_CONFIG)
        else:
            end_time = start_time

deadline_display = "-"
retard = False

if t.deadline:

    try:
        dl_str = str(t.deadline)

        # ✅ supprime timezone si présente (ultra important)
        if "+" in dl_str:
            dl_str = dl_str.split("+")[0]

        dl = datetime.fromisoformat(dl_str)

        deadline_display = dl.strftime("%d/%m")

        if end_time > dl:
            retard = True

    except Exception as e:
        print("ERREUR DEADLINE :", t.deadline, e)
        deadline_display = "-"

        result.append({
            "id": t.id,
            "nom": t.nom,
            "etat": t.etat,
            "duree": t.duree,
            "debut": start_time.strftime("%d/%m %H:%M") if t.etat != "Terminé" else "",
            "fin": end_time.strftime("%d/%m %H:%M") if t.etat != "Terminé" else "",
            "deadline": deadline_display,
            "retard": retard
        })

        if t.etat != "Terminé":
            current = end_time

    return jsonify(result)


# ---------------- ADD TASK ----------------
@app.route("/api/tasks", methods=["POST"])
def add_task():

    data = request.get_json(force=True)  # ✅ IMPORTANT

    print("DATA RECU :", data)

    nom = data.get("nom")
    duree = data.get("duree")
    deadline = data.get("deadline")

    print("DEADLINE RECU :", deadline)

    if not nom or not duree:
        return {"error": "Invalid data"}, 400

    # ✅ nettoyage deadline
    if deadline and isinstance(deadline, str):
        try:
            datetime.fromisoformat(deadline)
        except:
            print("Deadline invalide:", deadline)
            deadline = None
    else:
        deadline = None

    max_order = db.session.query(db.func.max(Task.ordre)).scalar() or 0

    task = Task(
        nom=nom,
        duree=float(duree),
        deadline=deadline,
        etat="À faire",
        ordre=max_order + 1
    )

    db.session.add(task)
    db.session.commit()

    print("SAUVEGARDE DEADLINE :", task.deadline)

    return {"success": True}




# ---------------- FINISH ----------------
@app.route("/api/tasks/<int:id>/done", methods=["POST"])
def finish_task(id):

    t = Task.query.get_or_404(id)
    t.etat = "Terminé"

    db.session.commit()

    return {"success": True}


# ---------------- DELETE ----------------
@app.route("/api/tasks/<int:id>", methods=["DELETE"])
def delete_task(id):

    t = Task.query.get_or_404(id)

    db.session.delete(t)
    db.session.commit()

    return {"success": True}


# ---------------- REORDER ----------------
@app.route("/api/tasks/reorder", methods=["POST"])
def reorder_tasks():

    ids = request.json

    for index, task_id in enumerate(ids):
        t = Task.query.get(task_id)
        if t:
            t.ordre = index

    db.session.commit()

    return {"success": True}
