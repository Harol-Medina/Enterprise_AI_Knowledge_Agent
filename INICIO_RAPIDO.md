# 🚀 Guía Rápida de Ejecución

## ⚡ 5 minutos para tener el sistema funcionando

### Prerrequisitos

✅ Python 3.12  
✅ Node.js 18+  
✅ Clave Cohere (gratis en [dashboard.cohere.ai](https://dashboard.cohere.ai))

---

## Opción 1: Ejecución Local (Recomendado)

### Paso 1: Configurar Backend

```bash
# Activar entorno virtual
.venv\Scripts\activate

# Instalar dependencias
pip install -r BackEnd/requirements.txt

# Configurar .env (raíz del proyecto)
# Agregar tu COHERE_API_KEY
```

### Paso 2: Iniciar Backend (Terminal 1)

```bash
cd BackEnd
uvicorn app.main:app --reload --port 8000
```

**Espera a ver este mensaje:**
```
INFO | Uvicorn running on http://127.0.0.1:8000
```

📍 Documentación API: http://localhost:8000/docs

### Paso 3: Iniciar Frontend (Terminal 2)

```bash
cd FrontEnd
npm install
npm run dev
```

**Espera a ver:**
```
VITE v5.4.10  ready in 123 ms

➜  Local:   http://localhost:5173/
```

📍 UI disponible: http://localhost:5173

### Paso 4: Inicia sesión

Usa cualquier usuario:
- `test` / `test`
- `admin` / `admin`

---

## Opción 2: Docker Compose (Un comando)

```bash
docker-compose up --build
```

Espera 2-3 minutos. Luego:

📍 Frontend: http://localhost  
📍 Backend: http://localhost:8000  
📍 Docs: http://localhost:8000/docs

Para detener:
```bash
docker-compose down
```

---

## 🧪 Ejecutar Tests

```bash
cd QA
pip install -r ../BackEnd/requirements.txt
pytest tests/ -v
```

Resultado esperado: **63 tests pasando** ✅

---

## 🐛 Troubleshooting Rápido

### ❌ Error: "COHERE_API_KEY not set"

**Solución:**
1. Editar `.env` en la raíz
2. Agregar `COHERE_API_KEY=tu_clave_real`
3. Reiniciar backend

```bash
cat .env  # Verificar que esté la clave
```

### ❌ Error: "Port 8000 already in use"

```bash
# Cambiar puerto
cd BackEnd
uvicorn app.main:app --port 9000 --reload
```

### ❌ Frontend no conecta a backend

Verificar `.env.local` en FrontEnd:
```
VITE_API_URL=http://localhost:8000
```

Si cambiaste puerto, actualizar acá también.

### ❌ ChromaDB error

```bash
# Limpiar BD vieja
rm -r ./chroma_db

# Reiniciar backend (recreará DB)
```

---

## 📊 URLs Principales

| Servicio | URL | Descripción |
|---|---|---|
| **Frontend** | http://localhost:5173 | UI React |
| **Backend** | http://localhost:8000 | API REST |
| **Swagger Docs** | http://localhost:8000/docs | Documentación interactiva |
| **ReDoc** | http://localhost:8000/redoc | Referencia API |

---

## 🎯 Primer Chat

1. Inicia sesión (test/test)
2. Ve a **Chat**
3. Escribe: "¿Qué es Santos Pegasus?"
4. El agente responde usando documentación interna

---

## 📝 Comandos Útiles

### Backend

```bash
# Desarrollar (con auto-reload)
cd BackEnd
uvicorn app.main:app --reload

# Producción
uvicorn app.main:app --workers 4

# Logs
tail -f .logs/app.log
```

### Frontend

```bash
# Desarrollo (con HMR)
cd FrontEnd
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

### Docker

```bash
# Build images
docker-compose build

# Logs
docker-compose logs -f

# Shell en contenedor
docker exec -it agente_backend bash
```

---

## 🔗 Próximos Pasos

1. **Lee la documentación**
   - [README.md](README.md) - Detalles completos
   - [ARQUITECTURA.md](ARQUITECTURA.md) - Diseño del sistema

2. **Explora los documentos**
   - Ve a **Admin** → **Índice Vectorial**
   - Ve los 5 documentos indexados

3. **Prueba funcionalidades**
   - Chat: Haz preguntas
   - Documentos: Descarga PDFs
   - Admin: Ve estadísticas

4. **Desarrollo**
   - Agrupa nuevos PDFs en `Docs/`
   - Crea endpoints en `BackEnd/app/api.py`
   - Agrega componentes en `FrontEnd/src/`

---

## 🆘 Necesitas Ayuda?

1. Verificar logs:
   ```bash
   # Backend
   cd BackEnd && tail -f .logs/app.log
   
   # Frontend (ver console del navegador: F12)
   ```

2. Validar configuración:
   ```bash
   # Ver .env
   cat .env
   
   # Ver .env.local (frontend)
   cat FrontEnd/.env.local
   ```

3. Verificar API:
   ```bash
   curl http://localhost:8000/api/salud
   # Debe retornar: {"salud": "ok"}
   ```

---

**Última actualización**: 13 de Julio, 2026
