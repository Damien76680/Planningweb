from flask import Flask, jsonify, request, render_template
from models import db, Task, Holiday, Settings
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import json
import os

app = Flask(__name__)

# ---------------- DATABASE ----------------
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL or "sqlite:///db.sqlite3"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()


# ---------------- TIME ----------------
def now():
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

    return jsonify({
        "work_hours": {
            "mon": [["07:30","12:30"],["13:30","16:00"]],
            "tue": [["07:30","12:30"],["13:30","16:00"]],
            "wed": [["07:30","12:30"],["13:30","16:00"]],
            "thu": [["07:30","12:30"],["13:30","16:00"]],
            "fri": [["07:30","12:30"]],
            "sat": [],
            "sun": []
        }
    })


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


# ---------------- PLANNING ----------------
def calculate_planning(start, duration, work_hours, holidays):

    def is_holiday(d):
        return d.strftime("%Y-%m-%d") in holidays

    current = start
    remaining = duration

    while remaining > 0:

        if is_holiday(current):
            current += timedelta(days=1)
            current = current.replace(hour=7, minute=30)
            continue

        day = current.strftime("%a").lower()[:3]
        slots = work_hours.get(day, [])

        if not slots:
            current += timedelta(days=1)
            current = current.replace(hour=7, minute=30)
            continue

        progressed = False

        for s, e in slots:

            h1, m1 = map(int, s.split(":"))
            h2, m2 = map(int, e.split(":"))

            slot_start = current.replace(hour=h1, minute=m1)
            slot_end = current.replace(hour=h2, minute=m2)

            if current < slot_start:
                current = slot_start

            if slot_start <= current < slot_end:

                available = (slot_end - current).total_seconds() / 3600

                if remaining <= available:
                    current += timedelta(hours=remaining)
                    return current
                else:
                    remaining -= available
                    current = slot_end
                    progressed = True

        if not progressed:
            current += timedelta(days=1)
            current = current.replace(hour=7, minute=30)

    return current


# ---------------- TASKS ----------------
@app.route("/api/tasks")
def get_tasks():
    try:
        tasks = Task.query.order_by(Task.ordre).all()
        holidays = [h.date for h in Holiday.query.all()]

        # horaires
        work_hours = get_settings().json["work_hours"]

        settings = Settings.query.first()
        if settings and settings.data:
            try:
                user = json.loads(settings.data)
                if "work_hours" in user:
                    work_hours = user["work_hours"]
            except:
                pass

        current = now()
        result = []

        for t in tasks:

            duration = 0 if t.etat == "Terminé" else float(t.duree or 0)

            start = current

            while start.strftime("%Y-%m-%d") in holidays:
                start += timedelta(days=1)

            end = calculate_planning(start, duration, work_hours, holidays)

            # ✅ deadline formatée
            deadline_display = "-"
            deadline_date = None

            if t.deadline:
                try:
                    d = datetime.fromisoformat(str(t.deadline))
                    deadline_display = d.strftime("%d/%m")
                    deadline_date = d
                except:
                    pass

            # ✅ ✅ RETARD
            retard = False
            if deadline_date and t.etat != "Terminé":
                if end > deadline_date:
                    retard = True

            result.append({
                "id": t.id,
                "nom": t.nom or "-",
                "client": t.client or "-",
                "etat": t.etat,
                "duree": t.duree,
                "debut": start.strftime("%d/%m %H:%M"),
                "fin": end.strftime("%d/%m %H:%M"),
                "deadline": deadline_display,
                "retard": retard
            })

            if t.etat != "Terminé":
                current = end

        return jsonify(result)

    except Exception as e:
        print("ERREUR:", e)
        return jsonify([])
