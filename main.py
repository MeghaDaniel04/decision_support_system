try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.routes import router as api_router
import uvicorn
import os

app = FastAPI()

# Allow requests from the frontend (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

# Serve static assets from /static
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve the main SPA page from templates/index.html at /
@app.get("/", include_in_schema=False)
def root():
    return FileResponse("templates/index.html")

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)