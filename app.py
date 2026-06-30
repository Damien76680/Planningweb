from flask import Flask, render_template, jsonify, request
from models import db, Task
from datetime import datetime
from zoneinfo import ZoneInfo
from utils import next_work_time, add_hours, DEFAULT_CONFIG
import os

app = Flask(__name__)

# ✅ CONFIG DATABASE (Render + local)
database_url = os.environ.get("DATABASE_URL")

if database_url:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///db.sqlite3"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()


# ✅ Heure FR
def now_paris():
    return datetime.now(ZoneInfo("Europe/Paris"))


# ---------------- PAGE ----------------
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

        # ✅ DEADLINE (FIX FINAL TIMEZONE)
        deadline_display = "-"
        retard = False

        if t.deadline:
            try:
                dl = datetime.fromisoformat(str(t.deadline))

                # ✅ IMPORTANT : supprimer timezone pour comparaison
                dl = dl.replace(tzinfo=None)
                end_naive = end_time.replace(tzinfo=None)

                deadline_display = dl.strftime("%d/%m")

                if end_naive > dl:
                    retard = True

            except Exception as e:
                print("Erreur deadline:", t.deadline, e)
                deadline_display = "-"

        # ✅ resultat envoyé au front
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

    data = request.get_json(force=True)

    nom = data.get("nom")
    duree = data.get("duree")
    deadline = data.get("deadline")

    print("DEBUG deadline reçu:", deadline)

    if not nom or not duree:
        return {"error": "Invalid data"}, 400

    # ✅ VALIDATION DEADLINE
    if deadline:
        try:
            # supprime timezone si ajoutée par PostgreSQL
            datetime.fromisoformat(str(deadline).split("+")[0])
        except:
            print("Deadline invalide ignorée:", deadline)
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

    print("DEBUG sauvegarde deadline:", task.deadline)

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
