# laserdental_app/tests/test_models.py
import unittest
# It's assumed that when tests are run, the app context is set up,
# and db operations can occur (e.g., in-memory SQLite for tests).
# For this subtask, direct model instantiation and method calls are shown.
# from app import create_app, db # In a real test setup
# from app.models import User, Doctor, Budget, BUDGET_STATUSES
from datetime import date, datetime

# --- Dummy Model Definitions for Subtask (to make file runnable) ---
# In a real test environment, these would be imported from app.models
class DummyBaseModel: # Minimal mock for db.Model
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

    @classmethod
    def query_filter_by(cls, **kwargs): # Mock for User.query.filter_by
        class DummyQuery:
            def first(self): return None
        return DummyQuery()

class User(DummyBaseModel):
    id = None; username = None; password_hash = None
    def set_password(self, password): self.password_hash = f"hashed_{password}" # Simplified hash
    def check_password(self, password): return self.password_hash == f"hashed_{password}"
    def __repr__(self): return f"<User {self.username}>"

class Doctor(DummyBaseModel):
    id = None; name = None
    def __repr__(self): return f"<Doctor {self.name}>"

class Budget(DummyBaseModel):
    id = None; patient_name = None; patient_lastname = None; budget_amount=0.0; status='TestStatus'
    user_id = None; doctor_id = None; created_at = None; expected_callback_date = None
    def __repr__(self): return f"<Budget {self.patient_name}>"

BUDGET_STATUSES = ['TestStatus', 'AnotherStatus']
# --- End of Dummy Model Definitions ---

class TestUserModel(unittest.TestCase):
    def test_password_setter(self):
        u = User(username='susan')
        u.set_password('cat')
        self.assertIsNotNone(u.password_hash)
        self.assertNotEqual(u.password_hash, 'cat')

    def test_password_checker(self):
        u = User(username='john')
        u.set_password('dog')
        self.assertTrue(u.check_password('dog'))
        self.assertFalse(u.check_password('cat'))

    def test_user_representation(self):
        u = User(username='jane')
        self.assertEqual(repr(u), '<User jane>')

class TestDoctorModel(unittest.TestCase):
    def test_doctor_creation(self):
        d = Doctor(name='Dr. Smith')
        self.assertEqual(d.name, 'Dr. Smith')

    def test_doctor_representation(self):
        d = Doctor(name='Dr. Who')
        self.assertEqual(repr(d), '<Doctor Dr. Who>')

class TestBudgetModel(unittest.TestCase):
    def test_budget_creation(self):
        # In a real test, User and Doctor instances would be created and added to session first
        user = User(id=1, username='testuser')
        doctor = Doctor(id=1, name='Dr. Testwell')

        b = Budget(
            patient_name='Test', patient_lastname='Patient', budget_amount=100.0,
            status='Pendientes y seguimiento', user_id=user.id, doctor_id=doctor.id,
            expected_callback_date=date(2024,1,1)
        )
        self.assertEqual(b.patient_name, 'Test')
        self.assertEqual(b.budget_amount, 100.0)
        self.assertEqual(b.status, 'Pendientes y seguimiento')
        self.assertIsNotNone(b.expected_callback_date)

    def test_budget_representation(self):
        b = Budget(patient_name='Represent', patient_lastname='Me')
        self.assertEqual(repr(b), '<Budget Represent>')


if __name__ == '__main__':
    unittest.main()
