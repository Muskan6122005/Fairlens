# 🔍 FairLens — AI Bias Detection Platform

> Your AI Is Biased. We Can Prove It.

FairLens is a premium, cyberpunk-themed AI bias detection platform that scans datasets and exposes hidden discrimination in 30 seconds.

---

## 🚀 Quick Start

### Step 1: Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Run the Backend

```bash
cd backend
python app.py
```

The Flask server will start at `http://localhost:5000`

### Step 3: Open the Frontend

Open `frontend/index.html` in your browser, or use a simple local server:

```bash
cd frontend
python -m http.server 8080
```

Then visit `http://localhost:8080`

---

## 📁 Folder Structure

```
FairLens/
├── frontend/
│   ├── index.html       ← Landing Page
│   ├── scan.html        ← Main Scanner + Results
│   ├── reports.html     ← Saved Reports
│   ├── about.html       ← About Page
│   ├── css/
│   │   └── style.css    ← All styles
│   └── js/
│       └── main.js      ← All JS logic + animations
├── backend/
│   ├── app.py           ← Flask API server
│   ├── bias_detector.py ← Bias analysis engine
│   └── requirements.txt ← Python deps
└── README.md
```

---

## 🎨 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Charts | Chart.js (CDN) |
| Animations | Pure CSS + JS |
| Backend | Python Flask |
| Data Processing | Pandas + NumPy |
| ML | scikit-learn |

---

## ⚖️ Disclaimer

FairLens is an educational and analytical tool. The "AI Lawyer" panel is NOT legal advice.
