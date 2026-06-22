# Bifrost

Electron + Vite + React project with Gemini API integration.

## Setup

1. Enter the project directory:
   ```bash
   cd bifrost
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the `bifrost` directory and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   VITE_GEMINI_MODEL=gemini-3.1-pro-preview
   ```

4. Start the project:
   ```bash
   npm run dev
   ```
   *(Tested and verified to run successfully on Vite + React environment)*

## Test Gemini API
You can test the Gemini API call by running:
```bash
node test-api.js