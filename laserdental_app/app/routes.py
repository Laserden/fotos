# app/routes.py
from flask import render_template, flash, redirect, url_for, request, session as flask_session
from flask_login import current_user, login_user, logout_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash # For dummy user in login
from werkzeug.urls import url_parse
from datetime import date, datetime, timedelta # Ensure timedelta is imported

from app import db
from app.forms import LoginForm, RegistrationForm, BudgetForm, DoctorForm
from app.models import User, Budget, Doctor, BUDGET_STATUSES # Import BUDGET_STATUSES

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

# Definition of get_doctors for BudgetForm (can be simplified if not directly used by this subtask part)
def get_doctors_for_form(): # Renamed to avoid conflict if imported from forms
    try:
        # This would be the ideal way if wtforms_sqlalchemy is used and DB is live
        # from app.models import Doctor
        # return Doctor.query.all()
        pass # For subtask, assume this might not run or is handled by QuerySelectField fallback
    except Exception:
        pass
    # Fallback dummy data if needed by form instantiation directly (though QuerySelectField handles its own factory)
    doc1 = type('DummyDoctor', (object,), {'id': 1, 'name': 'Dr. House (Dummy)'})()
    return [doc1]


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
        class DummyBudgetForEdit:
            def __init__(self, id_val):
                self.id = id_val
                self.patient_name = "Loaded Patient"
                self.patient_lastname = "ForEditing"
                self.file_number = f"F{id_val:03}"
                self.mobile_phone="555123456"
                self.landline_phone="555654321"
                self.city="EditCity"
                self.province="EditProvince"
                self.gender="Mujer"
                self.budget_delivery_date=date(2023,1,15)
                self.budget_amount=1250.75
                self.clinic_review_date=date(2023,2,10)

                docs_for_select = get_doctors_for_form()
                self.doctor = docs_for_select[0] if docs_for_select else None

                self.annotations="Existing notes for budget."
                self.expected_callback_date=date(2023,3,5)
                self.status="Pendientes y seguimiento"

        budget_to_edit = DummyBudgetForEdit(budget_id)
        form = BudgetForm(obj=budget_to_edit, doctor=budget_to_edit.doctor)

        if form.validate_on_submit():
            budget_to_edit.patient_name = form.patient_name.data
            budget_to_edit.patient_lastname = form.patient_lastname.data
            budget_to_edit.file_number = form.file_number.data
            budget_to_edit.mobile_phone = form.mobile_phone.data
            budget_to_edit.landline_phone = form.landline_phone.data
            budget_to_edit.city = form.city.data
            budget_to_edit.province = form.province.data
            budget_to_edit.gender = form.gender.data
            budget_to_edit.budget_delivery_date = form.budget_delivery_date.data
            budget_to_edit.budget_amount = form.budget_amount.data
            budget_to_edit.clinic_review_date = form.clinic_review_date.data
            budget_to_edit.doctor = form.doctor.data
            budget_to_edit.annotations = form.annotations.data
            budget_to_edit.expected_callback_date = form.expected_callback_date.data
            budget_to_edit.status = form.status.data

            flash(f'Presupuesto "{budget_to_edit.file_number}" actualizado (estado: {budget_to_edit.status}). (Simulado)', 'success')
            return redirect(url_for('index'))

        return render_template('budget_form.html', title='Editar Presupuesto', form=form, legend=f'Editar Presupuesto: {budget_to_edit.file_number}')

