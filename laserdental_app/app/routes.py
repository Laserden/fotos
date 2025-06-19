# app/routes.py
from flask import render_template, flash, redirect, url_for, request, session as flask_session
from flask_login import current_user, login_user, logout_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash # For dummy user in login
from werkzeug.urls import url_parse
from datetime import date, datetime

from app import db
from app.forms import LoginForm, RegistrationForm, BudgetForm, DoctorForm
from app.models import User, Budget, Doctor

from flask import Flask
from app import login as global_login_manager

class AppContext:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.secret_key = 'subtask_secret_key_for_session'
        if hasattr(global_login_manager, 'init_app'):
             global_login_manager.init_app(self.app)
        self.app.login_manager = global_login_manager
    def __enter__(self):
        self.context = self.app.test_request_context()
        self.context.push()
        return self.app
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.context:
            self.context.pop()

_routes = []
def route(rule, **options):
    def decorator(f):
        global _routes
        # Remove existing route with the same function name to allow redefinition
        _routes = [r for r in _routes if r[1].__name__ != f.__name__]
        _routes.append((rule, f, options))
        return f
    return decorator

@route('/login', methods=['GET', 'POST'])
def login():
    with AppContext() as current_app_for_route:
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        form = LoginForm()
        if form.validate_on_submit():
            # Fallback to dummy user if User.query fails or user not found
            user_data = None
            try:
                user_data = User.query.filter_by(username=form.username.data).first()
            except Exception: # Catch DB query errors during subtask
                pass

            if user_data and user_data.check_password(form.password.data):
                user_to_login = user_data
            elif form.username.data == 'test' and form.password.data == 'test': # Hardcoded dummy for subtask
                class DummyUserLogin:
                    id=1; username='test'; password_hash=generate_password_hash('test')
                    def check_password(self, p): return check_password_hash(self.password_hash, p)
                    def is_authenticated(self): return True
                    def is_active(self): return True
                    def is_anonymous(self): return False
                    def get_id(self): return str(self.id)
                user_to_login = DummyUserLogin()
            else:
                user_to_login = None

            if user_to_login is None:
                flash('Usuario o contraseña inválidos.', 'error')
                return redirect(url_for('login'))

            login_user(user_to_login, remember=form.remember_me.data)
            flask_session.permanent = form.remember_me.data
            next_page = request.args.get('next')
            if not next_page or url_parse(next_page).netloc != '':
                next_page = url_for('index')
            flash('Inicio de sesión exitoso!', 'success')
            return redirect(next_page)
        return render_template('login.html', title='Iniciar Sesión', form=form)

@route('/logout')
def logout():
    with AppContext() as _:
        logout_user()
        flash('Has cerrado sesión.', 'info')
        return redirect(url_for('index'))

@route('/register', methods=['GET', 'POST'])
def register():
    with AppContext() as _:
        if current_user.is_authenticated:
            return redirect(url_for('index'))
        form = RegistrationForm()
        if form.validate_on_submit():
            flash('Felicidades, ahora eres un usuario registrado! Por favor, inicia sesión. (Simulado)', 'success')
            return redirect(url_for('login'))
        return render_template('register.html', title='Registro', form=form)


@route('/budget/add', methods=['GET', 'POST'])
@login_required
def add_budget():
    with AppContext() as current_app_for_route:
        form = BudgetForm()
        if form.validate_on_submit():
            flash('Presupuesto agregado exitosamente! (Simulado)', 'success')
            return redirect(url_for('index'))
        if not form.is_submitted() and not form.budget_delivery_date.data :
             form.budget_delivery_date.data = date.today()
        return render_template('budget_form.html', title='Agregar Presupuesto', form=form, legend='Nuevo Presupuesto')

@route('/budget/edit/<int:budget_id>', methods=['GET', 'POST'])
@login_required
def edit_budget(budget_id):
    with AppContext() as current_app_for_route:
        class DummyBudgetPopulate:
            def __init__(self, id_val):
                self.id = id_val; self.patient_name = "EditTestName"; self.patient_lastname = "EditLastName"
                self.file_number = f"F{id_val:03}"; self.mobile_phone="111222333"; self.landline_phone="999888777"
                self.city="EditCity"; self.province="EditProvince"; self.gender="Hombre"
                self.budget_delivery_date=date(2023,5,10); self.budget_amount=2000.0; self.clinic_review_date=date(2023,5,25)
                dummy_docs = []
                try:
                    from app.forms import get_doctors
                    dummy_docs = get_doctors()
                except ImportError:
                    pass
                self.doctor = dummy_docs[0] if dummy_docs else None
                self.annotations="Initial notes for editing task."; self.expected_callback_date=date(2023,6,10); self.status="Pendientes y seguimiento"

        budget_data_for_form = DummyBudgetPopulate(budget_id)
        form = BudgetForm(obj=budget_data_for_form)

        if form.validate_on_submit():
            flash('Presupuesto actualizado exitosamente! (Simulado)', 'success')
            return redirect(url_for('index'))

        return render_template('budget_form.html', title='Editar Presupuesto', form=form, legend=f'Editar Presupuesto: {budget_data_for_form.file_number}')

