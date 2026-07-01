from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user = db.Column(db.String(50), index=True)  # ✅ AJOUT

    nom = db.Column(db.String(200))
    client = db.Column(db.String(200))
    duree = db.Column(db.Float)
    etat = db.Column(db.String(50))
    ordre = db.Column(db.Integer)
    deadline = db.Column(db.String, nullable=True)


class Holiday(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user = db.Column(db.String(50), index=True)  # ✅ AJOUT

    date = db.Column(db.String, unique=True)


class Settings(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user = db.Column(db.String(50), index=True)  # ✅ AJOUT

    data = db.Column(db.Text)
