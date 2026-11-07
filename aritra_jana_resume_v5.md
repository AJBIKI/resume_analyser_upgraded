## Aritra Jana

## Summary

Full Stack Developer specializing in distributed AI systems and LLM integrations. Builds production-grade applications with async job pipelines (BullMQ/Redis), real-time WebSocket architecture, hybrid RAG retrieval, and vector databases. Focused on AI Engineer and GenAI Developer roles at product-led startups.

## Education

Netaji Subhas Engineering College

B.Tech – Information Technology | CGPA: 7.1

Kakdwip Birendra Vidyaniketan (WBCHSE)

Higher Secondary | 93%

## Projects

AI Systems Engineer – AetherOS GitHub [URL 🔗](https://github.com/AJBIKI/AetherOS)

Independent Project | TypeScript, Node.js, Qdrant, HuggingFace, Ollama, ONNX, tRPC

- Reduced Qdrant vector DB memory usage by 85% via a decoupled storage layout offloading raw chunk text from vector payloads to a disk-based sidecar file system.

- Engineered a hybrid search pipeline executing dense + sparse vector queries in parallel with RRF fusion and ONNX cross-encoder reranking (ms-marco-MiniLM) in sub-150ms.

- Built AST-driven Markdown ingestion using unified/remark, extracting heading trees and YAML front-matter to construct hierarchical chunks, improving retrieval relevancy by 25%.

- Architected dual local/cloud execution engine: Ollama for private local inference, OpenAI Responses API with Economy/Balanced token budgeting cutting cloud costs by 60%.

- Offloaded TF-IDF IDF recalculation to Node.js Worker Threads, keeping the event loop non-blocking during batch imports.

Jan 2024 – Present

- Solved Vercel's 10–15s serverless timeout by architecting a decoupled BullMQ/Redis job queue; API responds in sub-10ms while a persistent Express worker handles 30–90s AI processing asynchronously.

- Built a 6-stage deterministic pipeline: text normalization, JD intelligence extraction, resume mapping, semantic chunking, vector scoring (Qdrant + HuggingFace all-MiniLM-L6-v2), and GPT-4o synthesis.

- Implemented SHA-256 content-addressable JD cache in MongoDB Atlas, eliminating redundant LLM calls and saving ~\$0.02 per duplicate job description analysis.

- Secured WebSocket rooms with a 3-Guard model: Clerk JWT verification, BullMQ job existence check, and user ownership matching – preventing unauthorized result access.

Jun 2023 – Dec 2023

- Built a server-first CMS replacing REST endpoints with direct Mongoose queries in Server Components and consolidating all CRUD into a single Next.js Server Actions layer.

- Implemented event-driven ISR via a revalidation webhook delivering static speed with real-time content updates; improved Core Web Vitals (LCP/CLS) via Cloudinary blur-up image optimization.

Kolkata, WB

2022 – 2026

West Bengal

2021

Aug 2024 – Present

## Full Stack AI Developer – Resume Analyzer Live | GitHub [URL 🔗](https://github.com/AJBIKI/resume_analyser_upgraded)

Independent Project | Next.js 15, Express, BullMQ, Upstash Redis, Socket.io, GPT-4o, Qdrant

## Full Stack Developer – Next.js Blog CMS Live | GitHub [URL 🔗](https://github.com/AJBIKI/blog-cms-upgraded_next)

Independent Project | Next.js 15, React 19, MongoDB, Clerk, Cloudinary, Tailwind CSS

## Technical Skills

Languages: JavaScript (ES6+), TypeScript, Python

Frontend: Next.js 15, React 19, Tailwind CSS, tRPC

Backend: Node.js, Express.js, FastAPI, REST APIs, WebSockets, Server Actions

AI & LLMs: OpenAI GPT-4o, HuggingFace, RAG Pipelines, Hybrid Vector Search, Prompt Engineering, LangChain, LangGraph, Ollama, MCP

Databases & Infra: MongoDB Atlas, Qdrant Cloud, Upstash Redis, BullMQ, SQL, Cloudinary

Tools: Git, Vercel, Clerk Auth, Socket.io, n8n, ONNX Runtime

## Certifications & Profiles

Generative AI Mastermind – Outskill (2024) | Generative AI Fundamentals – LinkedIn Learning (2024) | SQL & Relational Databases

– IBM (2023)

GeeksforGeeks: 100+ problems solved (DSA – Arrays, Trees, Graphs, DP) | Languages: Bengali (Native), English, Hindi