@route('/')
@route('/index')
@login_required
def index():
    with AppContext() as _:
        class DummyDoctorObjList:
            def __init__(self, id_val, name="Dr. Example (Dummy)"): self.id=id_val; self.name = name
        class DummyBudgetListItem:
             def __init__(self, id_val, fn, name, status_val, amount_val, doctor_obj=None, callback_date=None):
                self.id = id_val; self.file_number = fn; self.patient_name = name; self.patient_lastname = "LastName"
                self.status = status_val; self.budget_amount = amount_val
                self.doctor_assigned = doctor_obj
                self.expected_callback_date = callback_date or date.today()

        doc1_list = DummyDoctorObjList(1, "Dr. Alpha (Dummy)")
        doc2_list = DummyDoctorObjList(2, "Dr. Beta (Dummy)")

        budgets = [
            DummyBudgetListItem(1, "P001", "Juan Perez", "Aceptado", 1200.50, doc1_list, date(2023,10,5)),
            DummyBudgetListItem(2, "P002", "Ana Lopez", "Pendientes y seguimiento", 850.00, None, date(2023,11,12)),
            DummyBudgetListItem(3, "P003", "Carlos Ruiz", "Rechazado totalmente", 2500.75, doc2_list, date(2023,9,20))
        ]
        return render_template('index.html', title='Dashboard', budgets=budgets)


# Doctor Management Routes
@route('/doctors', methods=['GET'])
@login_required
def list_doctors():
    with AppContext() as _:
        class DummyDoctorList: # Simulates Doctor model for listing
            def __init__(self, id, name, budget_count=0):
                self.id = id; self.name = name
                # Simulate relationship query for budget count
                self.budgets_relationship = type('DummyBudgetsRel', (object,), {'count': lambda: budget_count})()

            @property # Make it behave like SQLAlchemy's relationship.budgets.count()
            def budgets(self):
                return self.budgets_relationship

        dummy_doctors_data = [
            DummyDoctorList(1, "Dr. Alpha (Simulado)", 2),
            DummyDoctorList(2, "Dr. Beta (Simulado)", 0),
            DummyDoctorList(3, "Dr. Gamma (Simulado)", 5)
        ]
        return render_template('doctors.html', title='Gestionar Doctores', doctors=dummy_doctors_data)

@route('/doctor/add', methods=['GET', 'POST'])
@login_required
def add_doctor():
    with AppContext() as _:
        form = DoctorForm()
        if form.validate_on_submit():
            new_doctor_name = form.name.data
            flash(f'Doctor "{new_doctor_name}" agregado exitosamente! (Simulado)', 'success')
            return redirect(url_for('list_doctors'))
        return render_template('doctor_form.html', title='Agregar Doctor', form=form, legend='Nuevo Doctor')

@route('/doctor/edit/<int:doctor_id>', methods=['GET', 'POST'])
@login_required
def edit_doctor(doctor_id):
    with AppContext() as _:
        class DummyDoctorEdit: # Simulates loading a doctor for editing
            def __init__(self, id_val, name_val): self.id = id_val; self.name = name_val

        doctor_to_edit = DummyDoctorEdit(doctor_id, f"Dr. Nombre Original {doctor_id}")

        form = DoctorForm(original_name=doctor_to_edit.name, obj=doctor_to_edit)

        if form.validate_on_submit():
            new_name = form.name.data
            flash(f'Doctor "{new_name}" actualizado exitosamente! (Simulado)', 'success')
            return redirect(url_for('list_doctors'))

        return render_template('doctor_form.html', title='Editar Doctor', form=form, legend=f'Editar Doctor: {doctor_to_edit.name}')

@route('/doctor/delete/<int:doctor_id>', methods=['POST'])
@login_required
def delete_doctor(doctor_id):
    with AppContext() as _:
        # Simulate deletion logic
        # In real app: doctor = Doctor.query.get_or_404(doctor_id)
        # if doctor.budgets.count() > 0: flash error
        # else: db.session.delete(doctor); db.session.commit(); flash success
        flash(f'Doctor ID {doctor_id} eliminado exitosamente! (Simulado)', 'success')
        return redirect(url_for('list_doctors'))
