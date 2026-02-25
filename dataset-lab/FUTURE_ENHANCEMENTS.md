# 🚀 Dataset Lab: Future Enhancements

While Dataset Lab is fully functional and capable of generating high-quality instruction datasets, there are always opportunities for growth. This document outlines potential features, improvements, and architectural changes for **Version 2.0** and beyond.

If you are a contributor looking for ideas, this is the perfect place to start!

---

## 1. Advanced Data Ingestion & Processing

Currently, Dataset Lab relies on basic file uploads (Text, PDF). Expanding ingestion capabilities will make the tool significantly more versatile.

- [ ] **Web Scraping:** Add the ability to paste a URL (or list of URLs) and automatically extract text using tools like BeautifulSoup or Playwright.
- [ ] **GitHub Repo Ingestion:** Allow users to point to a GitHub repository to generate documentation-based and code-based datasets automatically.
- [ ] **Database Connections:** Integrate with PostgreSQL, MySQL, or MongoDB to pull raw data directly from existing databases.
- [ ] **Smarter Chunking Strategies:** Implement semantic chunking (splitting by topic/meaning rather than just character count) or markdown-aware chunking (splitting by headers).

## 2. Generation Engine Upgrades

The core of Dataset Lab is the LLM generation pipeline. These enhancements aim to improve the quality, diversity, and relevance of the generated datasets.

- [ ] **Multi-Agent Quality Assurance:** Implement a "Critic" LLM step. After the primary LLM generates a QA pair, a second, smaller model evaluates the answer for accuracy, hallucinations, or format compliance. Reject or auto-retry low-scoring pairs.
- [ ] **Context Injection (RAG Integration):** Connect to a local Vector Database (like ChromaDB or Qdrant). When generating a question, track which vectors have already been used to prevent the LLM from generating duplicate questions about the same topic.
- [ ] **Custom Prompt Chaining:** Allow users to define multi-step generation workflows in the UI (e.g., Step 1: Summarize text -> Step 2: Extract key entities -> Step 3: Generate complex reasoning questions from entities).
- [ ] **More Output Formats:** Beyond standard Instruction/QA, add native templates for generating:
    - Chatual/Multi-turn conversation datasets (ShareGPT format)
    - Code instruction datasets (Alpaca style)
    - Rejection sampling / Preference datasets (DPO/RLHF formats with chosen/rejected pairs)

## 3. UI/UX and Frontend Improvements

The user interface can be refined for better feedback, accessibility, and professional polish.

- [ ] **Interactive Data Viewer/Editor:** Instead of just a static list, build an Airtable-like grid view where users can manually edit, tag, or delete specific QA pairs directly in the browser before exporting.
- [ ] **Real-time Cost Estimation:** For online model usage (OpenAI, Anthropic), calculate token usage in real-time and provide cost estimates during pipeline execution.
- [ ] **Dark Mode Toggle:** While the app has a great dark neumorphic theme, adding a light mode toggle or allowing custom user themes.
- [ ] **Drag-and-Drop Workflow Builder:** A node-based UI (like React Flow) to let users visually connect chunking nodes, LLM generation nodes, and export nodes.

## 4. Architectural & Deployment Enhancements

Making Dataset Lab easier to deploy, scale, and maintain.

- [ ] **Dockerization:** Create `Dockerfile` and `docker-compose.yml` configurations to launch the entire stack (FastAPI backend + Vite frontend + Postgres DB if needed) with a single command.
- [ ] **Switch to a Real Database:** Currently, state and projects are entirely file-based for simplicity. Migrating project metadata, configuration, and generated data to SQLite or PostgreSQL will enable better sorting, filtering, and cross-project analytics.
- [ ] **Task Queues (Celery/Redis):** The current API handles generation synchronously or through background threads. Integrating a proper task queue will make the pipeline more resilient to crashes and allow scaling worker nodes.
- [ ] **Streaming API Responses:** Use Server-Sent Events (SSE) or WebSockets to stream the generation progress to the frontend in real-time, reducing reliance on the current polling mechanism.

## 5. Automated Benchmarking & Evaluation

Allow users to evaluate the quality of the dataset *before* they spend time fine-tuning.

- [ ] **Diversity Metrics:** Use sentence-transformers to calculate the semantic similarity of all generated questions and provide a "Diversity Score" for the dataset.
- [ ] **Toxicity/Bias Checking:** Integrate lightweight models to flag generated answers that might contain toxic, biased, or harmful content.
