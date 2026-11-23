import json
import tempfile
import unittest
from pathlib import Path
from urllib.error import HTTPError
from unittest.mock import patch

from app import create_app


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = str(Path(self.temp_dir.name) / "test.db")
        self.app = create_app(
            {
                "TESTING": True,
                "DATABASE": self.database,
                "GEMINI_API_KEY": None,
            }
        )
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def create_complex(self):
        response = self.client.post(
            "/api/complejos",
            json={"nombre": "El Potrero", "direccion": "Calle 123"},
        )
        self.assertEqual(response.status_code, 201)
        return response.json["id"]

    def create_court(self, complex_id):
        return self.client.post(
            "/api/canchas",
            json={
                "nombre": "Cancha Norte",
                "tipo": "F5",
                "superficie": "Sintético",
                "precio_hora": 15000,
                "complejo_id": complex_id,
            },
        )

    def test_create_and_filter_related_courts(self):
        complex_id = self.create_complex()
        response = self.create_court(complex_id)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json["complejo_nombre"], "El Potrero")

        filtered = self.client.get(f"/api/canchas?complejo={complex_id}")
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual([row["nombre"] for row in filtered.json], ["Cancha Norte"])

    def test_validation_and_missing_relationship(self):
        invalid = self.create_court(999)
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("no existe", invalid.json["error"])

        missing_field = self.client.post("/api/complejos", json={"nombre": "Sin calle"})
        self.assertEqual(missing_field.status_code, 400)

        invalid_price = self.client.post(
            "/api/canchas",
            json={
                "nombre": "Cancha",
                "tipo": "F5",
                "superficie": "Sintético",
                "precio_hora": -(10**100),
                "complejo_id": 1,
            },
        )
        self.assertEqual(invalid_price.status_code, 400)

    def test_update_and_not_found_status_codes(self):
        complex_id = self.create_complex()
        court_id = self.create_court(complex_id).json["id"]

        updated = self.client.put(
            f"/api/canchas/{court_id}",
            json={
                "nombre": "Cancha Sur",
                "tipo": "F7",
                "superficie": "Césped",
                "precio_hora": 18000,
                "disponible": False,
                "complejo_id": complex_id,
            },
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json["nombre"], "Cancha Sur")
        self.assertFalse(updated.json["disponible"])
        self.assertEqual(self.client.get("/api/canchas/999").status_code, 404)

        updated_complex = self.client.put(
            f"/api/complejos/{complex_id}",
            json={"nombre": "El Potrero 2", "direccion": "Calle 456"},
        )
        self.assertEqual(updated_complex.status_code, 200)
        self.assertEqual(updated_complex.json["nombre"], "El Potrero 2")

    def test_parent_delete_is_blocked_until_children_are_removed(self):
        complex_id = self.create_complex()
        court_id = self.create_court(complex_id).json["id"]

        blocked = self.client.delete(f"/api/complejos/{complex_id}")
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(self.client.delete(f"/api/canchas/{court_id}").status_code, 200)
        self.assertEqual(self.client.delete(f"/api/complejos/{complex_id}").status_code, 200)

    def test_chat_requires_a_nonempty_message_and_a_server_key(self):
        invalid = self.client.post("/api/chat", json={"message": " "})
        self.assertEqual(invalid.status_code, 400)

        unconfigured = self.client.post("/api/chat", json={"message": "¿Qué canchas hay?"})
        self.assertEqual(unconfigured.status_code, 503)

    def test_chat_sends_current_database_data_and_returns_answer(self):
        complex_id = self.create_complex()
        self.create_court(complex_id)
        self.app.config["GEMINI_API_KEY"] = "test-key"
        response_body = {
            "candidates": [
                {"content": {"parts": [{"text": "Hay una cancha F5 disponible."}]}}
            ]
        }
        fake_response = unittest.mock.MagicMock()
        fake_response.__enter__.return_value = fake_response
        fake_response.read.return_value = json.dumps(response_body).encode("utf-8")

        with patch("app.urllib.request.urlopen", return_value=fake_response) as call:
            response = self.client.post(
                "/api/chat", json={"message": "¿Qué canchas hay?"}
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["answer"], "Hay una cancha F5 disponible.")
        request = call.call_args.args[0]
        self.assertEqual(request.get_header("X-goog-api-key"), "test-key")
        payload = json.loads(request.data.decode("utf-8"))
        self.assertIn("Cancha Norte", payload["contents"][0]["parts"][0]["text"])
        self.assertNotIn("temperature", payload["generationConfig"])

    def test_chat_reports_provider_rate_limit(self):
        self.app.config["GEMINI_API_KEY"] = "test-key"
        rate_limit = HTTPError(
            "https://generativelanguage.googleapis.com", 429, "Rate limited", {}, None
        )
        try:
            with patch("app.urllib.request.urlopen", side_effect=rate_limit):
                response = self.client.post(
                    "/api/chat", json={"message": "¿Qué canchas hay?"}
                )
        finally:
            rate_limit.close()

        self.assertEqual(response.status_code, 503)
        self.assertIn("límite de uso", response.json["error"])


if __name__ == "__main__":
    unittest.main()
