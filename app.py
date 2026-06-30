from flask import Flask, render_template, jsonify, request
from models import db, Task, Holiday, Settings
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from utils import next_work_time, add_hours, DEFAULT_CONFIG
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


# ---------------- UTILS ----------------
def now_paris():
    return datetime.now(ZoneInfo("Europe/Paris"))


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
    try:
        return jsonify([h.date for h in Holiday.query.all()])
    except Exception as e:
        print("Erreur holidays:", e)
        return jsonify([])


@app.route("/api/holidays", methods=["POST"])
def add_holiday():
    try:
        date = request.json.get("date")

        if date and not Holiday.query.filter_by(date=date).first():
            db.session.add(Holiday(date=date))
            db.session.commit()

        return {"success": True}
    except Exception as e:
        print("Erreur add holiday:", e)
        return {"success": False}


@app.route("/api/holidays/<date>", methods=["DELETE"])
def delete_holiday(date):
    try:
        h = Holiday.query.filter_by(date=date).first()
        if h:
            db.session.delete(h)
            db.session.commit()

        return {"success": True}
    except Exception as e:
        print("Erreur delete holiday:", e)
        return {"success": False}


# ---------------- TASKS ----------------
@app.route("/api/tasks")
def get_tasks():

    try:
        tasks = Task.query.order_by(Task.ordre).all()

        # ✅ CONFIG SAFE
        config = DEFAULT_CONFIG
        settings = Settings.query.first()

        if settings and settings.data:
            try:
                config = json.loads(settings.data)
            except Exception as e:
                print("Erreur SETTINGS:", e)

        # ✅ HOLIDAYS SAFE
        holidays = []
        try:
            holidays = [h.date for h in Holiday.query.all()]
        except Exception as e:
            print("Erreur HOLIDAYS:", e)

        def is_holiday(d):
            return d.strftime("%Y-%m-%d") in holidays

        now = now_paris()
        current = now
        result = []

        for t in tasks:

            restant = 0 if t.etat == "Terminé" else float(t.duree or 0)

            # ✅ START sécurisé
            try:
                start_time = next_work_time(current, config)
            except Exception as e:
                print("Erreur start_time:", e)
                start_time = current

            # ✅ skip congés
            while is_holiday(start_time):
                start_time += timedelta(days=1)

            # ✅ END sécurisé
            try:
                end_time = add_hours(start_time, restant, config) if restant > 0 else start_time
            except Exception as e:
                print("Erreur end_time:", e)
                end_time = start_time

            # ✅ DEADLINE sécurisé
            deadline_display = "-"
            retard = False

            if t.deadline:
                try:
                    dl = datetime.fromisoformat(str(t.deadline)).replace(tzinfo=None)

                    if end_time.replace(tzinfo=None) > dl:
                        retard = True

                    deadline_display = dl.strftime("%d/%m")

                except Exception as e:
                    print("Erreur deadline:", e)

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

    except Exception as e:
        print("ERREUR GLOBAL GET_TASKS:", e)
        return jsonify([])  # ✅ ne crash jamais


# ---------------- ADD TASK ----------------
@app.route("/api/tasks", methods=["POST"])
def add_task():

    try:
        data = request.get_json()

        nom = data.get("nom")
        client = data.get("client")
        duree = data.get("duree")
        deadline = data.get("deadline")

        if not nom or not duree:
            return {"error": "Invalid data"}, 400

        # ✅ validation deadline
        if deadline:
            try:
                datetime.fromisoformat(deadline)
            except:
                deadline = None

        task = Task(
            nom=nom,
            client=client,
            duree=float(duree),
            deadline=deadline,
            etat="À faire",
            ordre=(db.session.query(db.func.max(Task.ordre)).scalar() or 0) + 1
        )

        db.session.add(task)
        db.session.commit()

        return {"success": True}

    except Exception as e:
        print("Erreur add_task:", e)
        return {"success": False}


# ---------------- DONE ----------------
@app.route("/api/tasks/<int:id>/done", methods=["POST"])
def finish_task(id):
    try:
        t = Task.query.get_or_404(id)
        t.etat = "Terminé"
        db.session.commit()
        return {"success": True}
    except Exception as e:
        print("Erreur finish:", e)
        return {"success": False}


# ---------------- DELETE ----------------
@app.route("/api/tasks/<int:id>", methods=["DELETE"])
def delete_task(id):
    try:
        t = Task.query.get_or_404(id)
        db.session.delete(t)
        db.session.commit()
        return {"success": True}
    except Exception as e:
        print("Erreur delete:", e)
        return {"success": False}
