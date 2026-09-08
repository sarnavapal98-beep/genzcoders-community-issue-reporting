import os
import sqlite3
import uuid
import tempfile
from functools import wraps

from flask import (
    Flask,
    request,
    jsonify,
    session,
    send_from_directory
)

from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from db import get_db_connection, setup_database


# =========================================================
# ML IMPORT
# =========================================================

# Load the ML model lazily. Loading torch/EfficientNet during web-server
# startup can make a small hosted instance fail before the site is available.
predictor = None
ML_AVAILABLE = None


def get_ml_predictor():
    global predictor, ML_AVAILABLE

    if predictor is not None:
        return predictor

    if ML_AVAILABLE is False:
        return None

    try:
        from ml.predictor import predictor as loaded_predictor
        predictor = loaded_predictor
        ML_AVAILABLE = True
        return predictor
    except Exception as error:
        ML_AVAILABLE = False
        print("ML predictor could not be loaded:")
        print("Error type:", type(error).__name__)
        print("Error:", repr(error))
        return None


# =========================================================
# APP CONFIGURATION
# =========================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# React production build
FRONTEND_DIST = os.path.abspath(
    os.path.join(BASE_DIR, "..", "frontend", "dist")
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)

ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png"
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY",
    "community-reports-development-secret"
)

app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

if os.environ.get("RENDER"):
    app.config["SESSION_COOKIE_SECURE"] = True


# =========================================================
# CORS
# =========================================================

CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]
)

# =========================================================
# DATABASE INITIALIZATION
# =========================================================

try:

    setup_database()

except Exception as error:

    print("Database initialization failed:")
    print("Error:", repr(error))


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def allowed_file(filename):
    """
    Check whether uploaded file has an allowed extension.
    """

    if not filename:
        return False

    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def get_current_user():
    """
    Return currently logged-in user from database.
    """

    citizen_id = session.get("CitizenID")

    if not citizen_id:
        return None

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                CitizenID,
                name,
                email,
                contact_info,
                role,
                created_at
            FROM citizens
            WHERE CitizenID = ?
            """,
            (citizen_id,)
        )

        user = cursor.fetchone()

        if not user:
            return None

        return dict(user)

    finally:

        connection.close()


def login_required(function):
    """
    Require authenticated user.
    """

    @wraps(function)
    def decorated_function(*args, **kwargs):

        user = get_current_user()

        if not user:

            return jsonify({
                "success": False,
                "message": "Authentication required."
            }), 401

        return function(*args, **kwargs)

    return decorated_function


def staff_required(function):
    """
    Require staff or admin account.
    """

    @wraps(function)
    def decorated_function(*args, **kwargs):

        user = get_current_user()

        if not user:

            return jsonify({
                "success": False,
                "message": "Authentication required."
            }), 401

        if user["role"] not in (
            "staff",
            "admin"
        ):

            return jsonify({
                "success": False,
                "message": "Staff access required."
            }), 403

        return function(*args, **kwargs)

    return decorated_function


def get_category_by_name(category_name):
    """
    Find a category by name.
    """

    if not category_name:
        return None

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                c.CategoryID,
                c.name,
                c.DepartmentID,
                d.name AS department_name
            FROM categories c
            JOIN departments d
                ON c.DepartmentID = d.DepartmentID
            WHERE LOWER(c.name) = LOWER(?)
            """,
            (category_name.strip(),)
        )

        category = cursor.fetchone()

        if category:
            return dict(category)

        return None

    finally:

        connection.close()


def save_uploaded_image(file):
    """
    Save uploaded image with a unique filename.
    """

    if not file or not file.filename:
        return None

    if not allowed_file(file.filename):

        raise ValueError(
            "Only JPG, JPEG and PNG images are allowed."
        )

    extension = file.filename.rsplit(
        ".",
        1
    )[1].lower()

    unique_filename = (
        f"{uuid.uuid4().hex}.{extension}"
    )

    filename = secure_filename(
        unique_filename
    )

    file_path = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    file.save(file_path)

    return filename


def report_to_dict(row):
    """
    Convert database row into dictionary.
    """

    return dict(row)


# =========================================================
# BASIC ROUTES
# =========================================================

