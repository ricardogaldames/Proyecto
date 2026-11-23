# El Topo — gestión de complejos deportivos

Aplicación integradora para **Aplicaciones Híbridas** y **Clientes Web Mobile**.
El rubro propuesto (sujeto a aprobación docente) es la gestión de complejos
deportivos: un complejo tiene muchas canchas y cada cancha pertenece a un único
complejo (relación 1:N). No es un turnero.

## Estructura

- `backend/`: API REST Flask, SQLite, semilla de datos y tests.
- `frontend/`: cliente Angular standalone, responsive y con chatbot.

## Requisitos

- Python 3.10 o superior.
- Node.js 20.19 o superior y npm.
- Una clave de Gemini API para habilitar respuestas con IA.

## Instalación y ejecución

### Backend

En una terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Definí `GEMINI_API_KEY` como variable de entorno del proceso antes de iniciar
Flask. Por ejemplo, en PowerShell:

```powershell
$env:GEMINI_API_KEY = "TU_CLAVE"
python -m flask --app app run --port 5001
```

La aplicación crea `backend/canchas.db` al iniciar. Para agregar datos de
demostración, ejecutá `python seed.py` una sola vez; la semilla no agrega
registros si ya hay complejos. No subas la clave ni la base de datos al
repositorio.

### Frontend

En otra terminal, desde la raíz:

```powershell
cd frontend
npm install
npm start
```

Abrí `http://localhost:4200`. Flask debe estar activo en `http://localhost:5001`.

## API REST

Todas las respuestas son JSON. Las rutas de recursos admiten `200` al consultar,
actualizar o borrar, `201` al crear, `400` ante validaciones incorrectas y `404`
si no existe el recurso. Borrar un complejo con canchas responde `409 Conflict`.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/complejos?q=potrero` | Listar / buscar complejos |
| GET | `/api/complejos/:id` | Ver un complejo |
| POST | `/api/complejos` | Crear complejo |
| PUT | `/api/complejos/:id` | Editar complejo |
| DELETE | `/api/complejos/:id` | Borrar complejo |
| GET | `/api/canchas?q=sintético&complejo=1&tipo=F5&disponible=true` | Listar / filtrar canchas |
| GET | `/api/canchas/:id` | Ver una cancha |
| POST | `/api/canchas` | Crear cancha |
| PUT | `/api/canchas/:id` | Editar cancha |
| DELETE | `/api/canchas/:id` | Borrar cancha |
| POST | `/api/chat` | Preguntar al asistente con `{ "message": "..." }` |

Ejemplo de cancha:

```json
{
  "nombre": "Cancha Norte",
  "tipo": "F5",
  "superficie": "Sintético",
  "techada": true,
  "precio_hora": 15000,
  "disponible": true,
  "complejo_id": 1
}
```

## Decisiones de diseño

- **Relación:** SQLite aplica una clave foránea `canchas.complejo_id` hacia
  `complejos.id`. Cada alta o edición de cancha valida que el complejo exista.
- **Borrado:** no se permite borrar un complejo que todavía tenga canchas; primero
  hay que borrarlas o trasladarlas. Así se evita eliminar información relacionada
  de manera accidental. Las canchas sí se pueden borrar individualmente.
- **CORS:** Flask permite los orígenes locales de Angular (`localhost:4200` y
  `127.0.0.1:4200`).
- **Frontend:** los componentes standalone se reparten listado, detalle y
  formularios. `ApiService` concentra toda la comunicación HTTP; los formularios
  usan validaciones reactivas y muestran errores de la API.

## Chatbot e IA

El chatbot usa **Gemini API de Google**. Angular envía el mensaje a
`POST /api/chat`; Flask consulta la base SQLite, incluye los datos actuales de
canchas y complejos en el prompt y llama al modelo. La clave se lee desde
`GEMINI_API_KEY` en el backend: nunca se envía al navegador. El modelo puede
cambiarse con `GEMINI_MODEL` (por defecto `gemini-3.5-flash-lite`, modelo estable al momento
de preparar esta entrega).

El plan gratuito de Gemini da acceso limitado a ciertos modelos. Las cuotas se
miden por solicitudes/minuto (RPM), tokens/minuto (TPM) y solicitudes/día (RPD),
y varían por proyecto, modelo y nivel de uso; no hay una cantidad de consultas
garantizada para todas las cuentas. Revisá tus cuotas activas en
[Google AI Studio](https://aistudio.google.com/rate-limit) y los detalles de
[límites](https://ai.google.dev/gemini-api/docs/rate-limits),
[precios](https://ai.google.dev/gemini-api/docs/pricing) y disponibilidad del
[modelo Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).
El proveedor devuelve `429 RESOURCE_EXHAUSTED` al exceder una cuota; la API de
la aplicación lo informa como `503` para que se pueda reintentar más tarde.
Cuando falta la clave, el backend devuelve `503`; si falla el proveedor, devuelve
`502` y el frontend informa el error.

## Tests

Desde la carpeta `backend`:

```powershell
python -m unittest discover -s tests -v
```

Desde `frontend`:

```powershell
npm test
```

Karma ejecuta las pruebas en Chrome Headless; necesitás tener Google Chrome
instalado.

## Uso de IA en el desarrollo

Se usó IA como asistencia para implementar y revisar estructura, validaciones y
tests. La API y la interfaz se documentan para poder explicar cómo se conectan,
qué datos usa el chatbot y por qué la clave permanece en el servidor.
