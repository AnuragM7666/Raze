import os
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import pdfplumber
from typing import Optional
from docxtpl import DocxTemplate
from pydantic import BaseModel

UPLOAD_DIR = "uploads"
GENERATED_DIR = "generated"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)

app = FastAPI()

# Allow your React app (adjust port as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Models ----

class ResumeSections(BaseModel):
    summary: str = ""
    experience: str = ""
    education: str = ""
    skills: str = ""
    projects: str = ""

# ---- File Upload Endpoint ----

@app.post("/upload-resumes")
async def upload_resumes(
    resume_a: UploadFile = File(...),
    resume_b: UploadFile = File(...)
):
    file_a_path = os.path.join(UPLOAD_DIR, resume_a.filename)
    with open(file_a_path, "wb") as buffer:
        shutil.copyfileobj(resume_a.file, buffer)

    file_b_path = os.path.join(UPLOAD_DIR, resume_b.filename)
    with open(file_b_path, "wb") as buffer:
        shutil.copyfileobj(resume_b.file, buffer)
    return {"message": "Files uploaded", 
            "resumeA": resume_a.filename,
            "resumeB": resume_b.filename}

# ---- PDF Parsing Utility ----

def extract_sections_from_text(text):
    # Similar logic to your Node.js version, simple demo below:
    sections = {
        "summary": "",
        "experience": "",
        "education": "",
        "skills": "",
        "projects": "",
    }
    current = None
    for line in text.splitlines():
        l = line.strip()
        if l.lower().startswith("summary"):
            current = "summary"
            continue
        elif l.lower().startswith("experience"):
            current = "experience"
            continue
        elif l.lower().startswith("education"):
            current = "education"
            continue
        elif l.lower().startswith("skills"):
            current = "skills"
            continue
        elif l.lower().startswith("projects"):
            current = "projects"
            continue
        if current:
            sections[current] += (l + "\n")
    for k in sections:
        sections[k] = sections[k].strip()
    return sections

# ---- Parse Resume B Endpoint ----

@app.post("/parse-resume-b")
async def parse_resume_b(filename: str = Form(...)):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        return JSONResponse(status_code=404, content={"error": "File not found"})

    if file_path.lower().endswith(".pdf"):
        with pdfplumber.open(file_path) as pdf:
            full_text = "\n".join([p.extract_text() for p in pdf.pages if p.extract_text()])
        sections = extract_sections_from_text(full_text)
        return ResumeSections(**sections)
    elif file_path.lower().endswith(".docx"):
        from docx import Document
        doc = Document(file_path)
        full_text = "\n".join([p.text for p in doc.paragraphs])
        sections = extract_sections_from_text(full_text)
        return ResumeSections(**sections)
    else:
        return JSONResponse(status_code=400, content={"error": "Only PDF or DOCX supported for parsing."})

# ---- Generate Resume Endpoint (returns DOCX) ----

@app.post("/generate-resume")
async def generate_resume(
    template_filename: str = Form(...),
    data: str = Form(...)
):
    """
    template_filename: name of uploaded template docx (Resume A)
    data: JSON string with sections extracted from Resume B
    """
    import json
    data_dict = json.loads(data)
    template_path = os.path.join(UPLOAD_DIR, template_filename)
    output_path = os.path.join(GENERATED_DIR, f"generated_{template_filename}")

    doc = DocxTemplate(template_path)
    doc.render(data_dict)
    doc.save(output_path)
    return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename="final_resume.docx")

# ---- Health Check ----
@app.get("/")
def root():
    return {"message": "Backend up and running!"}

    