@app.route("/", methods=["GET"])
def home():

    index_path = os.path.join(
        FRONTEND_DIST,
        "index.html"
    )

    if not os.path.exists(index_path):
        return jsonify({
            "success": False,
            "message": (
                "Frontend build not found. "
                "Run npm run build in the frontend directory."
            )
        }), 500

    return send_from_directory(
        FRONTEND_DIST,
        "index.html"
    )


@app.route("/api/health", methods=["GET"])
def health():

    return jsonify({
        "success": True,
        "status": "healthy",
        "message": "Backend is running.",
        "ml_available": ML_AVAILABLE if ML_AVAILABLE is not None else "not_loaded"
    })


# =========================================================
# AUTHENTICATION
# =========================================================

@app.route("/api/auth/register", methods=["POST"])
def register():

    data = request.get_json(
        silent=True
    ) or {}

    name = str(
        data.get("name", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    contact_info = str(
        data.get("contact_info", "")
    ).strip()

    password = str(
        data.get("password", "")
    )

    if not name:

        return jsonify({
            "success": False,
            "message": "Name is required."
        }), 400

    if not email:

        return jsonify({
            "success": False,
            "message": "Email is required."
        }), 400

    if not password:

        return jsonify({
            "success": False,
            "message": "Password is required."
        }), 400

    if len(password) < 6:

        return jsonify({
            "success": False,
            "message": (
                "Password must contain at least 6 characters."
            )
        }), 400

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT CitizenID
            FROM citizens
            WHERE email = ?
            """,
            (email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:

            return jsonify({
                "success": False,
                "message": (
                    "An account with this email already exists."
                )
            }), 409

        password_hash = generate_password_hash(
            password
        )

        cursor.execute(
            """
            INSERT INTO citizens
            (
                name,
                contact_info,
                email,
                password_hash,
                role
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                name,
                contact_info,
                email,
                password_hash,
                "citizen"
            )
        )

        connection.commit()

        citizen_id = cursor.lastrowid

        session["CitizenID"] = citizen_id

        return jsonify({

            "success": True,

            "message":
                "Registration successful.",

            "user": {

                "CitizenID":
                    citizen_id,

                "name":
                    name,

                "email":
                    email,

                "contact_info":
                    contact_info,

                "role":
                    "citizen"
            }

        }), 201

    except sqlite3.IntegrityError:

        connection.rollback()

        return jsonify({
            "success": False,
            "message": (
                "Unable to create account. "
                "Email may already exist."
            )
        }), 409

    finally:

        connection.close()


@app.route("/api/auth/login", methods=["POST"])
def login():

    data = request.get_json(
        silent=True
    ) or {}

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )

    if not email or not password:

        return jsonify({
            "success": False,
            "message": (
                "Email and password are required."
            )
        }), 400

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                CitizenID,
                name,
                email,
                contact_info,
                password_hash,
                role,
                created_at
            FROM citizens
            WHERE email = ?
            """,
            (email,)
        )

        user = cursor.fetchone()

        if not user:

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        if not check_password_hash(
            user["password_hash"],
            password
        ):

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401

        session["CitizenID"] = user["CitizenID"]

        return jsonify({

            "success": True,

            "message":
                "Login successful.",

            "user": {

                "CitizenID":
                    user["CitizenID"],

                "name":
                    user["name"],

                "email":
                    user["email"],

                "contact_info":
                    user["contact_info"],

                "role":
                    user["role"],

                "created_at":
                    user["created_at"]
            }

        })

    finally:

        connection.close()


@app.route("/api/auth/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })


@app.route("/api/auth/me", methods=["GET"])
def current_user():

    user = get_current_user()

    if not user:

        return jsonify({
            "success": False,
            "user": None,
            "message": "Not authenticated."
        }), 401

    return jsonify({
        "success": True,
        "user": user
    })


# =========================================================
# DEPARTMENTS
# =========================================================

@app.route("/api/departments", methods=["GET"])
def get_departments():

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                DepartmentID,
                name,
                contact
            FROM departments
            ORDER BY name
            """
        )

        departments = [
            dict(row)
            for row in cursor.fetchall()
        ]

        return jsonify({
            "success": True,
            "departments": departments
        })

    finally:

        connection.close()


# =========================================================
# CATEGORIES
# =========================================================

