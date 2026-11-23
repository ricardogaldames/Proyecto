import json
import math
import os
import sqlite3
from contextlib import closing
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from flask import Flask, current_app, g, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
ALLOWED_TYPES = {"F5", "F7", "F11"}
COURT_SELECT = """
    SELECT c.*, x.nombre AS complejo_nombre, x.direccion AS complejo_direccion
    FROM canchas AS c
    JOIN complejos AS x ON x.id = c.complejo_id
"""


def create_app(test_config=None):
    app = Flask(__name__)
    app.json.ensure_ascii = False
    app.json.sort_keys = False
    app.config.from_mapping(
        DATABASE=os.environ.get("DATABASE_PATH", str(BASE_DIR / "canchas.db")),
        GEMINI_API_KEY=os.environ.get("GEMINI_API_KEY"),
        GEMINI_MODEL=os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite"),
    )
    if test_config:
        app.config.update(test_config)

    CORS(app, origins=["http://localhost:4200", "http://127.0.0.1:4200"])
    init_db(app)
    register_routes(app)
    return app


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def init_db(app):
    with closing(sqlite3.connect(app.config["DATABASE"])) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS complejos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                direccion TEXT NOT NULL,
                telefono TEXT
            );
            CREATE TABLE IF NOT EXISTS canchas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                tipo TEXT NOT NULL CHECK (tipo IN ('F5', 'F7', 'F11')),
                superficie TEXT NOT NULL,
                techada INTEGER NOT NULL DEFAULT 0 CHECK (techada IN (0, 1)),
                precio_hora REAL NOT NULL CHECK (precio_hora > 0),
                disponible INTEGER NOT NULL DEFAULT 1 CHECK (disponible IN (0, 1)),
                complejo_id INTEGER NOT NULL,
                FOREIGN KEY (complejo_id) REFERENCES complejos(id)
            );
            """
        )
        db.commit()


def error(message, status):
    return jsonify({"error": message}), status


def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def validate_complex(data):
    if not isinstance(data, dict):
        return "El cuerpo debe ser un objeto JSON"
    for field in ("nombre", "direccion"):
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            return f"'{field}' es obligatorio y debe ser texto"
    if data.get("telefono") is not None and not isinstance(data["telefono"], str):
        return "'telefono' debe ser texto"
    return None


def validate_court(data):
    if not isinstance(data, dict):
        return "El cuerpo debe ser un objeto JSON"
    for field in ("nombre", "superficie"):
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            return f"'{field}' es obligatorio y debe ser texto"
    if data.get("tipo") not in ALLOWED_TYPES:
        return f"'tipo' debe ser uno de {sorted(ALLOWED_TYPES)}"

    price = data.get("precio_hora")
    if (
        isinstance(price, bool)
        or not isinstance(price, (int, float))
        or (
            isinstance(price, int)
            and abs(price) > 9223372036854775807
        )
        or not math.isfinite(price)
        or price <= 0
    ):
        return "'precio_hora' debe ser un número mayor a 0"
    for field in ("techada", "disponible"):
        if field in data and not isinstance(data[field], bool):
            return f"'{field}' debe ser true o false"

    complex_id = data.get("complejo_id")
    if (
        isinstance(complex_id, bool)
        or not isinstance(complex_id, int)
        or complex_id < 1
        or complex_id > 9223372036854775807
    ):
        return "'complejo_id' debe ser un número entero"
    if not get_db().execute(
        "SELECT 1 FROM complejos WHERE id = ?", (complex_id,)
    ).fetchone():
        return f"El complejo con id {complex_id} no existe"
    return None


def complex_json(row):
    return dict(row)


def court_json(row):
    item = dict(row)
    item["techada"] = bool(item["techada"])
    item["disponible"] = bool(item["disponible"])
    return item


def register_routes(app):
    app.teardown_appcontext(close_db)

    @app.get("/api/complejos")
    def list_complexes():
        query = request.args.get("q", "").strip()
        sql = "SELECT * FROM complejos"
        params = ()
        if query:
            sql += " WHERE nombre LIKE ? OR direccion LIKE ?"
            params = (f"%{query}%", f"%{query}%")
        rows = get_db().execute(sql + " ORDER BY nombre", params).fetchall()
        return jsonify([complex_json(row) for row in rows]), 200

    @app.get("/api/complejos/<int:complex_id>")
    def get_complex(complex_id):
        row = get_db().execute(
            "SELECT * FROM complejos WHERE id = ?", (complex_id,)
        ).fetchone()
        if row is None:
            return error("Complejo no encontrado", 404)
        return jsonify(complex_json(row)), 200

    @app.post("/api/complejos")
    def create_complex():
        data = request.get_json(silent=True)
        message = validate_complex(data)
        if message:
            return error(message, 400)
        db = get_db()
        cursor = db.execute(
            "INSERT INTO complejos (nombre, direccion, telefono) VALUES (?, ?, ?)",
            (data["nombre"].strip(), data["direccion"].strip(), data.get("telefono")),
        )
        db.commit()
        row = db.execute(
            "SELECT * FROM complejos WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return jsonify(complex_json(row)), 201

    @app.put("/api/complejos/<int:complex_id>")
    def update_complex(complex_id):
        db = get_db()
        if not db.execute(
            "SELECT 1 FROM complejos WHERE id = ?", (complex_id,)
        ).fetchone():
            return error("Complejo no encontrado", 404)
        data = request.get_json(silent=True)
        message = validate_complex(data)
        if message:
            return error(message, 400)
        db.execute(
            "UPDATE complejos SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?",
            (data["nombre"].strip(), data["direccion"].strip(), data.get("telefono"), complex_id),
        )
        db.commit()
        row = db.execute(
            "SELECT * FROM complejos WHERE id = ?", (complex_id,)
        ).fetchone()
        return jsonify(complex_json(row)), 200

    @app.delete("/api/complejos/<int:complex_id>")
    def delete_complex(complex_id):
        db = get_db()
        if not db.execute(
            "SELECT 1 FROM complejos WHERE id = ?", (complex_id,)
        ).fetchone():
            return error("Complejo no encontrado", 404)
        count = db.execute(
            "SELECT COUNT(*) FROM canchas WHERE complejo_id = ?", (complex_id,)
        ).fetchone()[0]
        if count:
            return error(
                f"No se puede borrar: el complejo tiene {count} cancha(s). "
                "Borrá o mové las canchas primero.",
                409,
            )
        db.execute("DELETE FROM complejos WHERE id = ?", (complex_id,))
        db.commit()
        return jsonify({"mensaje": "Complejo eliminado"}), 200

    @app.get("/api/canchas")
    def list_courts():
        sql = COURT_SELECT + " WHERE 1 = 1"
        params = []
        complex_id = request.args.get("complejo")
        if complex_id is not None:
            if not complex_id.isdigit():
                return error("'complejo' debe ser un número entero", 400)
            if len(complex_id) > 19 or int(complex_id) > 9223372036854775807:
                return error("'complejo' está fuera del rango permitido", 400)
            sql += " AND c.complejo_id = ?"
            params.append(int(complex_id))
        court_type = request.args.get("tipo")
        if court_type:
            sql += " AND c.tipo = ?"
            params.append(court_type.upper())
        for field in ("techada", "disponible"):
            value = request.args.get(field)
            if value is not None:
                if value.lower() not in ("true", "false", "1", "0"):
                    return error(f"'{field}' debe ser true o false", 400)
                sql += f" AND c.{field} = ?"
                params.append(1 if value.lower() in ("true", "1") else 0)
        query = request.args.get("q", "").strip()
        if query:
            sql += " AND (c.nombre LIKE ? OR c.superficie LIKE ?)"
            params.extend((f"%{query}%", f"%{query}%"))
        rows = get_db().execute(sql + " ORDER BY c.nombre", params).fetchall()
        return jsonify([court_json(row) for row in rows]), 200

    @app.get("/api/canchas/<int:court_id>")
    def get_court(court_id):
        row = get_db().execute(
            COURT_SELECT + " WHERE c.id = ?", (court_id,)
        ).fetchone()
        if row is None:
            return error("Cancha no encontrada", 404)
        return jsonify(court_json(row)), 200

    @app.post("/api/canchas")
    def create_court():
        data = request.get_json(silent=True)
        message = validate_court(data)
        if message:
            return error(message, 400)
        db = get_db()
        cursor = db.execute(
            """INSERT INTO canchas
               (nombre, tipo, superficie, techada, precio_hora, disponible, complejo_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                data["nombre"].strip(),
                data["tipo"],
                data["superficie"].strip(),
                int(data.get("techada", False)),
                data["precio_hora"],
                int(data.get("disponible", True)),
                data["complejo_id"],
            ),
        )
        db.commit()
        row = db.execute(
            COURT_SELECT + " WHERE c.id = ?", (cursor.lastrowid,)
        ).fetchone()
        return jsonify(court_json(row)), 201

    @app.put("/api/canchas/<int:court_id>")
    def update_court(court_id):
        db = get_db()
        if not db.execute(
            "SELECT 1 FROM canchas WHERE id = ?", (court_id,)
        ).fetchone():
            return error("Cancha no encontrada", 404)
        data = request.get_json(silent=True)
        message = validate_court(data)
        if message:
            return error(message, 400)
        db.execute(
            """UPDATE canchas SET nombre = ?, tipo = ?, superficie = ?, techada = ?,
               precio_hora = ?, disponible = ?, complejo_id = ? WHERE id = ?""",
            (
                data["nombre"].strip(),
                data["tipo"],
                data["superficie"].strip(),
                int(data.get("techada", False)),
                data["precio_hora"],
                int(data.get("disponible", True)),
                data["complejo_id"],
                court_id,
            ),
        )
        db.commit()
        row = db.execute(
            COURT_SELECT + " WHERE c.id = ?", (court_id,)
        ).fetchone()
        return jsonify(court_json(row)), 200

    @app.delete("/api/canchas/<int:court_id>")
    def delete_court(court_id):
        db = get_db()
        if not db.execute(
            "SELECT 1 FROM canchas WHERE id = ?", (court_id,)
        ).fetchone():
            return error("Cancha no encontrada", 404)
        db.execute("DELETE FROM canchas WHERE id = ?", (court_id,))
        db.commit()
        return jsonify({"mensaje": "Cancha eliminada"}), 200

    @app.post("/api/chat")
    def chat():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return error("El cuerpo debe ser un objeto JSON", 400)
        message = data.get("message")
        if not isinstance(message, str) or not message.strip():
            return error("'message' es obligatorio y debe ser texto", 400)
        if len(message) > 1000:
            return error("'message' no puede superar los 1000 caracteres", 400)

        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return error(
                "El chatbot no está configurado. Definí GEMINI_API_KEY en el backend.",
                503,
            )

        rows = get_db().execute(
            COURT_SELECT + " ORDER BY x.nombre, c.nombre"
        ).fetchall()
        context = [
            {
                "nombre": row["nombre"],
                "tipo": row["tipo"],
                "superficie": row["superficie"],
                "techada": bool(row["techada"]),
                "precio_hora": row["precio_hora"],
                "disponible": bool(row["disponible"]),
                "complejo": row["complejo_nombre"],
                "direccion": row["complejo_direccion"],
            }
            for row in rows
        ]
        prompt = (
            "Sos el asistente de un sistema de gestión de complejos deportivos. "
            "Respondé en español y de forma breve, usando exclusivamente los datos "
            "JSON provistos para preguntas sobre canchas, disponibilidad, precios, "
            "superficies y complejos. Si los datos no alcanzan, decilo claramente. "
            "No inventes información.\n\n"
            f"Datos actuales de la aplicación:\n{json.dumps(context, ensure_ascii=False)}"
            f"\n\nPregunta: {message.strip()}"
        )
        try:
            answer = ask_gemini(api_key, current_app.config["GEMINI_MODEL"], prompt)
        except urllib.error.HTTPError as upstream_error:
            if upstream_error.code == 429:
                current_app.logger.warning("Gemini API rate limit reached")
                return error(
                    "Se alcanzó el límite de uso de Gemini. Revisá las cuotas activas en AI Studio.",
                    503,
                )
            current_app.logger.exception("Falló la consulta al servicio de Gemini")
            return error(
                "No se pudo obtener una respuesta del chatbot. "
                "Revisá la conexión, la clave y los límites del servicio.",
                502,
            )
        except (urllib.error.URLError, TimeoutError, ValueError):
            current_app.logger.exception("Falló la consulta al servicio de Gemini")
            return error(
                "No se pudo obtener una respuesta del chatbot. "
                "Revisá la conexión, la clave y los límites del servicio.",
                502,
            )
        return jsonify({"answer": answer}), 200

    @app.errorhandler(404)
    def route_not_found(_error):
        return error("Ruta no encontrada", 404)

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return error("Método no permitido", 405)


def ask_gemini(api_key, model, prompt):
    encoded_model = urllib.parse.quote(model, safe="-")
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{encoded_model}:generateContent"
    )
    body = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": 400},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        result = json.loads(response.read().decode("utf-8"))
    candidates = result.get("candidates", [])
    if not candidates:
        raise ValueError("Gemini devolvió una respuesta vacía")
    parts = candidates[0].get("content", {}).get("parts", [])
    answer = " ".join(
        part["text"].strip()
        for part in parts
        if isinstance(part.get("text"), str) and part["text"].strip()
    )
    if not answer:
        raise ValueError("Gemini devolvió una respuesta sin texto")
    return answer


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
