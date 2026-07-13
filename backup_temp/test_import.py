import sys
sys.path.insert(0, "BackEnd")
from dotenv import load_dotenv
load_dotenv(".env")
from app.main import app
rutas = [r.path for r in app.routes if hasattr(r, "path")]
print("Backend OK")
print("Rutas:", rutas[:12])
