# ProjectMentor AI

A Project Intelligence & Feasibility Engine for final-year students. Submit your profile and receive a structured feasibility analysis, technical recommendations, risks, mentor advice, and a practical roadmap.

## Features

- **Profile-Based Analysis**: Uses Gemini to return a structured feasibility analysis for the submitted project profile.
- **Server-Side Gemini Integration**: The official `@google/genai` SDK is used only by the backend.
- **Privacy-First**: Profile data is only sent to the backend for analysis. The API key is stored securely on the server and never exposed to the frontend.

## Architecture & Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js Express server
- **External Dependencies**: Google Gemini API via the server-side `@google/genai` SDK.

## File Structure

```
├── index.html         # Main entry point with the semantic layout and app shell
├── server.js          # Express backend server interacting with Gemini
├── package.json       # Node.js dependencies
├── .env.example       # Example environment variables file
├── css/
│   └── style.css      # Design tokens and layout classes
└── js/
    ├── api.js         # Handles backend API fetch calls
    ├── scoring.js     # Deterministic scoring engine
    ├── storage.js     # Helpers for reading/writing localStorage
    ├── ui.js          # Ties DOM events, state, and modules together
    └── validation.js  # Data validation rules
```

## How to Run Locally

1. Open your terminal and navigate to the project folder.
2. Install dependencies: `npm install`
3. Create a `.env` file in the root directory based on `.env.example`:
   ```
    GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Start the server: `npm start`
5. Open your browser to `http://localhost:3000`.

## How to Add Your Gemini API Key

The Gemini API key is securely managed on the server side.

**For Local Development:**
Add your key to the `.env` file:
`GEMINI_API_KEY=your_gemini_api_key_here`

**For Deployment:**
Configure `GEMINI_API_KEY` as a secret/environment variable in your hosting provider's dashboard (e.g., Vercel, Render, Heroku).

## How to Deploy

The application now requires a Node.js runtime.

**Using Render / Heroku / Vercel**
1. Push your repository to GitHub.
2. Connect the repository to your hosting provider.
3. Add the `GEMINI_API_KEY` to the environment variables/secrets section.
4. Deploy the application.