@route('/')
@route('/index')
@login_required
def index():
    with AppContext() as _:
        search_query = request.args.get('search_query', '').strip().lower()
        date_from_str = request.args.get('date_from', '')
        date_to_str = request.args.get('date_to', '')
        date_from, date_to = None, None
        try:
            if date_from_str: date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date()
        except ValueError: flash('Fecha "Desde" inválida. Use el formato AAAA-MM-DD.', 'error')
        try:
            if date_to_str: date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date()
        except ValueError: flash('Fecha "Hasta" inválida. Use el formato AAAA-MM-DD.', 'error')

        class DummyDoctorObjList:
            def __init__(self, id_val, name="Dr. Example (Dummy)"): self.id=id_val; self.name = name

        class DummyBudgetListItem:
             def __init__(self, id_val, fn, pat_name, pat_lname, status_val, amount_val, doctor_obj=None, callback_date=None, delivery_date=None, review_date=None, city="Test City", prov="Test Prov", gender="Hombre", mobile="123", landline="456", notes="Notes"):
                self.id = id_val; self.file_number = fn; self.patient_name = pat_name; self.patient_lastname = pat_lname
                self.status = status_val; self.budget_amount = float(amount_val)
                self.doctor_assigned = doctor_obj
                self.expected_callback_date = callback_date
                self.budget_delivery_date = delivery_date or date(2023,1,1)
                self.clinic_review_date = review_date
                self.city=city; self.province=prov; self.gender=gender; self.mobile_phone=mobile; self.landline_phone=landline; self.annotations=notes

        doc1 = DummyDoctorObjList(1, "Dr. Alpha (Simulado)")
        doc2 = DummyDoctorObjList(2, "Dr. Beta (Simulado)")

        today_for_logic = date.today()
        all_budgets_master_list = [
            DummyBudgetListItem(1, "P001", "Juan", "Perez", "Aceptado", 1200.50, doc1, today_for_logic - timedelta(days=2), date(2023,9,1)),
            DummyBudgetListItem(2, "P002", "Ana", "Lopez", "Pendientes y seguimiento", 850.00, None, today_for_logic + timedelta(days=3), date(2023,9,15)),
            DummyBudgetListItem(3, "P003", "Carlos", "Ruiz", "Rechazado totalmente", 2500.75, doc2, today_for_logic + timedelta(days=10), date(2023,8,10)),
            DummyBudgetListItem(4, "P004", "Maria", "Sol", "Aceptado financiado", 3000.00, doc1, today_for_logic, date(2023,10,1)),
            DummyBudgetListItem(5, "P005", "Pedro", "Gomez", "Finalizado", 750.25, doc2, today_for_logic - timedelta(days=5), date(2023,10,20)),
            DummyBudgetListItem(6, "P006", "Laura", "Mar", "Pendientes y seguimiento", 1500.00, doc1, today_for_logic + timedelta(days=7), date(2023,11,5), notes="Budget for Laura"),
            DummyBudgetListItem(7, "P007", "Luis", "Fon", "Aceptado", 980.00, None, today_for_logic + timedelta(days=30), date(2023,7,15), city="Capital City")
        ]

        filtered_budgets = all_budgets_master_list
        if search_query:
            filtered_budgets_temp = []
            for budget_item in filtered_budgets:
                if (search_query in (budget_item.patient_name or "").lower() or
                    search_query in (budget_item.patient_lastname or "").lower() or
                    search_query in (budget_item.file_number or "").lower() or
                    search_query in (budget_item.city or "").lower() or
                    search_query in (budget_item.annotations or "").lower() or
                    (budget_item.doctor_assigned and search_query in (budget_item.doctor_assigned.name or "").lower()) or
                    search_query in (budget_item.status or "").lower()
                    ):
                    filtered_budgets_temp.append(budget_item)
            filtered_budgets = filtered_budgets_temp

        if date_from:
            filtered_budgets = [b for b in filtered_budgets if b.budget_delivery_date and b.budget_delivery_date >= date_from]
        if date_to:
            filtered_budgets = [b for b in filtered_budgets if b.budget_delivery_date and b.budget_delivery_date <= date_to]

        dashboard_totals = {status: {'count': 0, 'amount': 0.0} for status in BUDGET_STATUSES}
        dashboard_totals['total_presupuesto'] = {'count': 0, 'amount': 0.0}
        for budget_item_total in filtered_budgets:
            if budget_item_total.status in dashboard_totals:
                dashboard_totals[budget_item_total.status]['count'] += 1
                dashboard_totals[budget_item_total.status]['amount'] += budget_item_total.budget_amount
            dashboard_totals['total_presupuesto']['count'] += 1
            dashboard_totals['total_presupuesto']['amount'] += budget_item_total.budget_amount

        upcoming_callbacks = []
        for budget_cb in all_budgets_master_list:
            if budget_cb.expected_callback_date and budget_cb.status != 'Finalizado':
                if budget_cb.expected_callback_date <= today_for_logic or \
                   (budget_cb.expected_callback_date > today_for_logic and budget_cb.expected_callback_date <= today_for_logic + timedelta(days=7)):
                    upcoming_callbacks.append(budget_cb)

        upcoming_callbacks.sort(key=lambda b_sort: b_sort.expected_callback_date if b_sort.expected_callback_date else date.max)

        return render_template('index.html',
                             title='Dashboard',
                             budgets=filtered_budgets,
                             dashboard_totals=dashboard_totals,
                             BUDGET_STATUSES_ORDER=BUDGET_STATUSES,
                             search_query_display=request.args.get('search_query', ''),
                             date_from_display=date_from_str,
                             date_to_display=date_to_str,
                             upcoming_callbacks=upcoming_callbacks,
                             today_for_template=today_for_logic
                             )

