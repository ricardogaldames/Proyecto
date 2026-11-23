"""Carga datos de demostración sin duplicarlos. Ejecutar desde backend/."""
import sqlite3
from contextlib import closing
from pathlib import Path

if __package__:
    from .app import app, init_db
else:
    from app import app, init_db

DATABASE = Path(__file__).resolve().parent / "canchas.db"


def seed():
    init_db(app)
    with closing(sqlite3.connect(DATABASE)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        with db:
            count = db.execute("SELECT COUNT(*) FROM complejos").fetchone()[0]
            if count:
                print("La base ya tiene complejos; no se modificaron los datos.")
                return

            db.executemany(
                "INSERT INTO complejos (nombre, direccion, telefono) VALUES (?, ?, ?)",
                [
                    ("Complejo El Potrero", "Av. Siempreviva 123", "11-5555-0001"),
                    ("Fútbol Center", "Calle Falsa 456", "11-5555-0002"),
                ],
            )
            db.executemany(
                """INSERT INTO canchas
                   (nombre, tipo, superficie, techada, precio_hora, disponible, complejo_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                [
                    ("Cancha 1", "F5", "Sintético", 1, 18000, 1, 1),
                    ("Cancha 2", "F5", "Sintético", 0, 15000, 1, 1),
                    ("Cancha 3", "F7", "Césped natural", 0, 25000, 0, 1),
                    ("Estadio", "F11", "Césped natural", 0, 60000, 1, 2),
                    ("Cancha Techada", "F5", "Sintético", 1, 20000, 1, 2),
                ],
            )
            print("Datos de ejemplo cargados.")


if __name__ == "__main__":
    seed()
