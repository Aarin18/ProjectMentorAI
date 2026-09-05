# ProjectMentor AI

A Project Intelligence & Feasibility Engine for final-year students. Generate, score, and select technical project ideas based on your skills and career goals, then receive a step-by-step mentor roadmap to build it.

## Features

- **Profile-Based Idea Generation**: Uses the Google Gemini API to produce 3-5 tailored candidate project ideas.
- **Deterministic Scoring Engine**: Locally scores each idea based on Skill Match, Feasibility, Innovation, Career Value, and Technical Depth.
- **Mentor Roadmap Generation**: Select an idea and generate a phase-by-phase execution roadmap.
- **Privacy-First**: 100% client-side. The API key and profile data are stored only in your browser's `localStorage` and never sent to a backend database.

## Architecture & Tech Stack

- **Tech Stack**: Vanilla HTML5, CSS3, JavaScript ES6+
- **External Dependencies**: Google Gemini API via client-side fetch (no external libraries like React or Node.js backends).
- **Hosting**: Designed as a static website, fully deployable to GitHub Pages, Netlify, or Vercel.

## File Structure

```
├── index.html         # Main entry point with the semantic layout and app shell
├── css/
│   └── style.css      # Design tokens and layout classes
└── js/
    ├── api.js         # Handles Gemini API fetch calls and strict JSON parsing
    ├── scoring.js     # Deterministic scoring engine
    ├── storage.js     # Helpers for reading/writing localStorage
    ├── ui.js          # Ties DOM events, state, and modules together
    └── validation.js  # Data validation rules
```

## How to Run Locally

Because this project uses ES6 Modules, you must run it through a local web server (opening `index.html` directly in the browser will result in CORS errors).

**Option 1: Using Python**
1. Open your terminal and navigate to the project folder.
2. Run `python -m http.server 8000` (or `python3 -m http.server 8000`).
3. Open your browser to `http://localhost:8000`.

**Option 2: Using Node.js**
1. Open your terminal and navigate to the project folder.
2. Run `npx serve`.
3. Open the `localhost` URL provided in the terminal.

## How to Add Your Gemini API Key

1. Open the website in your browser.
2. In the **Your Profile** section at the top, locate the **Gemini API Key** field.
3. Paste your valid Google Gemini API key.
4. Fill out the rest of the profile and click "Generate Project Ideas."
5. The API key is securely saved in your browser's `localStorage` (as `projectmentor_api_key`) and automatically used for future requests.

## How to Deploy

The application is completely static, making it trivial to deploy for free.

**Using Netlify (Easiest)**
1. Go to [Netlify Drop](https://app.netlify.com/drop).
2. Drag and drop the `ProjectMentorAI` folder onto the page.

**Using GitHub Pages**
1. Initialize a git repository: `git init`, `git add .`, `git commit -m "Initial commit"`.
2. Push the code to a new public repository on GitHub.
3. Go to **Settings > Pages** in your GitHub repo.
4. Under **Build and deployment**, select **Deploy from a branch** and choose the `main` branch.
5. Click **Save** to publish.
