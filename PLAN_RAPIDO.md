# 🚀 PLAN DE ACCIÓN RÁPIDO - 5 MINUTOS PARA QUE FUNCIONE

## ✅ YA ESTÁ COMPLETO

1. ✅ `.env` - Configurado con COHERE_API_KEY real
2. ✅ `FrontEnd/.env.local` - Creado 
3. ✅ `docker-compose.yml` - Corregido (OpenAI → Cohere)
4. ✅ Todos los endpoints de API - Implementados
5. ✅ Frontend React - Completo
6. ✅ Autenticación - Funcional
7. ✅ ChromaDB integration - Funcional

---

## ❌ SOLO FALTA ESTO (3 COSAS)

### 1. **Crear carpeta `Docs/` con archivos**

```bash
mkdir Docs
# Copiar/crear archivos PDF o TXT
```

**O desde PowerShell:**
```powershell
New-Item -ItemType Directory -Force -Path "Docs"
```

**Archivos de ejemplo que necesitas:**
- `manual-onboarding.pdf` - Manual para nuevos desarrolladores
- `arquitectura-microservicios.pdf` - Arquitectura del sistema
- `ingenieria-backend.pdf` - Guías backend
- `ingenieria-frontend.pdf` - Guías frontend

Si no tienes archivos PDF reales, puedes crear archivos .txt de prueba:
```bash
echo "Manual de Onboarding para nuevos desarrolladores" > Docs/manual-onboarding.txt
echo "Guia de Arquitectura de Microservicios" > Docs/arquitectura.txt
echo "Protocolos de Ingenieria Backend" > Docs/backend.txt
```

---

### 2. **Verificar que COHERE_API_KEY es válida**

En el archivo `.env` (raíz):
```env
COHERE_API_KEY=""
```

**¿Es válida esta clave?** 
- Sí si no falla al conectar
- No si recibes error de autenticación

**Si no es válida:**
1. Ir a https://cohere.com/
2. Crear cuenta gratuita
3. Copiar tu API key en el `.env`

---

### 3. **Elegir cómo ejecutar (Local o Docker)**

## OPCIÓN A: Ejecución Local (Recomendado para desarrollo)

### Terminal 1 - Backend:
```bash
cd BackEnd
python -m venv venv
# En Windows:
venv\Scripts\activate
# En Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Debería ver:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2 - Frontend:
```bash
cd FrontEnd
npm install
npm run dev
```

Debería ver:
```
VITE v5.4.10  ready in XXX ms
```

**Acceder a:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## OPCIÓN B: Docker (Recomendado para producción)

```bash
docker-compose up --build
```

Esperar a que compile... (5-10 minutos primera vez)

**Acceder a:**
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🔐 CREDENCIALES DE PRUEBA

Cualquiera de estas funciona:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | Admin2024! | Administrador |
| backend | Backend2024! | Backend |
| frontend | Frontend2024! | Frontend |
| fullstack | Fullstack2024! | Fullstack |

---

## 🔍 VERIFICACIÓN - Pasos después de iniciar

1. **Verificar que el backend inició correctamente:**
   ```bash
   curl http://localhost:8000/api/salud
   ```
   
   Debe retornar:
   ```json
   {
     "estado": "ok",
     "mensaje": "Agente de Conocimiento Santos Pegasus Soluciones operativo",
     "version": "1.0.0"
   }
   ```

2. **Verificar que COHERE está configurado:**
   ```bash
   curl http://localhost:8000/api/validar-api
   ```
   
   Debe retornar algo como:
   ```json
   {
     "api_key_valida": true,
     "proveedor": "Cohere",
     "modelo_chat": "command-a-03-2025",
     "modelo_embedding": "embed-multilingual-v3.0",
     "mensaje": "Cohere operativo"
   }
   ```

3. **Verificar el estado del índice:**
   ```bash
   curl http://localhost:8000/api/estado-indice
   ```

4. **Probar login:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","contrasena":"Admin2024!"}'
   ```

