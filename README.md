# 🚀 AI Resume Analyzer

<div align="center">

![Resume Analyzer Banner](https://img.shields.io/badge/AI%20Powered-Resume%20Analyzer-blue?style=for-the-badge&logo=openai)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![Clerk](https://img.shields.io/badge/Auth-Clerk-purple?style=for-the-badge&logo=clerk)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green?style=for-the-badge&logo=openai)
![MongoDB](https://img.shields.io/badge/MongoDB-Native-green?style=for-the-badge&logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-BullMQ-red?style=for-the-badge&logo=redis)
![Qdrant](https://img.shields.io/badge/Vector%20DB-Qdrant-red?style=for-the-badge&logo=qdrant)

**An intelligent, scalable, agent-powered resume analysis tool that helps job seekers optimize their resumes for ATS systems using both strict keyword matching and advanced Semantic Vector Search.**

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Development Phases (What's Done)](#-development-phases)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)

---

## 🌟 Overview

The **AI Resume Analyzer** is an advanced full-stack web application designed to evaluate resumes against job descriptions just like modern Applicant Tracking Systems (ATS) do. 

Originally built as a monolithic Next.js app, it has been aggressively upgraded into a scalable microservice-like architecture featuring a detached background worker queue (Redis + BullMQ) for heavy AI processing, real-time WebSocket progress updates, native MongoDB persistence, and advanced **Semantic Meaning matching** via Hugging Face embeddings and Qdrant Vector DB.

---

## 🚀 Development Phases

We've completed 4 major architectural phases:

### Phase 1: Persistence & Stability
- Replaced Prisma with the native `mongodb` driver for scalable storage.
- Implemented persistent analysis history (saved to the database, accessible via `/history`).
- Solved hydration mismatches and UI cache staleness.

### Phase 2: Decoupling & Queuing
- Offloaded heavy AI processing (OpenAI) to a standalone Node.js/Express background worker (`backend/`).
- Integrated **BullMQ** and **Redis** to queue processing jobs and prevent server timeouts.
- Implemented **Socket.io** to stream real-time progress updates (e.g., 10%, 40%, 95%) back to the Next.js frontend during analysis.

### Phase 3: OCR Engine *(Skipped for now)*
- Deferred implementation of Tesseract.js / PDF.js to focus on core AI capabilities.

### Phase 4: Semantic Vector Search
- Augmented strict OpenAI keyword matching with **Semantic Similarity**.
- Integrated the `@xenova/transformers` library (via Hugging Face Inference API) to generate 384-dimensional embeddings of the resume and job description.
- Integrated **Qdrant Cloud** to upsert and query vector embeddings natively, capturing the *meaning* of the resume text rather than just verbatim keyword hits.

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🎯 **Dual Job Match Scoring** | Get both an exact **Keyword Match Score** (OpenAI) and a **Semantic Meaning Score** (Hugging Face + Qdrant). |
| ⚡ **Real-time Processing** | See live progress bars as your resume is chunked, embedded, vectorized, and analyzed via Socket.io. |
| 🔑 **Keyword Analysis** | Identifies exact matching and missing keywords between your resume and the job description. |
| 🤖 **ATS Compatibility Check** | Detects missing sections (Experience, Education, Contact Info) that legacy ATS systems require. |
| 📖 **Readability Score** | Computes a Flesch-Kincaid grade level to measure writing clarity. |
| ✍️ **Grammar Analysis** | AI-powered grammar and professionalism review of resume content. |
| 💡 **Action Verb Feedback** | Identifies weak bullet points and suggests stronger action verbs. |
| 🔐 **Secure Authentication** | Clerk-based sign-in/sign-out with protected API routes. |
| 💾 **Analysis History** | All past analyses are saved natively in MongoDB for future review. |

---

## 🏗 Architecture

The app is decoupled into two primary services that run concurrently:

**1. Frontend API (Next.js - Port 3000)**
- Handles user Authentication (Clerk).
- Parses the PDF text directly in the browser/Next.js API route.
- Submits an "AnalyzeJob" to the Redis Queue.
- Renders the UI and connects via Socket.io to listen for queue updates.

**2. Background Worker (Express - Port 3001)**
- Picks up jobs from Redis via BullMQ.
- Chunks the resume and sends to Hugging Face API for vector embeddings.
- Upserts vectors and queries the Qdrant DB for semantic overlap.
- Prompts GPT-4o for strict formatting, action verb feedback, and grammar issues.
- Emits real-time progress events over WebSockets back to Port 3000.
- Saves the final aggregated result to MongoDB.

---

## 🛠 Tech Stack

| Domain | Technology |
|-----------|---------|
| **Frontend** | Next.js 15.x (App Router), React 19.x, Tailwind CSS, Lucide Icons |
| **Backend** | Express.js, Socket.io, BullMQ |
| **AI & ML** | OpenAI API (GPT-4o), Hugging Face Inference API (`all-MiniLM-L6-v2`) |
| **Databases** | MongoDB (Document Storage), Redis (Message Broker), Qdrant (Vector DB) |
| **Authentication** | Clerk |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- API Keys for **OpenAI**, **Clerk**, and **Hugging Face**
- A **MongoDB** instance (Local or Atlas)
- A **Redis** instance (Local Docker or Upstash)
- A **Qdrant** cluster (Local Docker or Qdrant Cloud)

### Installation

```bash
git clone https://github.com/your-username/resume-analyzer.git
cd resume-analyzer
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# OpenAI
OPENAI_API_KEY="sk-..."

# MongoDB
DATABASE_URL="mongodb://localhost:27017/resume-analyzer"

# Redis (BullMQ Queue)
REDIS_URL="redis://localhost:6379"

# Hugging Face (Embeddings)
HUGGINGFACE_API_KEY="hf_..."

# Qdrant Vector DB
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""
```

*Note: If you want to run Redis and Qdrant locally via Docker, simply run `docker-compose up -d` using the included `docker-compose.yml` file.*

### Running the Application

To run the Next.js frontend and the Express background worker concurrently:

```bash
npm run dev:all
```

- Next.js will run on `http://localhost:3000`
- The Worker / WebSocket server will run on `http://localhost:3001`

**Production Build:**

```bash
# Builds both Next.js and the Express server
npm run build 

# Run the production app
# Note: In production, you must run both the Next.js server and the Node server
npm run start
```

---

<div align="center">
Built as part of the **30-Day AI Challenge**
</div>
