require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview' });

async function testAPI() {
  try {
    const prompt = "Generate HTML code for a red button, return only the code without any explanatory text";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const code = response.text();
    
    console.log('✅ API call successful!');
    console.log(code);
  } catch (err) {
    console.error('❌ API call failed:', err);
  }
}
testAPI();