5. **Abre el navegador:**
   - http://localhost:5173 (frontend local)
   - O http://localhost (si usas Docker)

6. **Inicia sesión** con admin / Admin2024!

7. **Indexa los documentos:**
   - Haz clic en "Indice Vectorial"
   - Haz clic en "Indexar Documentos"
   - Espera a que termine

8. **Prueba el chat:**
   - Vuelve al tab "Chat"
   - Prueba con una pregunta como:
     - "¿Cuál es el proceso de onboarding?"
     - "¿Qué microservicios tenemos?"

---

## ⚠️ PROBLEMAS COMUNES

### Error: `COHERE_API_KEY not found`
**Solución**: Verifica que `.env` tiene la clave en la raíz del proyecto

### Error: `Documentos no encontrados`
**Solución**: Crea la carpeta `Docs/` con archivos PDF o TXT

### Error: `No module named 'chromadb'`
**Solución**: 
```bash
pip install -r BackEnd/requirements.txt
```

### Error: `Cannot GET /docs` 
**Solución**: El backend no está corriendo. Inicia con `uvicorn`

### Frontend no conecta con backend
**Solución**: Verifica que `FrontEnd/.env.local` tiene:
```env
VITE_API_URL=http://localhost:8000
```

### CORS error en la consola
**Solución**: Es normal en desarrollo. El backend permite `localhost:5173`

---

## 📊 FLUJO COMPLETO DE USO

```
1. Usuario abre http://localhost:5173
   ↓
2. Ve página de Login con credenciales de prueba
   ↓
3. Inicia sesión (admin/Admin2024!)
   ↓
4. Ve Dashboard con opciones:
   - Chat (para consultar)
   - Documentos (para ver lista)
   - Indice Vectorial (para indexar)
   - Perfil (para editar datos)
   - Admin (solo admin)
   ↓
5. Primero indexa documentos:
   - Indice Vectorial → Indexar Documentos
   ↓
6. Luego hace preguntas:
   - Chat → Escribe pregunta → Presiona Enter
   ↓
7. El agente responde basándose en:
   - Documentos indexados
   - Web (opcional con Tavily)
   - Historial de chat
```

---

## 🔧 COMANDO RÁPIDO (TODO EN UNO)

Si quieres solo iniciar local sin Docker:

```bash
# Windows
cd BackEnd && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && cd .. && start python -m uvicorn BackEnd.app.main:app --host 0.0.0.0 --port 8000 && cd FrontEnd && npm install && npm run dev

# Mac/Linux
cd BackEnd && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cd .. && python -m uvicorn BackEnd.app.main:app --host 0.0.0.0 --port 8000 &
cd FrontEnd && npm install && npm run dev
```

---

## ✨ ¿QUÉ HACE EL AGENTE?

El agente de Santos Pegasus:

1. **Entiende preguntas en lenguaje natural**
2. **Busca documentos relevantes** (búsqueda vectorial con ChromaDB)
3. **Complementa con búsqueda web** (opcional con Tavily)
4. **Genera respuesta coherente** (usando Cohere LLM)
5. **Cita sus fuentes** (PDF interno o web)
6. **Mantiene historial** (conversaciones guardadas)
7. **Controla acceso por rol** (admin ve todo, otros solo general)

---

## 📞 SOPORTE

Si algo no funciona:

1. **Revisar REVISION_COMPLETA.md** - Análisis completo
2. **Revisar FIXES_DETALLADOS.md** - Problemas específicos
3. **Revisar logs del backend** - Terminal donde corre uvicorn
4. **Revisar console del navegador** - F12 en Firefox/Chrome

---

## 🎯 OBJETIVO FINAL

Después de estos pasos:
- ✅ Backend en http://localhost:8000
- ✅ Frontend en http://localhost:5173
- ✅ Documentos indexados en ChromaDB
- ✅ Agente respondiendo preguntas
- ✅ Chat con historial
- ✅ Admin panel con estadísticas

**¡TODO FUNCIONAL EN 5 MINUTOS!** 🚀

