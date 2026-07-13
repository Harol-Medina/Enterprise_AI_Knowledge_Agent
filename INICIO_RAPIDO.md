# Inicio Rápido — Santos Pegasus Knowledge Agent

Esta guía te lleva de cero a tener el sistema funcionando en menos de 10 minutos. Si quieres entender el diseño del sistema, lee [ARQUITECTURA.md](ARQUITECTURA.md).

---

## Antes de empezar

Necesitas tener instalado:

| Requisito | Versión | Cómo verificar |
|-----------|---------|----------------|
| Python | **3.12** (no 3.13 ni 3.14) | `py -0` |
| Node.js | 20 o superior | `node --version` |
| Clave de Cohere | — | [dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys) |

> **¿Por qué Python 3.12?** ChromaDB (la base de datos vectorial) no tiene soporte para Python 3.14 todavía. Con 3.12 todo funciona.

---

## Paso 1 — Crear el entorno virtual

Abre una terminal en la raíz del proyecto y ejecuta:

```cmd
py -3.12 -m venv .venv
.venv\Scripts\activate
```

Si lo hiciste bien, verás `(.venv)` al inicio del prompt. Eso significa que el entorno está activo.

> Siempre que abras una terminal nueva, debes volver a ejecutar `.venv\Scripts\activate` antes de iniciar el backend.

---

## Paso 2 — Instalar dependencias del backend

```cmd
pip install -r BackEnd\requirements.txt
```

Esto instala FastAPI, Cohere, ChromaDB, PyPDF2 y el resto de librerías. Puede tardar 1-2 minutos la primera vez.

---

## Paso 3 — Configurar la clave de Cohere

Abre el archivo `.env` en la raíz del proyecto y reemplaza la clave:

```env
COHERE_API_KEY=tu-clave-real-aqui
```

Para obtener una clave gratuita:
1. Ve a [dashboard.cohere.com/api-keys](https://dashboard.cohere.com/api-keys)
2. Inicia sesión o crea una cuenta
3. Copia la clave de prueba (Trial key)

> El plan gratuito tiene un límite de 100 llamadas por minuto. El sistema lo maneja automáticamente.

---

## Paso 4 — Iniciar el backend

```cmd
cd BackEnd
py -3.12 -m uvicorn app.main:app --reload --port 8000
```

**La primera vez tarda 1-3 minutos** porque el sistema lee los 5 PDFs, los divide en fragmentos y genera los embeddings con Cohere. Verás algo así:

```
INFO | Orquestador iniciando...
INFO | Coleccion vacia — iniciando ingesta automatica...
INFO | Generando embeddings para 103 fragmentos nuevos...
INFO | Ingesta completada: 103 fragmentos.
INFO | Uvicorn running on http://127.0.0.1:8000
```

**Las siguientes veces arranca en segundos** porque ChromaDB ya tiene los datos guardados en disco.

Para verificar que el backend está funcionando, abre esto en tu navegador:
```
http://localhost:8000/api/salud
```
Debe responder: `{"estado":"ok","mensaje":"Agente de Conocimiento Santos Pegasus Soluciones operativo","version":"1.0.0"}`

---

## Paso 5 — Instalar dependencias del frontend

Abre una **nueva terminal** (no cierres la del backend) y ejecuta:

```cmd
cd FrontEnd
npm install
```

Solo necesitas hacer esto una vez.

---

## Paso 6 — Iniciar el frontend

```cmd
npm run dev
```

Verás:
```
  VITE v5.x.x  ready in 500ms
  ➜  Local:   http://localhost:5173/
```

---

## Paso 7 — Abrir el sistema

Abre tu navegador en:
```
http://localhost:5173
```

Inicia sesión con cualquiera de estos usuarios:

| Usuario | Contraseña | Tipo de acceso |
|---------|-----------|----------------|
| `admin` | `Admin2024!` | Administrador completo |
| `backend` | `Backend2024!` | Documentación de backend |
| `frontend` | `Frontend2024!` | Documentación de frontend |
| `fullstack` | `Fullstack2024!` | Acceso técnico completo |

---

## ¿Qué puedo hacer ahora?

Una vez dentro del sistema:

**Chat IA** — Haz preguntas sobre los documentos internos:
- *"¿Cuánto dura el proceso de onboarding?"*
- *"¿Cuáles son los estándares de código backend?"*
- *"¿Cómo se gestiona un incidente de producción?"*

**Documentos** — Ver qué archivos están indexados y disponibles según tu rol.

**Índice vectorial** — Si agregaste nuevos PDFs a la carpeta `Docs/`, puedes reindexarlos aquí sin reiniciar el servidor.

**Perfil** — Cambiar tu nombre, email o contraseña.

**Administración** (solo admin) — Ver estadísticas de uso, gestionar usuarios y subir nuevos documentos.

---

## Solución de problemas

### Error: `ModuleNotFoundError: No module named 'app'`

Estás ejecutando uvicorn desde el directorio equivocado. Asegúrate de estar dentro de `BackEnd/`:
```cmd
cd BackEnd
py -3.12 -m uvicorn app.main:app --reload --port 8000
```

### Error: `ModuleNotFoundError: No module named 'chromadb'`

El entorno virtual no tiene las dependencias instaladas. Verifica que `(.venv)` aparece en el prompt y ejecuta:
```cmd
pip install -r BackEnd\requirements.txt
```

### El backend usa Python 3.14 en lugar de 3.12

Verifica que usas `py -3.12` explícitamente:
```cmd
py -3.12 -m uvicorn app.main:app --reload --port 8000
```

### Error 429 durante la indexación

La clave de Cohere del plan trial tiene límite de 100 llamadas/minuto. El sistema espera automáticamente y reintenta. Solo necesitas esperar — la indexación terminará sola.

### El frontend no puede conectarse al backend

Verifica que el backend está corriendo en el puerto 8000:
```
http://localhost:8000/api/salud
```
Si no responde, el backend se cayó — revisa la terminal del backend para ver el error.

---

## Ejecución con Docker (alternativa)

Si tienes Docker instalado, puedes levantar todo con un solo comando:

```cmd
docker compose up --build
```

Accede en `http://localhost:80`. Para detener: `docker compose down`.

---

## Agregar documentos nuevos

1. Copia el PDF a la carpeta `Docs/`
2. En el frontend, ve a **Índice vectorial**
3. Haz clic en **Indexar nuevos documentos**

El sistema agrega solo los fragmentos nuevos sin reindexar lo que ya existe.

Para reindexar todo desde cero (si cambiaste la configuración de chunking):
- Haz clic en **Reindexación completa** en la misma pantalla

---

## Activar la búsqueda web con Tavily (opcional)

Por defecto está desactivada. Si quieres que el agente complemente sus respuestas con información técnica de la web:

1. Obtén una clave gratuita en [app.tavily.com](https://app.tavily.com)
2. En `.env`:
```env
TAVILY_API_KEY=tu-clave-tavily
TAVILY_HABILITADO=true
```
3. Reinicia el backend

El sistema solo consulta la web cuando la pregunta es técnica y hay documentos internos relevantes. La web siempre complementa, nunca reemplaza los documentos internos.
