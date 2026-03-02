# DSS Research & Development Log
**Project:** Decision Support System — Fuzzy AHP + Entropy + Fuzzy TOPSIS  
**Stack:** Python · FastAPI · HTML/CSS/JS · Groq API

---

## Table of Contents
1. [Foundational Concepts — DSS & MCDM](#1-foundational-concepts--dss--mcdm)
2. [Algorithm Deep Dives](#2-algorithm-deep-dives)
3. [Weighting Methods](#3-weighting-methods)
4. [RAG & Knowledge Retrieval](#4-rag--knowledge-retrieval)
5. [Scoring, Normalization & Real Values](#5-scoring-normalization--real-values)
6. [Fuzzy Logic Implementation](#6-fuzzy-logic-implementation)
7. [Backend — FastAPI & Python](#7-backend--fastapi--python)
8. [Frontend — HTML/CSS/JS](#8-frontend--htmlcssjs)
9. [Database & Storage](#9-database--storage)
10. [Errors & Debugging](#10-errors--debugging)
11. [Dev Tools & Workflow](#11-dev-tools--workflow)
12. [Design Decisions & Thought Process](#12-design-decisions--thought-process)
13. [Deployment](#13-deployment)
14. [External References](#14-external-references)

---

## 1. Foundational Concepts — DSS & MCDM

| # | Prompt |
|---|--------|
| 1 | Types of DSS |
| 2 | Key Decision Support System Methods |
| 3 | Explain multi-criteria decision-making and its methods |
| 4 | Explain Simple Additive Weighting (SAW) |
| 5 | How is the scoring based on? |
| 6 | Are the criteria considered as independent of each other in SAW? |
| 7 | SAW algorithm |
| 8 | Score normalization in SAW in Python |
| 9 | Explain MAUT (Multi-Attribute Utility Theory) |
| 10 | Multi-Criteria Decision Analysis (MCDA) and Multi-Attribute Utility Theory (MAUT) |
| 11 | Is this value-to-score a part of MAUT? |
| 12 | What is ANP? |
| 13 | AHP → (weights) ↓ Normalization ↓ Utility (MAUT) ↓ Interaction Engine ↓ Ranking (TOPSIS or WSM) ↓ Final Output — explain the pros and cons of the approach |
| 14 | Hybrid approaches for assigning scores and ranking |
| 15 | Innovative aspects to add in a decision support system |
| 16 | I want to build a decision support system with Fuzzy AHP + Entropy for weight determination and Fuzzy TOPSIS for ranking using Python FastAPI and HTML/CSS/JS in frontend |

---

## 2. Algorithm Deep Dives

| # | Prompt |
|---|--------|
| 1 | Explain Analytical Hierarchy Process (AHP) |
| 2 | Explain TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) |
| 3 | Explain the mathematical formula behind WSM, TOPSIS, AHP in detail |
| 4 | AHP for score generation and TOPSIS for ranking |
| 5 | 21. AHP → weights; TOPSIS → ranking — when to use each |
| 6 | Solid weights are not always correct — alternative ways to resolve |
| 7 | Why does my ranking change drastically with small input changes? |
| 8 | How to check if my pairwise comparison matrix is consistent? |
| 9 | Is there any scientific importance for the 1–9 range? — Saaty's justification |
| 10 | Criteria importance can change according to the use case — e.g., if a laptop is bought for gaming, it needs more graphics performance but the user may not be aware of it. How to handle this? |
| 11 | Analyze the use cases of the objects mentioned in the query |
| 12 | `base_cc, _, _ = fuzzy_topsis(matrix, weights, benefit)` — why is `_` used? |

---

## 3. Weighting Methods

| # | Prompt |
|---|--------|
| 1 | Assigning weights to each criterion |
| 2 | Entropy-based weight evaluation in DSS |
| 3 | Fuzzy AHP + entropy method for weight calculation |
| 4 | Entropy calculation in Python |
| 5 | Why does entropy give objective weights? |
| 6 | Explain the math behind entropy weight calculation and code it in Python |
| 7 | `k = 1/math.log(m) if m>1 else 1` and `e = -k * np.sum(p*np.log(p+1e-15), axis=0)` — explain |
| 8 | Why is entropy returning negative values? |
| 9 | Did I normalize before applying entropy or after? |
| 10 | Am I mixing up cost criteria and benefit criteria? |
| 11 | Benefit and cost in normalization in SAW — Want criteria LOWER → Cost; Want it HIGHER → Benefit |
| 12 | Currently in what range is entropy taking slider — 1–9 or 1–10? *(asked twice)* |
| 13 | `{k: v / total for k, v in criteria.items()}` — expand this expression |
| 14 | `def compute_spread(col): std = np.std(col); mean = np.mean(col); return min(0.3, std/(mean+1e-10))` — `sp = max(compute_spread(norm[:,j]) for j in range(n))` vs `sp = compute_spread()` — which is correct? |

---

## 4. RAG & Knowledge Retrieval

| # | Prompt |
|---|--------|
| 1 | What if the user does not know about the criteria affecting the query? *(appears in both concepts and thought process)* |
| 2 | RAG-based approach for a generic system |
| 3 | Knowledge ingestion in RAG |
| 4 | DuckDuckGo search |
| 5 | StackOverflow scraper |
| 6 | I will use Groq API and only want an LLM-based criteria suggester based on the user query |
| 7 | Are the domain patterns hard-coded — are there any other methods like using an easily available LLM? |
| 8 | Suppose I do not make these changes and add a RAG layer with knowledge ingestion — is it good? |
| 9 | In the third step the system asks to rate the actual details of criteria of the options rather than user input — change the star rating portion to fetch details from RAG using DuckDuckGo, or also give option for manual entering which later converts to a proper score in the background |
| 10 | Suppose a user wants to know about the best laptop — where in my code does it take its actual price for comparison, so how will the user analyze? |
| 11 | But not every feature needs to have any value — e.g., if searching for the best hospital, I may not have solid values for all criteria. What to do? |
| 12 | Are there any functional differences in `criteria_suggester.py` vs the `/suggest-criteria` route? |
| 13 | Thought about fetching real-time data by implementing a RAG approach but not implemented yet |

---

## 5. Scoring, Normalization & Real Values

| # | Prompt |
|---|--------|
| 1 | How is the scoring based on? |
| 2 | How to normalize a decision matrix for entropy calculation? |
| 3 | How to implement matrix normalization in Python using NumPy? |
| 4 | How to avoid division by zero in normalization? |
| 5 | Preventing numerical issues like divide by zero |
| 6 | Score normalization in SAW in Python |
| 7 | Real value normalization to score — how is it done? |
| 8 | `📐 How Real Values Were Converted — Raw values normalised to 1–9. Best value → 9, worst → 1.` — are these normalized correctly? Suppose I enter 100 as one of my salary values — what will it be rated? |
| 9 | So is there any issue with the min-max approach? |
| 10 | Is it better to create the normalize-value function in the backend or in the frontend? |
| 11 | What if I do the real-to-score conversion in the frontend as suggested earlier? |
| 12 | There are chances that for some criteria users enter a rate and for some an original value — when the user clicks value in the frontend, after taking the value it calls normalize and converts the real value to score; if it's a rate it does not call normalize. Is this correct? |
| 13 | Does my fuzzy system solve the missing-values problem in any way? |
| 14 | Does it remove the slider portion? |

---

## 6. Fuzzy Logic Implementation

| # | Prompt |
|---|--------|
| 1 | Fuzzy AHP algorithm in Python |
| 2 | Fuzzy TOPSIS for ranking and normalization in Python |
| 3 | How are triangular fuzzy numbers represented in code? |
| 4 | Explain Fuzzy AHP |
| 5 | Fuzzy AHP + entropy method for weight calculation |
| 6 | Does my fuzzy system solve the missing-values problem in any way? |

---

## 7. Backend — FastAPI & Python

| # | Prompt |
|---|--------|
| 1 | What is a clean backend structure for FastAPI projects? |
| 2 | How to design a clean API endpoint for decision evaluation? |
| 3 | `async function` in FastAPI |
| 4 | `async with httpx.AsyncClient(timeout=8) as client:` |
| 5 | httpx vs requests library |
| 6 | `sessionmaker()` parameters |
| 7 | `quote_plus(...)` in `password = quote_plus(os.getenv("DB_PASSWORD"))` — explain |
| 8 | BaseModel in Pydantic |
| 9 | Is separate models a good idea or is it good to keep it in the combined request model? |
| 10 | What about the normalize results model? |
| 11 | Are there any functional differences in `criteria_suggester.py` than in the `/suggest-criteria` route? |
| 12 | Add sensitivity function to the code |
| 13 | Do we need to change anything in these two files for the updated sensitivity? |
| 14 | CORS middleware issues |
| 15 | `/normalize` route error localhost in `routes.py` |
| 16 | Swagger UI for testing |
| 17 | `uv` package manager in Python |
| 18 | `uv pip freeze > requirements.txt` |
| 19 | `uv` package installation |
| 20 | Give me a final code snippet with backend and frontend — easily understandable but **critical: do not compromise on functionality** |
| 21 | Is there anything hard-coded? |
| 22 | The users cannot enter the matrix and all those — it's for a common man! CRITICAL — but it should not compromise on functionality |
| 23 | Why are criteria limited — are there any ways to sort it? |

---

## 8. Frontend — HTML/CSS/JS

| # | Prompt |
|---|--------|
| 1 | The users cannot enter the matrix — it's for a common man but should not compromise on functionality |
| 2 | In the third step the system asks to rate about the actual details of criteria — change the star rating portion to fetch details from RAG using DuckDuckGo or give option for manual entering which converts to a proper score in the background |
| 3 | Does it remove the slider portion? |
| 4 | What if I do the real-to-score in the frontend as suggested earlier? |
| 5 | There are chances that for some criteria users enter a rate and for some an original value — when user clicks value in frontend it calls normalize; else if it's a rate it does not call normalize. Is this correct? |
| 6 | Error in routing |
| 7 | `📐 How Real Values Were Converted` display — are these normalized correctly? |

---

## 9. Database & Storage

| # | Prompt |
|---|--------|
| 1 | `sessionmaker()` parameters |
| 2 | `quote_plus(...)` in `password = quote_plus(os.getenv("DB_PASSWORD"))` — explain |
| 3 | Then how does data storage occur here? |

---

## 10. Errors & Debugging

| # | Prompt |
|---|--------|
| 1 | Why is entropy returning negative values? |
| 2 | Why does my ranking change drastically with small input changes? |
| 3 | How to check if my pairwise comparison matrix is consistent? |
| 4 | Did I normalize before applying entropy or after? |
| 5 | Am I mixing up cost criteria and benefit criteria? |
| 6 | `IndexError: invalid index to scalar variable` |
| 7 | `INFO: 127.0.0.1:57883 - "GET /.well-known/appspecific/com.chrome.devtools.json HTTP/1.1" 404 Not Found` |
| 8 | `Access to fetch at 'http://localhost:8000/api/analyze' from origin 'http://127.0.0.1:8000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present` |
| 9 | `localhost:8000/api/analyze:1 Failed to load resource: net::ERR_FAILED` |
| 10 | `/normalize` route error localhost in `routes.py` |
| 11 | Error in routing |

---

## 11. Dev Tools & Workflow

| # | Prompt |
|---|--------|
| 1 | `git stash` / `git stash pop` |
| 2 | `git add -p` |
| 3 | Restructuring git commit message after pushing |
| 4 | How to delete the latest commit message |
| 5 | `uv` package manager in Python |
| 6 | `uv pip freeze > requirements.txt` |
| 7 | `uv` package installation |
| 8 | Swagger UI for testing |
| 9 | `httpx` vs `requests` library |
| 10 | Robot.txt file |
| 11 | Recommendation file updation |

---

## 12. Design Decisions & Thought Process

### Complete evolution of the system (in order):

| Step | Decision |
|------|----------|
| 1 | Started with **SAW** method — but it does not consider any comparison among criteria |
| 2 | Switched to **AHP** — adds pairwise comparison |
| 3 | Switched to **Fuzzy AHP** — to avoid crisp/exact judgments |
| 4 | Switched to **Entropy weighting** — to incorporate objective nature of data |
| 5 | Entropy accepted from **1–10 range** from user |
| 6 | **Combined** subjective weight from AHP + objective weight from entropy to calculate final weight |
| 7 | Used **Fuzzy TOPSIS** for ranking |
| 8 | Added **Groq Llama-3.3-70B** to suggest criteria to users as per their query |
| 9 | Added toggle to enter **actual values** for any criterion if available, so real data can be used in the entropy page |
| 10 | Thought about **fetching real-time data** via RAG approach — not implemented yet |
| 11 | **Sensitivity analysis** also considered |

### Individual design questions:

| # | Prompt |
|---|--------|
| 1 | What if the user does not know about the criteria affecting the query? |
| 2 | Are criteria considered independent of each other in SAW? |
| 3 | Solid weights are not always correct — alternative ways to resolve |
| 4 | The users cannot enter the matrix — it's for a common man! CRITICAL — but should not compromise on functionality |
| 5 | Why are criteria limited — are there any ways to sort it? |
| 6 | Suppose I do not make these changes and add a RAG layer with knowledge ingestion — is it good? |
| 7 | Is there anything hard-coded? |
| 8 | Is separate models a good idea or is it good to keep it in the combined request model? |
| 9 | Are there any functional differences in `criteria_suggester.py` than in the `/suggest-criteria` route? |
| 10 | Do we need to change anything in these two files for the updated sensitivity? |
| 11 | `compute_spread` — `sp = max(compute_spread(...))` vs `sp = compute_spread()` — which is correct? |
| 12 | Is it better to create the normalize-value function in the backend or in the frontend? |

---

## 13. Deployment

| # | Prompt |
|---|--------|
| 1 | Procfile in deployment |
| 2 | Robot.txt file |
| 3 | Recommendation file updation |
| 4 | CORS middleware issues |

---

## 14. External References

| # | Source |
|---|--------|
| 1 | *An application of AHP and fuzzy entropy-TOPSIS methods to optimize upstream petroleum investment in representative African basins* — Scientific Reports — https://share.google/B7064HceHKiZdmqq0 |
| 2 | *Enhancing Digital Governance Maturity Evaluation: An Integrated AHP and Entropy Weighting Approach* — Proceedings of the 2025 2nd International Conference on Innovation Management and Information System — https://share.google/3Hop7o6hZ20HZHaOl |
| 3 | *Introduction of MAUT and MCDA* — Medium (@vrajpatel9988) — https://medium.com/@vrajpatel9988/introduction-of-maut-and-mcda-9802b547506c |

## 15. AI Tools Used
| 1 | Codex |
| 2 | Github Copilot |
| 3 | ChatGPT |
 
---
