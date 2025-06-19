# app/__init__.py
from flask import Flask
from config import Config
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
import os

db = SQLAlchemy()
migrate = Migrate()
login = LoginManager()
login.login_view = 'login'
login.login_message = 'Por favor, inicie sesión para acceder a esta página.'
login.login_message_category = 'info'

def create_app(config_class=Config):
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    instance_folder_path = os.path.join(project_root, 'instance')

    app = Flask(__name__, instance_path=instance_folder_path)

    if not os.path.exists(app.instance_path):
        try:
            os.makedirs(app.instance_path)
        except OSError as e:
            app.logger.error(f"Error creating instance folder: {e}")

    app.config.from_object(config_class)

    if 'sqlite:///' in app.config['SQLALCHEMY_DATABASE_URI'] and not app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:////'):
        db_name = app.config['SQLALCHEMY_DATABASE_URI'].split('sqlite:///')[1]
        if db_name.startswith('instance' + os.path.sep):
            db_name = db_name.split('instance' + os.path.sep, 1)[1]
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(app.instance_path, db_name)

    db.init_app(app)
    migrate.init_app(app, db)
    login.init_app(app)

    from app import models

    from app.routes import _routes as routes_to_register

    with app.app_context():
        for rule, view_func, options in routes_to_register:
            app.add_url_rule(rule, view_func=view_func, **options)

    return app
