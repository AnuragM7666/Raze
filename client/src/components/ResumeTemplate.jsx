import React from 'react';

const ResumeTemplate = () => {
  return (
    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8 my-8">
      {/* Summary Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Summary</h2>
        <p className="text-gray-700">{{summary}}</p>
      </section>

      {/* Experience Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Experience</h2>
        <div className="text-gray-700 whitespace-pre-line">{{experience}}</div>
      </section>

      {/* Education Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Education</h2>
        <div className="text-gray-700 whitespace-pre-line">{{education}}</div>
      </section>

      {/* Skills Section */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Skills</h2>
        <div className="text-gray-700 whitespace-pre-line">{{skills}}</div>
      </section>

      {/* Projects Section */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Projects</h2>
        <div className="text-gray-700 whitespace-pre-line">{{projects}}</div>
      </section>
    </div>
  );
};

export default ResumeTemplate; 