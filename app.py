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

    first_todo_found = False

    for t in tasks:

        # UPDATE TEMPS EN COURS
        if t.etat == "En cours" and t.start_time:
            start = datetime.fromisoformat(t.start_time)
            delta = work_time_between(start, now, DEFAULT_CONFIG)

            if delta > 0:
                t.temps_fait = min(t.duree, t.temps_fait + delta)

                if t.temps_fait >= t.duree:
                    t.etat = "Terminé"
                    t.start_time = None

        # DEBUT
        if t.etat == "En cours" and t.start_time:
            start_time = datetime.fromisoformat(t.start_time)

        elif t.etat == "À faire":
            if not first_todo_found:
                start_time = next_work_time(now, DEFAULT_CONFIG)
                first_todo_found = True
            else:
                start_time = next_work_time(current, DEFAULT_CONFIG)

        else:
            start_time = next_work_time(current, DEFAULT_CONFIG)

        # TEMPS RESTANT
        temps_base = t.duree

        if t.temps_fait > t.duree:
            temps_base = t.temps_fait

        if t.et
