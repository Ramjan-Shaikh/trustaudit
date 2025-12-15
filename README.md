# TrustAudit++

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Python](https://img.shields.io/badge/python-3.10+-blue.svg) ![React](https://img.shields.io/badge/react-18+-61DAFB.svg) ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)

**TrustAudit++** is a next-generation AI assistant that combines **conversational intelligence** with **automated auditing** and **graph-based memory**. Unlike standard chatbots, every response in TrustAudit++ is rigorously reviewed by an "Auditor" agent to ensure accuracy and safety, while a persistent knowledge graph enables the system to remember and evolve over time.

---

## 🚀 Key Features

- **🛡️ Audited Responses**: Every answer is checked by a secondary AI (Auditor) for factual accuracy and safety before (or after) being shown.
- **🔄 Self-Correction Loop**: If the Auditor detects issues (low confidence), the system automatically triggers a refinement loop to improve the answer.
- **🧠 Graph Memory**: Converting linear chat history into a structured Knowledge Graph (Nodes & Edges) for better context retrieval and long-term memory.
- **� Interactive Graph Explorer**: Visualizes the agent's memory using React Flow, allowing users to inspect and edit the knowledge base.
- **💬 Full-Stack Chat Interface**: A modern, responsive UI built with React, Tailwind CSS, and Framer Motion.

---

## 🏗️ Architecture

TrustAudit++ employs a multi-agent architecture orchestrated by a FastAPI backend.

### Core Workflows

1.  **Executor Agent**: Handles the user's prompt and generates an initial response.  
    ![Executor Flowchart](algorithm_1_executor_flowchart_1764842197718.png)

2.  **Auditor Agent**: Reviews the Executor's response, assigning a verdict and confidence score.  
    ![Auditor Flowchart](algorithm_2_auditor_flowchart_1764842223081.png)

3.  **Refinement Loop**: If the audit confidence is low, the Executor retries with feedback.  
    ![Refinement Loop](algorithm_3_refinement_flowchart_1764842253651.png)

4.  **Context Search**: Retrieves relevant past interactions from the Graph Memory.  
    ![Context Search](algorithm_4_context_search_flowchart_1764842287166.png)

---

## 🛠️ Tech Stack

### Backend
-   **Framework**: FastAPI (Python)
-   **Database**: SQLAlchemy (SQLite for dev, Postgres compatible)
-   **Graph Logic**: NetworkX (In-memory fallback) / SQL Persistence
-   **AI Integration**: Google Gemini API (or other LLMs)

### Frontend
-   **Framework**: React (Create React App)
-   **Styling**: Tailwind CSS
-   **Animations**: Framer Motion
-   **Visualization**: React Flow (Graph visualization)

---

## 📦 Project Structure

```text
trustauditpp/
├── backend/                # FastAPI Application
│   ├── agents/             # Executor & Auditor Agent Logic
│   ├── memory/             # Graph Memory Implementation
│   ├── models/             # Pydantic Schemas
│   └── main.py             # API Entry Point
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/     # Chat, Graph, & UI Components
│   │   └── services/       # API Clients
│   └── public/
├── algorithm_*.png         # Architecture Diagrams
└── README.md               # Project Documentation
```

---

## 🏁 Getting Started

### Prerequisites
-   **Python 3.10+**
-   **Node.js 18+**
-   **Google Gemini API Key** (for AI features)

### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# Activate Virtual Environment
# Windows:
.venv\Scripts\activate
# Mac/Linux:
# source .venv/bin/activate

pip install -r requirements.txt

# Create .env file
cp ../env.example .env  # Or copy manually
# Edit .env to add your GEMINI_API_KEY and SECRET_KEY
```

**Run the Server:**
```bash
uvicorn main:app --reload
```
*API runs at `http://127.0.0.1:8000`*

### 2. Frontend Setup

```bash
cd frontend
npm install
```

**Run the Client:**
```bash
npm start
```
*App runs at `http://localhost:3000`*

---

## 🔒 Security Note
Ensure `.env`, `trustaudit.db`, and log files are **never committed**. The `.gitignore` is set up to exclude these, but always double-check before pushing.

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