@app.route("/api/categories", methods=["GET"])
def get_categories():

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                c.CategoryID,
                c.name,
                c.DepartmentID,
                d.name AS department_name
            FROM categories c
            JOIN departments d
                ON c.DepartmentID = d.DepartmentID
            ORDER BY c.name
            """
        )

        categories = [
            dict(row)
            for row in cursor.fetchall()
        ]

        return jsonify({
            "success": True,
            "categories": categories
        })

    finally:

        connection.close()


# =========================================================
# ML IMAGE PREDICTION
# =========================================================

@app.route(
    "/api/ml/predict",
    methods=["POST"]
)
def ml_predict():

    # -----------------------------------------------------
    # CHECK ML MODEL
    # -----------------------------------------------------

    ml_predictor = get_ml_predictor()

    if ml_predictor is None:
        return jsonify({
            "success": False,
            "message": (
                "ML predictor is not available. "
                "Check backend/ml/predictor.py and model files."
            )
        }), 503

    # -----------------------------------------------------
    # CHECK IMAGE
    # -----------------------------------------------------

    if "image" not in request.files:

        return jsonify({
            "success": False,
            "message": "No image uploaded."
        }), 400

    image = request.files["image"]

    if not image or not image.filename:

        return jsonify({
            "success": False,
            "message": "No image selected."
        }), 400

    # -----------------------------------------------------
    # CHECK EXTENSION
    # -----------------------------------------------------

    if not allowed_file(image.filename):

        return jsonify({

            "success": False,

            "message": (
                "Only JPG, JPEG and PNG images are allowed."
            )

        }), 400

    extension = image.filename.rsplit(
        ".",
        1
    )[1].lower()

    temp_path = None

    try:

        # -------------------------------------------------
        # CREATE TEMPORARY IMAGE
        # -------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=f".{extension}"
        ) as temp_file:

            temp_path = temp_file.name

            image.save(temp_path)

        # -------------------------------------------------
        # RUN MODEL
        # -------------------------------------------------

        predictions = ml_predictor.predict(
            temp_path,
            top_k=3
        )

        if not predictions:

            return jsonify({

                "success": False,

                "message": (
                    "The model could not make a prediction."
                )

            }), 500

        # -------------------------------------------------
        # BEST PREDICTION
        # -------------------------------------------------

        best_prediction = predictions[0]

        # Safety check in case predictor returns
        # an unexpected format.

        if not isinstance(
            best_prediction,
            dict
        ):

            raise TypeError(
                "Predictor returned an invalid prediction format."
            )

        predicted_class = best_prediction.get(
            "class"
        )

        confidence = float(
            best_prediction.get(
                "confidence",
                0
            )
        )

        if not predicted_class:

            return jsonify({

                "success": False,

                "message": (
                    "The ML predictor returned "
                    "an invalid result."
                )

            }), 500

        # -------------------------------------------------
        # NORMALIZE CONFIDENCE
        # -------------------------------------------------

        if confidence > 1:

            confidence = (
                confidence / 100.0
            )

        confidence = max(
            0.0,
            min(
                1.0,
                confidence
            )
        )

        # -------------------------------------------------
        # LOW CONFIDENCE HANDLING
        # -------------------------------------------------

        requires_confirmation = (
            confidence < 0.60
        )

        # -------------------------------------------------
        # RETURN RESULT
        # -------------------------------------------------

        return jsonify({

            "success":
                True,

            "suggested_category":
                predicted_class,

            "confidence":
                round(
                    confidence,
                    4
                ),

            "confidence_percentage":
                round(
                    confidence * 100,
                    2
                ),

            "requires_confirmation":
                requires_confirmation,

            "predictions":
                predictions

        }), 200

    # =====================================================
    # MODEL FILE ERROR
    # =====================================================

    except FileNotFoundError as error:

        print()
        print("========== ML FILE ERROR ==========")
        print(
            "Error type:",
            type(error).__name__
        )
        print(
            "Error:",
            repr(error)
        )
        print("====================================")
        print()

        return jsonify({

            "success":
                False,

            "message":
                "ML model files could not be found.",

            "error":
                str(error)

        }), 500

    # =====================================================
    # DETAILED ML ERROR
    # =====================================================

    except Exception as error:

        import traceback

        print()
        print(
            "========== ML PREDICTION ERROR =========="
        )
        print(
            "Error type:",
            type(error).__name__
        )
        print(
            "Error:",
            repr(error)
        )

        traceback.print_exc()

        print(
            "=========================================="
        )
        print()

        return jsonify({

            "success":
                False,

            "message":
                "ML prediction failed.",

            "error_type":
                type(error).__name__,

            "error":
                repr(error)

        }), 500

    # =====================================================
    # DELETE TEMPORARY IMAGE
    # =====================================================

    finally:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            try:

                os.remove(
                    temp_path
                )

            except OSError:
                pass


# =========================================================
# CREATE REPORT
# =========================================================

@app.route(
    "/api/reports",
    methods=["POST"]
)
@login_required
def create_report():

    user = get_current_user()

    description = str(
        request.form.get(
            "description",
            ""
        )
    ).strip()

    category_name = str(
        request.form.get(
            "category",
            ""
        )
    ).strip()

    latitude_value = request.form.get(
        "latitude"
    )

    longitude_value = request.form.get(
        "longitude"
    )

    image = request.files.get(
        "image"
    )

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not description:

        return jsonify({
            "success": False,
            "message": "Description is required."
        }), 400

    if not category_name:

        return jsonify({
            "success": False,
            "message": "Category is required."
        }), 400

    category = get_category_by_name(
        category_name
    )

    if not category:

        return jsonify({

            "success": False,

            "message": (
                f"Unknown category: {category_name}"
            )

        }), 400

    # -----------------------------------------------------
    # LOCATION
    # -----------------------------------------------------

    latitude = None
    longitude = None

    try:

        if latitude_value not in (
            None,
            "",
            "null"
        ):

            latitude = float(
                latitude_value
            )

        if longitude_value not in (
            None,
            "",
            "null"
        ):

            longitude = float(
                longitude_value
            )

    except ValueError:

        return jsonify({

            "success": False,

            "message": (
                "Invalid latitude or longitude."
            )

        }), 400

    # -----------------------------------------------------
    # SAVE IMAGE
    # -----------------------------------------------------

    image_filename = None

    try:

        if image and image.filename:

            image_filename = (
                save_uploaded_image(image)
            )

    except ValueError as error:

        return jsonify({

            "success": False,

            "message":
                str(error)

        }), 400

    # -----------------------------------------------------
    # DATABASE
    # -----------------------------------------------------

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        location_id = None

        if (
            latitude is not None
            or longitude is not None
        ):

            map_link = None

            if (
                latitude is not None
                and longitude is not None
            ):

                map_link = (
                    "https://www.google.com/maps?q="
                    f"{latitude},{longitude}"
                )

            cursor.execute(
                """
                INSERT INTO locations
                (
                    latitude,
                    longitude,
                    map_link
                )
                VALUES (?, ?, ?)
                """,
                (
                    latitude,
                    longitude,
                    map_link
                )
            )

            location_id = (
                cursor.lastrowid
            )

        photo_url = None

        if image_filename:

            photo_url = (
                f"/uploads/{image_filename}"
            )

        cursor.execute(
            """
            INSERT INTO reports
            (
                photo_url,
                description,
                status,
                CitizenID,
                CategoryID,
                LocationID
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                photo_url,
                description,
                "Reported",
                user["CitizenID"],
                category["CategoryID"],
                location_id
            )
        )

        connection.commit()

        report_id = (
            cursor.lastrowid
        )

        return jsonify({

            "success":
                True,

            "message":
                "Report submitted successfully.",

            "report": {

                "ReportID":
                    report_id,

                "description":
                    description,

                "status":
                    "Reported",

                "category":
                    category["name"],

                "department":
                    category["department_name"],

                "photo_url":
                    photo_url,

                "latitude":
                    latitude,

                "longitude":
                    longitude
            }

        }), 201

    except Exception as error:

        connection.rollback()

        if image_filename:

            image_path = os.path.join(
                UPLOAD_FOLDER,
                image_filename
            )

            if os.path.exists(
                image_path
            ):

                os.remove(
                    image_path
                )

        print(
            "Report creation error:",
            repr(error)
        )

        return jsonify({

            "success":
                False,

            "message":
                "Unable to create report."

        }), 500

    finally:

        connection.close()


