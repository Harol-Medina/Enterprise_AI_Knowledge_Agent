import os, cohere
from dotenv import load_dotenv
load_dotenv(".env")

c = cohere.Client(api_key=os.getenv("COHERE_API_KEY"))

print("Probando embed-multilingual-v3.0...")
r = c.embed(
    texts=["prueba de embedding para Santos Pegasus Soluciones"],
    model="embed-multilingual-v3.0",
    input_type="search_document",
)
print(f"OK — dimensiones: {len(r.embeddings[0])}")

print("Probando embed-multilingual-light-v3.0...")
r2 = c.embed(
    texts=["prueba"],
    model="embed-multilingual-light-v3.0",
    input_type="search_document",
)
print(f"OK — dimensiones: {len(r2.embeddings[0])}")
