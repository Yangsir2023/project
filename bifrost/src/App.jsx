import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper function to handle API calls with Timeout and Retry
const fetchWithRetry = async (model, prompt, maxRetries = 3, timeoutMs = 15000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API Request Timeout')), timeoutMs);
      });

      const resultPromise = model.generateContent(prompt);
      
      // Race between the API call and the timeout
      const result = await Promise.race([resultPromise, timeoutPromise]);
      return result;
    } catch (err) {
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts. Last error: ${err.message}`);
      }
      // Wait before retrying (exponential backoff could be used, simple delay here)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

function App() {
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Setup listener for WebView errors
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'WEBVIEW_ERROR') {
        setError(`WebView Rendering Error: ${event.data.message}`);
        setLoading(false); // Make sure to stop loading if an error occurs during render
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

      // Use the retry and timeout wrapper
      const result = await fetchWithRetry(model, prompt, 3, 15000);
      const response = await result.response;
      let text = response.text();
      
      // Remove any markdown code blocks if the model still returns them
      text = text.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
      
      // Inject error capture script into the generated HTML
      const errorCaptureScript = `
        <script>
          window.onerror = function(message, source, lineno, colno, error) {
            window.parent.postMessage({ type: 'WEBVIEW_ERROR', message: message }, '*');
            return true;
          };
          window.addEventListener('unhandledrejection', function(event) {
            window.parent.postMessage({ type: 'WEBVIEW_ERROR', message: event.reason }, '*');
          });
        </script>
      `;
      
      const finalHTML = errorCaptureScript + text;
      setCode(finalHTML);
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
      <div className="right-pane" style={{ position: 'relative' }}>
        {loading && (
          <div className="loading-overlay" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 10, flexDirection: 'column'
          }}>
            <div className="spinner" style={{
              width: '40px', height: '40px', border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db', borderRadius: '50%',
              animation: 'spin 1s linear infinite', marginBottom: '10px'
            }}></div>
            <style>{`
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
            <div>Generating and Rendering UI...</div>
          </div>
        )}
        
        {error ? (
          <div className="error-text" style={{ color: '#d32f2f', padding: '20px', backgroundColor: '#ffebee', borderRadius: '4px', margin: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Error</h3>
            <p>{error}</p>
          </div>
        ) : code ? (
          <iframe 
            key={code.length + Date.now()}
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
