import React from 'react';

const Resume = () => {
  return (
    <div style={{ height: '100vh', width: '100%', paddingTop: '60px' }}>
      <iframe
        src="/Resume.pdf"
        title="Resume PDF"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  );
};

export default Resume;
