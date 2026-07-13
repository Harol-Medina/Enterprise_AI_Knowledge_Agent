"""
Configuración de pytest para las pruebas de QA.
Añade el directorio BackEnd al sys.path para que los imports de `app.*` funcionen.
"""
import sys
from pathlib import Path

# Ruta al BackEnd desde QA/tests/conftest.py
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / "BackEnd"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
