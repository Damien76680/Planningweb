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

# ✅ fonction centralisée heure France
def now_paris():
    return datetime.now(ZoneInfo("Europe/Paris"))


# ---------------- UI ----------------
@app.route("/")
def index():
    return render_template("index.html")


# ---------------- API ----------------
@app.route("/api/tasks")
def get_tasks():
    tasks = Task.query.order_by(Task.ordre).all()

    now = now_paris()
    current = now
    result = []

    for t in tasks:

        # ---------------- UPDATE TEMPS EN COURS ----------------
        if t.etat == "En cours" and t.start_time:
            start = datetime.fromisoformat(t.start_time)
            delta = work_time_between(start, now, DEFAULT_CONFIG)

            if delta > 0:
                t.temps_fait += delta
                t.start_time = now.isoformat()

                if t.temps_fait >= t.duree:
                    t.etat = "Terminé"
                    t.start_time = None

        # ---------------- GESTION DU DÉBUT ----------------
        if t.etat == "En cours" and t.start_time:
            start_time = datetime.fromisoformat(t.start_time)

        elif t.etat == "À faire":
            start_time = next_work_time(now, DEFAULT_CONFIG)

        else:
            start_time = next_work_time(current, DEFAULT_CONFIG)

        # ---------------- TEMPS RESTANT ----------------
        temps_base = t.duree

        if t.temps_fait > t.duree:
            temps_base = t.temps_fait

        if t.etat == "Terminé":
            temps_base = 0

        restant = max(0, temps_base - t.temps_fait)

        # ---------------- FIN ----------------
        if restant <= 0:
            end_time = start_time
        else:
            end_time = add_hours(start_time, restant, DEFAULT_CONFIG)

        # ---------------- DEADLINE ----------------
        retard = False
        deadline_display = ""

        if t.deadline:
            dl = datetime.fromisoformat(t.deadline)
            deadline_display = dl.strftime("%d/%m")

            if end_time > dl:
                retard = True

        # ---------------- JSON ----------------
        result.append({
            "id": t.id,
            "nom": t.nom,
            "etat": t.etat,
            "debut": start_time.strftime("%d/%m %H:%M"),
            "fin": end_time.strftime("%d/%m %H:%M"),
            "fait": round(t.temps_fait, 1),
            "restant": round(restant, 1),
            "deadline": deadline_display,
            "retard": retard
        })

        # ---------------- CHAÎNE DU PLANNING ----------------
        if t.etat in ["En cours", "À faire"]:
            current = end_time

    db.session.commit()
    return jsonify(result)


# ---------------- AJOUT ----------------
@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.json

    if not data.get("nom") or not data.get("duree"):
        return {"error": "Invalid data"}, 400

    max_order = db.session.query(db.func.max(Task.ordre)).scalar() or 0

    task = Task(
        nom=data["nom"],
        duree=float(data["duree"]),
        deadline=data.get("deadline"),
        etat="À faire",
        ordre=max_order + 1
    )

    db.session.add(task)
    db.session.commit()

    return {"success": True}


# ---------------- STATUS ----------------
@app.route("/api/tasks/<int:id>/status", methods=["POST"])
def update_status(id):
    t = Task.query.get_or_404(id)
    data = request.json

    t.etat = data["etat"]

    if data["etat"] == "En cours":
        t.start_time = now_paris().isoformat()

    if data["etat"] == "Pause":
        t.start_time = None

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
