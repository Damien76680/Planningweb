from flask import Flask, render_template, jsonify, request
from models import db, Task
from datetime import datetime
from zoneinfo import ZoneInfo
from utils import *

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()

def now_paris():
    return datetime.now(ZoneInfo("Europe/Paris"))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/tasks")
def get_tasks():

    tasks = Task.query.order_by(Task.ordre).all()

    now = now_paris()
    current = now
    result = []

    for t in tasks:

        restant = 0 if t.etat == "Terminé" else t.duree

        start_time = next_work_time(current, DEFAULT_CONFIG)

        if restant <= 0:
            end_time = start_time
        else:
            end_time = add_hours(start_time, restant, DEFAULT_CONFIG)

        retard = False
        deadline_display = ""

        if t.deadline:
            try:
                dl = datetime.fromisoformat(t.deadline)
                deadline_display = dl.strftime("%d/%m")

                if end_time > dl:
                    retard = True
            except:
                deadline_display = ""

        result.append({
            "id": t.id,
            "nom": t.nom,
            "etat": t.etat,
            "debut": start_time.strftime("%d/%m %H:%M") if t.etat != "Terminé" else "",
            "fin": end_time.strftime("%d/%m %H:%M") if t.etat != "Terminé" else "",
            "duree": t.duree,
            "deadline": deadline_display,
            "retard": retard
        })

        if t.etat != "Terminé":
            current = end_time

    return jsonify(result)


# AJOUT
@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.json

    max_order = db.session.query(db.func.max(Task.ordre)).scalar() or 0

    deadline = data.get("deadline")

    if not deadline or "T" not in deadline:
        deadline = None

    task = Task(
        nom=data["nom"],
        duree=float(data["duree"]),
        deadline=deadline,
        etat="À faire",
        ordre=max_order + 1
    )

    db.session.add(task)
    db.session.commit()

    return {"success": True}


# TERMINER
@app.route("/api/tasks/<int:id>/done", methods=["POST"])
def finish_task(id):
    t = Task.query.get_or_404(id)

    t.etat = "Terminé"

    db.session.commit()

    return {"success": True}


# DELETE
@app.route("/api/tasks/<int:id>", methods=["DELETE"])
def delete_task(id):
    t = Task.query.get_or_404(id)
    db.session.delete(t)
    db.session.commit()
    return {"success": True}


# REORDER
@app.route("/api/tasks/reorder", methods=["POST"])
def reorder_tasks():
    ids = request.json

    for index, task_id in enumerate(ids):
        t = Task.query.get(task_id)
        if t:
            t.ordre = index

    db.session.commit()
    return {"success": True}
