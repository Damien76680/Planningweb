from flask import Flask, render_template, jsonify, request
from models import db, Task, Holiday, Settings
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from utils import next_work_time, DEFAULT_CONFIG
import json
import os

app = Flask(__name__)

# ---------------- DATABASE ----------------
database_url = os.environ.get("DATABASE_URL")

if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url or "sqlite:///db.sqlite3"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()


# ---------------- HEURE LOCALE ----------------
def now_paris():
    return datetime.now(ZoneInfo("Europe/Paris"))


# ✅ ✅ ✅ MOTEUR FINAL CORRIGÉ (horaires + congés)
def add_hours_skip_holidays(start, hours, config, holidays):

    def is_holiday(d):
        return d.strftime("%Y-%m-%d") in holidays

    current = start
    remaining = hours

    while remaining > 0:

        weekday = current.strftime("%a").lower()[:3]
        work_hours = config["work_hours"].get(weekday, [])

        in_slot = False
        next_stop = None

        for start_str, end_str in work_hours:

            h1, m1 = map(int, start_str.split(":"))
            h2, m2 = map(int, end_str.split(":"))

            slot_start = current.replace(hour=h1, minute=m1, second=0)
            slot_end = current.replace(hour=h2, minute=m2, second=0)

            if slot_start <= current < slot_end:
                in_slot = True
                next_stop = slot_end
                break

        # ✅ si pas dans une plage → on corrige avec la config
        if not in_slot:
            current = next_work_time(current, config)
            continue

        # ✅ skip congé
        if is_holiday(current):
            current += timedelta(days=1)
            current = next_work_time(current, config)
            continue

        available = (next_stop - current).total_seconds() / 3600

        if remaining <= available:
            return current + timedelta(hours=remaining)

        # ✅ consommer le créneau
        remaining -= available
        current = next_stop

    return current


# ---------------- PAGE ----------------
@app.route("/")
def index():
    return render_template("index.html")


# ---------------- SETTINGS ----------------
@app.route("/api/settings")
def get_settings():
    s = Settings.query.first()

    if s and s.data:
        try:
            return jsonify(json.loads(s.data))
        except:
            pass

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

    if date and not Holiday.query.filter_by(date=date).first():
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

    # ✅ config sûre
    config = DEFAULT_CONFIG.copy()

    settings = Settings.query.first()
    if settings and settings.data:
        try:
            user_config = json.loads(settings.data)
            if "work_hours" in user_config:
                config["work_hours"] = user_config["work_hours"]
        except Exception as e:
            print("Erreur config:", e)

    holidays = [h.date for h in Holiday.query.all()]

    now = now_paris()
    current = now
    result = []

    for t in tasks:

        restant = 0 if t.etat == "Terminé" else float(t.duree or 0)

        start_time = next_work_time(current, config)

        # ✅ skip congés au départ
        while start_time.strftime("%Y-%m-%d") in holidays:
            start_time += timedelta(days=1)
            start_time = next_work_time(start_time, config)

        # ✅ calcul réel
        if restant > 0:
            end_time = add_hours_skip_holidays(start_time, restant, config, holidays)
        else:
            end_time = start_time

        # ✅ deadline
        deadline_display = "-"
        retard = False

        if t.deadline:
            try:
                dl = datetime.fromisoformat(str(t.deadline)).replace(tzinfo=None)

                if end_time.replace(tzinfo=None) > dl:
                    retard = True

                deadline_display = dl.strftime("%d/%m")

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


# ---------------- ADD ----------------
@app.route("/api/tasks", methods=["POST"])
def add_task():

    data = request.get_json()

    task = Task(
        nom=data.get("nom"),
        client=data.get("client"),
        duree=float(data.get("duree")),
        deadline=data.get("deadline"),
        etat="À faire",
        ordre=(db.session.query(db.func.max(Task.ordre)).scalar() or 0) + 1
    )

    db.session.add(task)
    db.session.commit()

    return {"success": True}


# ---------------- REORDER ----------------
@app.route("/api/tasks/reorder", methods=["POST"])
def reorder_tasks():

    ids = request.get_json()

    for i, task_id in enumerate(ids):
        t = Task.query.get(task_id)
        if t:
            t.ordre = i

    db.session.commit()

    return {"success": True}


# ---------------- DONE ----------------
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
