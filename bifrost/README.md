# Bifrost

Electron + Vite + React project with Gemini API integration.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-3.1-pro-preview
   ```

3. Start the project:
   ```bash
   npm run dev
   ```

## Test Gemini API
You can test the Gemini API call by running:
```bash
node test-api.js