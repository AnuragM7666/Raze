const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure output directory exists
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Configure CORS to allow requests only from localhost:5173
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept common resume file types
    const allowedTypes = /pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                    file.mimetype === 'application/pdf' ||
                    file.mimetype === 'application/msword' ||
                    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    file.mimetype === 'text/plain';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed!'));
    }
  }
});

// Middleware
app.use(express.json());

// POST /upload-resumes endpoint
app.post('/upload-resumes', upload.fields([
  { name: 'resumeA', maxCount: 1 },
  { name: 'resumeB', maxCount: 1 }
]), (req, res) => {
  try {
    const files = req.files;
    
    if (!files || !files.resumeA || !files.resumeB) {
      return res.status(400).json({
        error: 'Both Resume A and Resume B files are required'
      });
    }

    const resumeA = files.resumeA[0];
    const resumeB = files.resumeB[0];

    res.json({
      message: 'Resumes uploaded successfully',
      files: {
        resumeA: {
          originalName: resumeA.originalname,
          filename: resumeA.filename,
          size: resumeA.size,
          path: resumeA.path
        },
        resumeB: {
          originalName: resumeB.originalname,
          filename: resumeB.filename,
          size: resumeB.size,
          path: resumeB.path
        }
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload files',
      details: error.message
    });
  }
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }
  
  if (error.message.includes('Only PDF, DOC, DOCX, and TXT files are allowed!')) {
    return res.status(400).json({
      error: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'
    });
  }

  res.status(500).json({
    error: 'Something went wrong!',
    details: error.message
  });
});

// Function to parse PDF and extract sections
function extractResumeSections(text) {
  const sections = {
    summary: '',
    experience: '',
    education: '',
    skills: '',
    projects: ''
  };

  // Section header patterns (case-insensitive)
  const sectionPatterns = {
    summary: /^(summary|profile|objective|about|overview)[:\s]*$/i,
    experience: /^(experience|work experience|employment|career|professional experience)[:\s]*$/i,
    education: /^(education|academic|qualifications|degree)[:\s]*$/i,
    skills: /^(skills|technical skills|competencies|technologies)[:\s]*$/i,
    projects: /^(projects|portfolio|work samples|achievements)[:\s]*$/i
  };

  // Helper: is a line a section header?
  function getSectionFromLine(line) {
    for (const [section, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(line.trim())) return section;
    }
    // Heuristic: ALL CAPS lines (not too long)
    if (/^[A-Z\s]{4,40}$/.test(line.trim())) {
      const norm = line.trim().toLowerCase();
      for (const [section, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(norm)) return section;
      }
    }
    // Heuristic: lines ending with a colon
    const norm = line.trim().replace(/:$/, '').toLowerCase();
    for (const [section, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(norm)) return section;
    }
    return null;
  }

  // Split text into lines and clean
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let currentSection = null;
  let sectionContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const foundSection = getSectionFromLine(line);
    if (foundSection) {
      // Save previous section content
      if (currentSection && sectionContent.length > 0) {
        sections[currentSection] = sectionContent.join('\n').trim();
      }
      currentSection = foundSection;
      sectionContent = [];
      continue;
    }
    if (currentSection) {
      sectionContent.push(line);
    }
  }
  // Save last section
  if (currentSection && sectionContent.length > 0) {
    sections[currentSection] = sectionContent.join('\n').trim();
  }

  // Post-process: try to extract lists for experience, skills, projects
  function extractList(sectionText) {
    if (!sectionText) return [];
    // Split by lines that start with dash, bullet, or number
    return sectionText.split(/\n/).filter(l => /^([-*•\d])/.test(l.trim())).map(l => l.replace(/^[-*•\d.\s]+/, '').trim()).filter(Boolean);
  }
  if (sections.experience) {
    sections.experience_list = extractList(sections.experience);
  }
  if (sections.skills) {
    // Also split by comma for skills
    const skillLines = extractList(sections.skills);
    if (skillLines.length === 0) {
      sections.skills_list = sections.skills.split(/,|\n/).map(s => s.trim()).filter(Boolean);
    } else {
      sections.skills_list = skillLines;
    }
  }
  if (sections.projects) {
    sections.projects_list = extractList(sections.projects);
  }

  // Fallback: if no sections found, put all text in summary
  if (Object.values(sections).every(section => !section || (Array.isArray(section) && section.length === 0))) {
    sections.summary = text.trim();
  }

  return sections;
}

// POST endpoint to parse Resume B PDF
app.post('/parse-resume-b', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        error: 'Filename is required'
      });
    }

    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Read and parse PDF
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    // Extract sections from the text
    const sections = extractResumeSections(pdfData.text);
    
    res.json({
      message: 'Resume parsed successfully',
      filename: filename,
      sections: sections,
      metadata: {
        totalPages: pdfData.numpages,
        totalText: pdfData.text.length
      }
    });
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({
      error: 'Failed to parse PDF',
      details: error.message
    });
  }
});

// Utility: Fill template with data (same logic as client)
function fillResumeTemplate(template, data) {
  if (!template || typeof template !== 'string') return '';
  if (!data || typeof data !== 'object') return template;
  const placeholders = ['summary', 'experience', 'education', 'skills', 'projects'];
  let filled = template;
  placeholders.forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    filled = filled.replace(regex, data[key] || '');
  });
  return filled;
}

// GET /download-resume: Generate PDF from HTML and send as download
app.get('/download-resume', async (req, res) => {
  try {
    // Example: You may want to get data/template from request or DB
    // For now, use hardcoded sample data and template
    const resumeData = {
      summary: 'Experienced software engineer with a passion for building scalable web applications.',
      experience: 'Software Engineer at XYZ Corp (2020-2023)\n- Developed full-stack web apps\n- Led a team of 5 engineers',
      education: 'B.Sc. in Computer Science, ABC University, 2016-2020',
      skills: 'JavaScript, React, Node.js, Express, MongoDB, TailwindCSS',
      projects: 'Project A: E-commerce platform\nProject B: Real-time chat app'
    };
    // HTML template (could be loaded from file or DB)
    const template = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Resume</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body class="bg-gray-100">
          <div class="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8 my-8">
            <section class="mb-8">
              <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Summary</h2>
              <p class="text-gray-700">{{summary}}</p>
            </section>
            <section class="mb-8">
              <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Experience</h2>
              <div class="text-gray-700 whitespace-pre-line">{{experience}}</div>
            </section>
            <section class="mb-8">
              <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Education</h2>
              <div class="text-gray-700 whitespace-pre-line">{{education}}</div>
            </section>
            <section class="mb-8">
              <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Skills</h2>
              <div class="text-gray-700 whitespace-pre-line">{{skills}}</div>
            </section>
            <section>
              <h2 class="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Projects</h2>
              <div class="text-gray-700 whitespace-pre-line">{{projects}}</div>
            </section>
          </div>
        </body>
      </html>
    `;
    const html = fillResumeTemplate(template, resumeData);
    const pdfPath = path.join(outputDir, 'final_resume.pdf');

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    await browser.close();

    // Send PDF as download
    res.download(pdfPath, 'final_resume.pdf');
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate or send PDF', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`CORS enabled for http://localhost:5173`);
});
