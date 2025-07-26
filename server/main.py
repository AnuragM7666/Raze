from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Resume Converter Backend is running!"}
