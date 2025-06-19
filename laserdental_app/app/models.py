# app/models.py
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    budgets = db.relationship('Budget', backref='author', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

class Doctor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    budgets = db.relationship('Budget', backref='doctor_assigned', lazy='dynamic')

    def __repr__(self):
        return f'<Doctor {self.name}>'

class Budget(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_name = db.Column(db.String(100), nullable=False)
    patient_lastname = db.Column(db.String(100), nullable=False)
    file_number = db.Column(db.String(50), unique=True, nullable=True)
    mobile_phone = db.Column(db.String(20), nullable=True)
    landline_phone = db.Column(db.String(20), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    province = db.Column(db.String(100), nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    budget_delivery_date = db.Column(db.Date, nullable=True)
    budget_amount = db.Column(db.Float, nullable=False, default=0.0)
    clinic_review_date = db.Column(db.Date, nullable=True)
    annotations = db.Column(db.Text, nullable=True)
    expected_callback_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='Pendientes y seguimiento')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=True)

    def __repr__(self):
        return f'<Budget {self.file_number} - {self.patient_name} {self.patient_lastname}>'

BUDGET_STATUSES = [
    'Aceptado',
    'Rechazado totalmente',
    'Aceptado financiado',
    'Aceptado pronto pago',
    'Según tratamiento',
    'Pendientes y seguimiento',
    'Finalizado'
]
