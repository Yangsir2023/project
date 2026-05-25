import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

function App() {
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateCode = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const modelName = import.meta.env.VITE_GEMINI_MODEL;
      
      if (!apiKey || !modelName) {
        throw new Error('API Key or Model is not configured in .env');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `Generate pure HTML code for the following request. Return ONLY the code, no markdown formatting, no explanations, no \`\`\`html tags. Request: ${input}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Remove any markdown code blocks if the model still returns them
      text = text.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
      
      setCode(text);
    } catch (err) {
      setError(err.message || 'An error occurred during generation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="left-pane">
        <textarea 
          className="code-input" 
          placeholder="Enter your input here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button 
          className="generate-btn" 
          onClick={generateCode} 
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Code'}
        </button>
      </div>
      <div className="right-pane">
        {error ? (
          <div className="error-text" style={{ color: 'red', padding: '20px' }}>
            Error: {error}
          </div>
        ) : code ? (
          <iframe 
            srcDoc={code} 
            title="Preview" 
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <div className="placeholder-text">WebView Preview Area</div>
        )}
      </div>
    </div>
  );
}

export default App;