# =========================================================
# GET MY REPORTS
# =========================================================

@app.route(
    "/api/me/reports",
    methods=["GET"]
)
@login_required
def get_my_reports():

    user = get_current_user()

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                r.ReportID,
                r.photo_url,
                r.description,
                r.status,
                r.date_submitted,

                c.CategoryID,
                c.name AS category,

                d.DepartmentID,
                d.name AS department,

                l.LocationID,
                l.latitude,
                l.longitude,
                l.map_link,
                l.address,

                s.StaffID,
                s.name AS staff_name

            FROM reports r

            JOIN categories c
                ON r.CategoryID = c.CategoryID

            JOIN departments d
                ON c.DepartmentID = d.DepartmentID

            LEFT JOIN locations l
                ON r.LocationID = l.LocationID

            LEFT JOIN staff s
                ON r.StaffID = s.StaffID

            WHERE r.CitizenID = ?

            ORDER BY
                r.date_submitted DESC
            """,
            (
                user["CitizenID"],
            )
        )

        reports = [
            report_to_dict(row)
            for row in cursor.fetchall()
        ]

        return jsonify({

            "success":
                True,

            "reports":
                reports

        })

    finally:

        connection.close()


# =========================================================
# GET ALL REPORTS
# =========================================================

@app.route(
    "/api/reports",
    methods=["GET"]
)
@staff_required
def get_reports():

    area = request.args.get(
        "area",
        ""
    ).strip()

    category = request.args.get(
        "category",
        ""
    ).strip()

    status = request.args.get(
        "status",
        ""
    ).strip()

    department_id = request.args.get(
        "department_id",
        ""
    ).strip()

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        query = """
            SELECT
                r.ReportID,
                r.photo_url,
                r.description,
                r.status,
                r.date_submitted,

                citizen.CitizenID,
                citizen.name AS citizen_name,
                citizen.email AS citizen_email,

                c.CategoryID,
                c.name AS category,

                d.DepartmentID,
                d.name AS department,

                l.LocationID,
                l.latitude,
                l.longitude,
                l.map_link,
                l.address,

                s.StaffID,
                s.name AS staff_name

            FROM reports r

            JOIN citizens citizen
                ON r.CitizenID =
                   citizen.CitizenID

            JOIN categories c
                ON r.CategoryID =
                   c.CategoryID

            JOIN departments d
                ON c.DepartmentID =
                   d.DepartmentID

            LEFT JOIN locations l
                ON r.LocationID =
                   l.LocationID

            LEFT JOIN staff s
                ON r.StaffID =
                   s.StaffID

            WHERE 1 = 1
        """

        parameters = []

        # -------------------------------------------------
        # AREA FILTER
        # -------------------------------------------------

        if area:

            query += """
                AND LOWER(
                    COALESCE(l.address, '')
                )
                LIKE LOWER(?)
            """

            parameters.append(
                f"%{area}%"
            )

        # -------------------------------------------------
        # CATEGORY FILTER
        # -------------------------------------------------

        if category:

            query += """
                AND LOWER(c.name) =
                    LOWER(?)
            """

            parameters.append(
                category
            )

        # -------------------------------------------------
        # STATUS FILTER
        # -------------------------------------------------

        if status:

            query += """
                AND r.status = ?
            """

            parameters.append(
                status
            )

        # -------------------------------------------------
        # DEPARTMENT FILTER
        # -------------------------------------------------

        if department_id:

            try:

                department_id_int = int(
                    department_id
                )

                query += """
                    AND d.DepartmentID = ?
                """

                parameters.append(
                    department_id_int
                )

            except ValueError:

                pass

        query += """
            ORDER BY
                r.date_submitted DESC
        """

        cursor.execute(
            query,
            parameters
        )

        reports = [
            report_to_dict(row)
            for row in cursor.fetchall()
        ]

        return jsonify({

            "success":
                True,

            "reports":
                reports,

            "count":
                len(reports)

        })

    finally:

        connection.close()


# =========================================================
# GET DEPARTMENT REPORTS
# =========================================================

@app.route(
    "/api/departments/<int:department_id>/reports",
    methods=["GET"]
)
@staff_required
def get_department_reports(
    department_id
):

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                r.ReportID,
                r.photo_url,
                r.description,
                r.status,
                r.date_submitted,

                citizen.CitizenID,
                citizen.name AS citizen_name,
                citizen.email AS citizen_email,

                c.CategoryID,
                c.name AS category,

                d.DepartmentID,
                d.name AS department,

                l.LocationID,
                l.latitude,
                l.longitude,
                l.map_link,
                l.address,

                s.StaffID,
                s.name AS staff_name

            FROM reports r

            JOIN citizens citizen
                ON r.CitizenID =
                   citizen.CitizenID

            JOIN categories c
                ON r.CategoryID =
                   c.CategoryID

            JOIN departments d
                ON c.DepartmentID =
                   d.DepartmentID

            LEFT JOIN locations l
                ON r.LocationID =
                   l.LocationID

            LEFT JOIN staff s
                ON r.StaffID =
                   s.StaffID

            WHERE d.DepartmentID = ?

            ORDER BY
                r.date_submitted DESC
            """,
            (
                department_id,
            )
        )

        reports = [
            report_to_dict(row)
            for row in cursor.fetchall()
        ]

        return jsonify({

            "success":
                True,

            "reports":
                reports

        })

    finally:

        connection.close()


