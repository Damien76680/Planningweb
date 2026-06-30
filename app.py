from flask import Flask, render_template, jsonify, request
from models import db, Task, Holiday, Settings
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from utils import next_work_time, add_hours, DEFAULT_CONFIG
import json
import os

app = Flask(__name__)

# ✅ DB
database_url = os.environ.get("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url or "sqlite:///db.sqlite3"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()


def now_paris():
    return datetime.now(ZoneInfo("Europe/Paris"))


# ---------------- UI ----------------
@app.route("/")
def index():
    return render_template("index.html")


# ---------------- SETTINGS ----------------
@app.route("/api/settings")
def get_settings():
    s = Settings.query.first()
    if s:
        return jsonify(json.loads(s.data))

    return jsonify(DEFAULT_CONFIG)


@app.route("/api/settings", methods=["POST"])
def save_settings():
    data = request.get_json()
    s = Settings.query.first() or Settings()
    s.data = json.dumps(data)
    db.session.add(s)
    db.session.commit()
    return {"success": True}


# ---------------- HOLIDAYS ----------------
@app.route("/api/holidays")
def get_holidays():
    return jsonify([h.date for h in Holiday.query.all()])


@app.route("/api/holidays", methods=["POST"])
def add_holiday():
    date = request.json.get("date")
    if date:
        db.session.add(Holiday(date=date))
        db.session.commit()
    return {"success": True}


@app.route("/api/holidays/<date>", methods=["DELETE"])
def delete_holiday(date):
    h = Holiday.query.filter_by(date=date).first()
    if h:
        db.session.delete(h)
        db.session.commit()
    return {"success": True}


# ---------------- TASKS ----------------
@app.route("/api/tasks")
def get_tasks():

    tasks = Task.query.order_by(Task.ordre).all()
    settings = Settings.query.first()

    config = json.loads(settings.data) if settings else DEFAULT_CONFIG
    holidays = [h.date for h in Holiday.query.all()]

    def is_holiday(date):
        return date.strftime("%Y-%m-%d") in holidays

    now = now_paris()
    current = now
    result = []

    for t in tasks:

        restant = 0 if t.etat == "Terminé" else t.duree

        start_time = next_work_time(current, config)

        # ✅ skip congés
        while is_holiday(start_time):
            start_time += timedelta(days=1)
            start_time = next_work_time(start_time, config)

        end_time = add_hours(start_time, restant, config) if restant > 0 else start_time

        # ✅ deadline
        deadline_display = "-"
        retard = False

        if t.deadline:
            try:
                dl = datetime.fromisoformat(t.deadline).replace(tzinfo=None)
                deadline_display = dl.strftime("%d/%m")

                if end_time.replace(tzinfo=None) > dl:
                    retard = True
            except:
                pass

        result.append({
            "id": t.id,
            "nom": t.nom,
            "client": t.client,
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


@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.get_json()

    deadline = data.get("deadline")
    if deadline:
        try:
            datetime.fromisoformat(deadline)
        except:
            deadline = None

    t = Task(
        nom=data.get("nom"),
        client=data.get("client"),
        duree=float(data.get("duree")),
        deadline=deadline,
        etat="À faire",
        ordre=(db.session.query(db.func.max(Task.ordre)).scalar() or 0) + 1
    )

    db.session.add(t)
    db.session.commit()
    return {"success": True}


@app.route("/api/tasks/<int:id>/done", methods=["POST"])
def finish_task(id):
    t = Task.query.get_or_404(id)
    t.etat = "Terminé"
    db.session.commit()
    return {"success": True}


@app.route("/api/tasks/<int:id>", methods=["DELETE"])
def delete_task(id):
    t = Task.query.get_or_404(id)
    db.session.delete(t)
    db.session.commit()
    return {"success": True}


@app.route("/api/tasks/reorder", methods=["POST"])
def reorder_tasks():
    ids = request.json
    for i, task_id in enumerate(ids):
        t = Task.query.get(task_id)
        if t:
            t.ordre = i
    db.session.commit()
    return {"success": True}