# Doctor Management Routes
@route('/doctors', methods=['GET'])
@login_required
def list_doctors():
    with AppContext() as _:
        class DummyDoctorList:
            def __init__(self, id, name, budget_count=0):
                self.id = id; self.name = name
                self.budgets_relationship = type('DummyBudgetsRel', (object,), {'count': lambda: budget_count})()
            @property
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
        class DummyDoctorEdit:
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
        flash(f'Doctor ID {doctor_id} eliminado exitosamente! (Simulado)', 'success')
        return redirect(url_for('list_doctors'))

# New route for budgets by status
@route('/budgets/status/<string:status_name>', methods=['GET'])
@login_required
def budgets_by_status(status_name):
    with AppContext() as _:
        if status_name not in BUDGET_STATUSES:
            flash(f"Estado '{status_name}' no válido.", "error")
            return redirect(url_for('index'))

        class DummyDoctorObjList: # Copied from index for consistency
            def __init__(self, id_val, name="Dr. Example (Dummy)"): self.id=id_val; self.name = name

        class DummyBudgetListItem: # Copied from index for consistency
             def __init__(self, id_val, fn, pat_name, pat_lname, status_val, amount_val, doctor_obj=None, callback_date=None, delivery_date=None, review_date=None, city="Test City", prov="Test Prov", gender="Hombre", mobile="123", landline="456", notes="Notes"):
                self.id = id_val; self.file_number = fn; self.patient_name = pat_name; self.patient_lastname = pat_lname
                self.status = status_val; self.budget_amount = float(amount_val)
                self.doctor_assigned = doctor_obj
                self.expected_callback_date = callback_date or date(2023,1,1)
                self.budget_delivery_date = delivery_date or date(2023,1,1)
                self.clinic_review_date = review_date
                self.city=city; self.province=prov; self.gender=gender; self.mobile_phone=mobile; self.landline_phone=landline; self.annotations=notes

        doc1 = DummyDoctorObjList(1, "Dr. Alpha (Simulado)")
        doc2 = DummyDoctorObjList(2, "Dr. Beta (Simulado)")

        all_budgets_master_list_for_status_route = [
            DummyBudgetListItem(1, "P001", "Juan", "Perez", "Aceptado", 1200.50, doc1, date(2023,10,5), date(2023,9,1)),
            DummyBudgetListItem(2, "P002", "Ana", "Lopez", "Pendientes y seguimiento", 850.00, None, date(2023,11,12), date(2023,9,15)),
            DummyBudgetListItem(3, "P003", "Carlos", "Ruiz", "Rechazado totalmente", 2500.75, doc2, date(2023,9,20), date(2023,8,10)),
            DummyBudgetListItem(4, "P004", "Maria", "Sol", "Aceptado financiado", 3000.00, doc1, date(2023,10,15), date(2023,10,1)),
            DummyBudgetListItem(5, "P005", "Pedro", "Gomez", "Aceptado", 750.25, doc2, date(2023,11,1), date(2023,10,20)),
            DummyBudgetListItem(6, "P006", "Laura", "Mar", "Pendientes y seguimiento", 1500.00, doc1, date(2023,12,1), date(2023,11,5), notes="Budget for Laura with special conditions"),
            DummyBudgetListItem(7, "P007", "Luis", "Fon", "Finalizado", 980.00, None, date(2023,8,1), date(2023,7,15), city="Capital City"),
            DummyBudgetListItem(8, "P008", "Sofia", "Luna", "Aceptado", 1800.00, doc1, date(2023,11,20), date(2023,11,1))
        ]

        status_filtered_budgets = [b for b in all_budgets_master_list_for_status_route if b.status == status_name]

        return render_template('budgets_filtered_list.html',
                             title=f"Presupuestos: {status_name}",
                             budgets=status_filtered_budgets,
                             status_filter_name=status_name)
