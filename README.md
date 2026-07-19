# PitchForge AI 🚀

**From idea to investor-ready deck in seconds.**

PitchForge is an AI-powered business pitch deck generator that transforms a simple business idea into a complete, professional pitch deck. It asks smart clarifying questions like a real business consultant, then generates a personalized deck with SWOT analysis, financials, competitor analysis, and more — exportable as PDF or PowerPoint.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3%2070B-F55036)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black)

---

## ✨ Features

### 🤖 Conversational AI Flow
- **Chat-style interface** — describe your idea like talking to a consultant
- **7 smart clarifying questions** — AI asks about budget, location, target audience, USP, revenue model, and more before generating
- **Gibberish detection** — validates that the input is a real business idea
- **Editable answers** — change any answer and regenerate instantly

### ⚡ Real-Time Generation
- **Streaming preview** — watch your deck build section-by-section as the AI generates (like ChatGPT)
- **Auto-verification** — every deck is checked for completeness; missing fields trigger an automatic retry
- **~5-8 second generation** powered by Groq's ultra-fast LLaMA 3.3 70B inference

### 📊 Complete Pitch Deck Content
- Problem & Solution analysis
- Target audience & market size (in simple language — no confusing jargon)
- Business model with INR pricing
- Location-specific competitor analysis
- SWOT analysis
- Financial projections matched to your actual budget
- Go-to-market strategy
- Business concept validation with viability scores
- Improvement suggestions
- Similar successful startup examples

### ✏️ Full Editing Suite
- **Drag & drop** section reordering
- **Inline text editing** on every section
- **Undo** support (up to 10 steps)
- **Autosave** — edits sync to the cloud automatically

### 📤 Export & Share
- **PDF export** — 10-page professionally designed presentation
- **PPTX export** — native PowerPoint file
- **Cloud storage** — every export is saved to the cloud (My Exports) for re-download from any device
- **Shareable links** — generate a public URL anyone can view without login

### 🎨 Personalization
- 4 design themes (Olive, Navy, Crimson, Midnight) applied across UI and exports
- 4 tones (Persuasive, Formal, Visionary, Technical)
- 4 deck types (Investor, Academic, Internal, Partnership)

### 👤 User System
- Google Sign-In via Firebase Auth
- Per-user chat history synced across devices (MongoDB)
- User profiles with usage stats (PostgreSQL)
- In-progress chats resume after closing the tab

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | FastAPI (Python) |
| AI Model | Groq — LLaMA 3.3 70B (streaming) |
| Deck Storage | MongoDB Atlas |
| User Profiles | PostgreSQL (Supabase) |
| File Storage | Supabase Storage |
| Authentication | Firebase Auth (Google) |
| PDF Export | jsPDF |
| PPTX Export | PptxGenJS |
| Drag & Drop | dnd-kit |

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   React     │────▶│   FastAPI    │────▶│  Groq LLaMA 3.3 │
│  (Vite)     │◀────│   Backend    │◀────│  (streaming)    │
└─────┬───────┘     └──────┬───────┘     └─────────────────┘
      │                    │
      │             ┌──────┴────────┬──────────────┐
      │             ▼               ▼              ▼
┌─────▼──────┐ ┌─────────┐  ┌────────────┐ ┌───────────┐
│  Firebase  │ │ MongoDB │  │ PostgreSQL │ │ Supabase  │
│    Auth    │ │ (decks) │  │ (profiles) │ │ (storage) │
└────────────┘ └─────────┘  └────────────┘ └───────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Free accounts: [Groq](https://console.groq.com), [MongoDB Atlas](https://cloud.mongodb.com), [Supabase](https://supabase.com), [Firebase](https://console.firebase.google.com)

### 1. Clone the repo
```bash
git clone https://github.com/vibin12363/Pitchforge.git
cd Pitchforge
```

### 2. Backend setup
```bash
cd backend
pip install fastapi uvicorn groq python-dotenv motor databases asyncpg supabase
```

Create `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key
MONGODB_URL=your_mongodb_atlas_connection_string
SUPABASE_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres
SUPABASE_PROJECT_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

Create the PostgreSQL table (Supabase SQL Editor):
```sql
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  plan TEXT DEFAULT 'free',
  decks_generated INTEGER DEFAULT 0,
  last_login TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::jsonb
);
```

Create a public Supabase Storage bucket named `exports`.

Run the backend:
```bash
uvicorn main:app --reload
```

### 3. Frontend setup
```bash
npm install
```

Update `src/firebase.js` with your Firebase project config, then:
```bash
npm run dev
```

Open **http://localhost:5173** 🎉

---

## 📖 How It Works

1. **Describe your idea** — e.g. *"A food delivery app for college students in Tamil Nadu"*
2. **Answer 7 smart questions** — budget, location, audience, USP, revenue model, business-specific details, timeline
3. **Pick tone & deck type** — via chat buttons
4. **Watch it generate live** — sections stream in real-time
5. **Edit anything** — drag to reorder, click ✎ to edit text, undo mistakes
6. **Export & share** — PDF, PPTX, or a public link

---

## 🔒 Security

- Secrets kept in `.env` (never committed)
- HTTPS encryption in transit; MongoDB Atlas & Supabase encryption at rest
- Share links use unguessable random IDs
- No user IP addresses stored

---

## 🗺️ Roadmap

- [ ] CI/CD deployment (Vercel + Render)
- [ ] Web-search API integration for real-time competitor validation
- [ ] Drag order reflected in PDF/PPTX exports
- [ ] Premium plans with usage limits
- [ ] Team collaboration on decks

---

## 👨‍💻 Author

**Vibin** — B.E. Computer Science Engineering  
Built during internship at OneYes InfoTech Solutions, Chennai

---

## 📄 License

This project is for educational and portfolio purposes.
