from flask import Flask, jsonify, request, render_template
from models import db, Task, Holiday, Settings
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import os

app = Flask(__name__)

# DB
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL or "sqlite:///db.sqlite3"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()


def now():
    return datetime.now(ZoneInfo("Europe/Paris"))


# ---------------- PAGE
@app.route("/")
def index():
    return render_template("index.html")


# ---------------- TASKS
@app.route("/api/tasks")
def get_tasks():
    try:
        tasks = Task.query.order_by(Task.ordre).all()

        result = []
        current = now()

        holidays = [h.date for h in Holiday.query.all()]

        for t in tasks:

            duration = 0 if t.etat == "Terminé" else float(t.duree or 0)

            start = current
            end = start + timedelta(hours=duration)

            # skip simple holiday (jour entier)
            while start.strftime("%Y-%m-%d") in holidays:
                start += timedelta(days=1)
                end = start + timedelta(hours=duration)

            result.append({
                "id": t.id,
                "nom": t.nom,
                "client": t.client,
                "etat": t.etat,
                "duree": t.duree,
                "debut": start.strftime("%d/%m %H:%M"),
                "fin": end.strftime("%d/%m %H:%M"),
                "deadline": t.deadline or "-",
                "retard": False
            })

            if t.etat != "Terminé":
                current = end

        return jsonify(result)

    except Exception as e:
        print("ERREUR TASKS:", e)
        return jsonify([])


@app.route("/api/tasks", methods=["POST"])
def add_task():
    try:
        data = request.get_json()

        t = Task(
            nom=data.get("nom"),
            client=data.get("client"),
            duree=float(data.get("duree", 1)),
            deadline=data.get("deadline"),
            etat="À faire",
            ordre=(db.session.query(db.func.max(Task.ordre)).scalar() or 0) + 1
        )

        db.session.add(t)
        db.session.commit()

        return {"success": True}

    except Exception as e:
        print("ERREUR ADD:", e)
        return {"success": False}


# ---------------- HOLIDAYS
@app.route("/api/holidays")
def get_holidays():
    return jsonify([h.date for h in Holiday.query.all()])


@app.route("/api/holidays", methods=["POST"])
def add_holiday():
    try:
        date = request.json.get("date")

        if date:
            db.session.add(Holiday(date=date))
            db.session.commit()

        return {"success": True}
    except Exception as e:
        print("ERREUR HOLIDAY:", e)
        return {"success": False}


# ---------------- REORDER
@app.route("/api/tasks/reorder", methods=["POST"])
def reorder():
    ids = request.get_json()

    for i, tid in enumerate(ids):
        t = Task.query.get(tid)
        if t:
            t.ordre = i

    db.session.commit()
    return {"success": True}


# ---------------- DONE
@app.route("/api/tasks/<int:id>/done", methods=["POST"])
def done(id):
    t = Task.query.get_or_404(id)
    t.etat = "Terminé"
    db.session.commit()
    return {"success": True}


# ---------------- DELETE
@app.route("/api/tasks/<int:id>", methods=["DELETE"])
def delete(id):
    t = Task.query.get_or_404(id)
    db.session.delete(t)
    db.session.commit()
    return {"success": True}
