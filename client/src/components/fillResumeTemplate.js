// Utility to fill resume template placeholders with actual data
// Usage: fillResumeTemplate(templateString, resumeData)

function fillResumeTemplate(template, data) {
  if (!template || typeof template !== 'string') return '';
  if (!data || typeof data !== 'object') return template;

  // List of supported placeholders
  const placeholders = ['summary', 'experience', 'education', 'skills', 'projects'];

  let filled = template;
  placeholders.forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    filled = filled.replace(regex, data[key] || '');
  });

  return filled;
}

export default fillResumeTemplate; 