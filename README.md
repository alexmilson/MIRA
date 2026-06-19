# MIRA – Medical Intelligence Robotic Automation

> A health prediction application built as part of a Junior AI/ML Developer assessment.

## Live Demo

Deployed on GitHub Pages → **https://alexmilson.github.io/MIRA/**

---

## Features

| Feature | Details |
|---|---|
| **CRUD** | Create, Read, Update, Delete patient records |
| **AI Analysis** | Hybrid engine: clinical rule engine + HuggingFace BART zero-shot classification |
| **Persistent Storage** | localStorage (no backend needed, works 100% client-side) |
| **Data Validation** | Email format, future-date guard, numeric blood values |
| **Responsive UI** | Works on desktop and mobile |
| **No API keys** | Uses HuggingFace free inference API (no auth) with offline fallback |

---

## Fields Collected

- Full Name
- Date of Birth
- Email Address
- Glucose (mg/dL)
- Haemoglobin (g/dL)
- Cholesterol (mg/dL)
- **AI Remarks** (auto-generated)

---

## AI / ML Architecture

```
Patient Blood Values
       │
       ▼
┌──────────────────────────────┐
│  Clinical Rule Engine        │  ← Always runs (offline-safe)
│  Evidence-based thresholds   │
│  WHO / ADA clinical ranges   │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  HuggingFace BART-MNLI       │  ← Zero-shot classification
│  facebook/bart-large-mnli    │    (free, no API key needed)
│  5s timeout → graceful skip  │
└──────────┬───────────────────┘
           │
     Weighted blend (60/40)
           │
           ▼
     Risk Level + Remarks
  (HIGH / MODERATE / LOW / NORMAL)
```

### Clinical Reference Ranges Used

| Marker | Normal | Borderline | High Risk |
|---|---|---|---|
| Glucose (fasting) | 70–100 mg/dL | 101–125 mg/dL | ≥126 mg/dL |
| Haemoglobin | 12–17.5 g/dL | 10–12 g/dL | <10 g/dL |
| Cholesterol | <200 mg/dL | 200–239 mg/dL | ≥240 mg/dL |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES2020) |
| Storage | `localStorage` (browser-native) |
| AI/ML | HuggingFace Inference API + clinical rule engine |
| Hosting | GitHub Pages (static, no server needed) |
| Fonts | Google Fonts (Inter + JetBrains Mono) |

**Why this stack?**
- Zero setup cost — no server, no database, no API keys
- Deployable on GitHub Pages in one click
- Pure JS ensures the app works offline via the rule engine
- HuggingFace free tier provides real ML enrichment without credentials

---

## Project Structure

```
mira/
├── index.html          # Single-page app shell
├── css/
│   └── styles.css      # All styles (clinical dark theme)
├── js/
│   ├── db.js           # localStorage CRUD layer
│   ├── ai.js           # AI prediction engine (rules + HuggingFace)
│   └── app.js          # UI controller (routing, forms, table)
└── README.md
```

---

## Deploy to GitHub Pages

1. Create a new repository on GitHub (e.g. `mira`)
2. Upload all files maintaining the folder structure
3. Go to **Settings → Pages → Source: Deploy from branch → main / root**
4. Your app is live at `https://<your-username>.github.io/mira/`

---

## Run Locally

```bash
# Option 1 – just open in browser
open index.html

# Option 2 – serve locally
npx serve .
# or
python3 -m http.server 8080
```

---

## Challenges & Design Decisions

- **No API key constraint**: Solved by using HuggingFace's free public inference endpoint with a robust offline fallback so the app never breaks.
- **Clinical accuracy**: The rule engine uses WHO/ADA-aligned thresholds rather than arbitrary cutoffs, making the health flags medically grounded.
- **UX**: Dark clinical aesthetic communicates seriousness and professionalism appropriate for a healthcare platform.

---

> ⚠️ **Disclaimer**: MIRA is a demonstration application. AI-generated health remarks are not a substitute for professional medical advice. Always consult a qualified healthcare provider for clinical decisions.
