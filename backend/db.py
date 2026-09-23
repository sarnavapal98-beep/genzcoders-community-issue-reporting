import os
import sqlite3


# ---------------------------------------------------------
# DATABASE PATH
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATABASE_PATH = os.path.join(BASE_DIR, "community_reports.db")


# ---------------------------------------------------------
# DATABASE CONNECTION
# ---------------------------------------------------------

def get_db_connection():
    """
    Create and return a SQLite database connection.
    """

    connection = sqlite3.connect(
        DATABASE_PATH,
        timeout=30
    )

    # Allows rows to behave like dictionaries
    connection.row_factory = sqlite3.Row

    # Enable foreign key support
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


# ---------------------------------------------------------
# INITIALIZE DATABASE

def init_db():
    """
       Create all database tables using schema.sql.
    """

    schema_path = os.path.join(BASE_DIR, "schema.sql")

    if not os.path.exists(schema_path):
        raise FileNotFoundError(
            f"schema.sql was not found at: {schema_path}"
        )

    connection = get_db_connection()

    try:
        with open(schema_path, "r", encoding="utf-8") as schema_file:
            schema = schema_file.read()

        connection.executescript(schema)
        connection.commit()

        print("Database initialized successfully.")
        print(f"Database location: {DATABASE_PATH}")

    finally:
        connection.close()


# ---------------------------------------------------------
# SEED DEFAULT DATA
# ---------------------------------------------------------

def seed_default_data():
    """
    Insert the default departments and issue categories.

    INSERT OR IGNORE prevents duplicate records when the
    application is restarted.
    """

    connection = get_db_connection()

    try:
        cursor = connection.cursor()

        # -------------------------------------------------
        # DEPARTMENTS
        # -------------------------------------------------

        departments = [
            (
                "Road Department",
                "road@community.local"
            ),
            (
                "Water Department",
                "water@community.local"
            ),
            (
                "Infrastructure Department",
                "infrastructure@community.local"
            ),
            (
                "Sanitation Department",
                "sanitation@community.local"
            )
        ]

        cursor.executemany(
            """
            INSERT OR IGNORE INTO departments
            (name, contact)
            VALUES (?, ?)
            """,
            departments
        )

        # -------------------------------------------------
        # CATEGORIES
        # -------------------------------------------------

        categories = [
            ("pothole", "Road Department"),
            ("water leakage", "Water Department"),
            ("street light", "Infrastructure Department"),
            ("cardboard", "Sanitation Department"),
            ("glass", "Sanitation Department"),
            ("metal", "Sanitation Department"),
            ("paper", "Sanitation Department"),
            ("plastic", "Sanitation Department"),
            ("trash", "Sanitation Department")
        ]

        for category_name, department_name in categories:

            cursor.execute(
                """
                SELECT DepartmentID
                FROM departments
                WHERE name = ?
                """,
                (department_name,)
            )

            department = cursor.fetchone()

            if department:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO categories
                    (name, DepartmentID)
                    VALUES (?, ?)
                    """,
                    (
                        category_name,
                        department["DepartmentID"]
                    )
                )

        connection.commit()

        print("Default departments and categories inserted.")

    finally:
        connection.close()


# ---------------------------------------------------------
# COMPLETE DATABASE SETUP
# ---------------------------------------------------------

def setup_database():
    """
    Initialize database and insert default data.
    """

    init_db()
    seed_default_data()


# ---------------------------------------------------------
# TEST DATABASE
# ---------------------------------------------------------

if __name__ == "__main__":

    print("----------------------------------------")
    print("Community Reports Database Setup")
    print("----------------------------------------")

    setup_database()

    connection = get_db_connection()

    try:
        cursor = connection.cursor()

        # Count departments
        cursor.execute(
            "SELECT COUNT(*) AS count FROM departments"
        )

        department_count = cursor.fetchone()["count"]

        # Count categories
        cursor.execute(
            "SELECT COUNT(*) AS count FROM categories"
        )

        category_count = cursor.fetchone()["count"]

        print()
        print(f"Departments: {department_count}")
        print(f"Categories: {category_count}")
        print()
        print("Database setup completed successfully.")

    finally:
        connection.close()
