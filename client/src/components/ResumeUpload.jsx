import { useState } from 'react';

const ResumeUpload = () => {
  const [resumeA, setResumeA] = useState(null);
  const [resumeB, setResumeB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [showDownload, setShowDownload] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (type === 'A') {
      setResumeA(file);
    } else {
      setResumeB(file);
    }
    // Clear any previous messages when files are selected
    setMessage('');
    setMessageType('');
    setShowDownload(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!resumeA || !resumeB) {
      setMessage('Please select both Resume A and Resume B files');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');
    setShowDownload(false);

    try {
      const formData = new FormData();
      formData.append('resumeA', resumeA);
      formData.append('resumeB', resumeB);

      const response = await fetch('http://localhost:5000/upload-resumes', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Resumes uploaded successfully!');
        setMessageType('success');
        // Reset form
        setResumeA(null);
        setResumeB(null);
        // Reset file inputs
        document.getElementById('resumeA').value = '';
        document.getElementById('resumeB').value = '';
        setShowDownload(true);
      } else {
        setMessage(result.error || 'Failed to upload resumes');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Network error. Please check if the server is running.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch('http://localhost:5000/download-resume', {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to download PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'final_resume.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage('Failed to download PDF.');
      setMessageType('error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Upload Resumes
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Resume A Input */}
        <div>
          <label htmlFor="resumeA" className="block text-sm font-medium text-gray-700 mb-2">
            Resume A
          </label>
          <input
            type="file"
            id="resumeA"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => handleFileChange(e, 'A')}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md cursor-pointer"
            disabled={loading}
          />
          {resumeA && (
            <p className="mt-1 text-sm text-green-600">
              Selected: {resumeA.name}
            </p>
          )}
        </div>

        {/* Resume B Input */}
        <div>
          <label htmlFor="resumeB" className="block text-sm font-medium text-gray-700 mb-2">
            Resume B
          </label>
          <input
            type="file"
            id="resumeB"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => handleFileChange(e, 'B')}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md cursor-pointer"
            disabled={loading}
          />
          {resumeB && (
            <p className="mt-1 text-sm text-green-600">
              Selected: {resumeB.name}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !resumeA || !resumeB}
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
            loading || !resumeA || !resumeB
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </div>
          ) : (
            'Upload Resumes'
          )}
        </button>

        {/* Download Resume Button */}
        {showDownload && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors mt-2 ${
              downloading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
            }`}
          >
            {downloading ? 'Preparing PDF...' : 'Download Resume'}
          </button>
        )}

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-md ${
            messageType === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {messageType === 'success' ? (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message}</p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ResumeUpload;