# =========================================================
# UPDATE REPORT STATUS
# =========================================================

@app.route(
    "/api/reports/<int:report_id>",
    methods=["PATCH"]
)
@staff_required
def update_report(report_id):

    data = request.get_json(
        silent=True
    ) or {}

    status = str(
        data.get(
            "status",
            ""
        )
    ).strip()

    valid_statuses = {
        "Reported",
        "Acknowledged",
        "In Progress",
        "Resolved"
    }

    if status not in valid_statuses:

        return jsonify({

            "success":
                False,

            "message": (
                "Invalid status. "
                "Use Reported, Acknowledged, "
                "In Progress or Resolved."
            )

        }), 400

    connection = get_db_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT ReportID
            FROM reports
            WHERE ReportID = ?
            """,
            (
                report_id,
            )
        )

        report = cursor.fetchone()

        if not report:

            return jsonify({

                "success":
                    False,

                "message":
                    "Report not found."

            }), 404

        cursor.execute(
            """
            UPDATE reports
            SET status = ?
            WHERE ReportID = ?
            """,
            (
                status,
                report_id
            )
        )

        connection.commit()

        return jsonify({

            "success":
                True,

            "message":
                "Report status updated successfully.",

            "report": {

                "ReportID":
                    report_id,

                "status":
                    status
            }

        })

    finally:

        connection.close()


# =========================================================
# SERVE UPLOADED IMAGES
# =========================================================

@app.route(
    "/uploads/<path:filename>",
    methods=["GET"]
)
def uploaded_file(filename):

    return send_from_directory(
        UPLOAD_FOLDER,
        filename
    )
# =========================================================
# SERVE REACT FRONTEND
# =========================================================

@app.route(
    "/<path:path>",
    methods=["GET"]
)
def serve_frontend(path):

    # Do not allow unknown API URLs to be handled
    # by the React frontend.
    if path.startswith("api/"):
        return jsonify({
            "success": False,
            "message": "API endpoint not found."
        }), 404

    requested_file = os.path.join(
        FRONTEND_DIST,
        path
    )

    # Serve actual frontend files such as
    # JavaScript, CSS, images, etc.
    if os.path.isfile(requested_file):
        return send_from_directory(
            FRONTEND_DIST,
            path
        )

    # React client-side routing
    index_path = os.path.join(
        FRONTEND_DIST,
        "index.html"
    )

    if os.path.exists(index_path):
        return send_from_directory(
            FRONTEND_DIST,
            "index.html"
        )

    return jsonify({
        "success": False,
        "message": "Frontend build not found."
    }), 500


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(413)
def file_too_large(error):

    return jsonify({

        "success":
            False,

        "message": (
            "Image is too large. "
            "Maximum size is 5 MB."
        )

    }), 413


@app.errorhandler(404)
def not_found(error):

    return jsonify({

        "success":
            False,

        "message":
            "API endpoint not found."

    }), 404


@app.errorhandler(500)
def internal_error(error):

    return jsonify({

        "success":
            False,

        "message":
            "Internal server error."

    }), 500


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":

    print()
    print("========================================")
    print(" COMMUNITY ISSUE REPORTING API")
    print("========================================")
    print("Database: SQLite")
    print("Uploads:", UPLOAD_FOLDER)
    print("ML Available:", ML_AVAILABLE)
    print("API: http://127.0.0.1:5000")
    print(
        "ML API: http://127.0.0.1:5000/api/ml/predict"
    )
    print("========================================")
    print()

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )