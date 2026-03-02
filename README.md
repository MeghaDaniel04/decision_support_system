# Decision Support System

A hybrid multi-criteria decision intelligence platform built with **FastAPI** and **Vanilla JS**.  
Combines Fuzzy AHP, Entropy Weighting, and Fuzzy TOPSIS to produce ranked, explainable, and sensitivity-validated decisions.

---

## Table of Contents

1. [Understanding the Problem](#1-understanding-the-problem)
2. [Assumptions Made](#2-assumptions-made)
3. [Why the Solution Is Structured This Way](#3-why-the-solution-is-structured-this-way)
4. [Design Decisions and Trade-offs](#4-design-decisions-and-trade-offs)
5. [Edge Cases Considered](#5-edge-cases-considered)
6. [Approaches Considered and Dropped](#6-approaches-considered-and-dropped)
7. [How to Run the Project](#7-how-to-run-the-project)
8. [What Would Be Improved With More Time](#8-what-would-be-improved-with-more-time)

---

## 1. Understanding the Problem

Most decision tools treat the problem as purely computational: collect inputs, apply weights, output a score. The real problem is human — people are uncertain about what matters, imprecise in how much it matters, and need confidence in the result, not just a number.

Three specific gaps drive the design:

- **Criteria unawareness** — users often do not know which factors are relevant to their decision
- **Weight imprecision** — users cannot reliably assign exact numerical weights to abstract concepts like "work-life balance" or "brand reputation"
- **Subjective bias** — weights derived entirely from user perception reflect beliefs, not data

The system addresses all three through guided criteria discovery, natural preference expression, data-aware objective weighting, and stability validation of the final result.

---

## Scope — Generic by Design

The system is not built for any specific domain. It works for any decision that can be expressed as a set of alternatives evaluated against a set of criteria.

The only domain-aware component is the AI criteria suggestion, which uses the decision name and listed alternatives as context. Everything else like weight elicitation, scoring, ranking, sensitivity, recommendation is domain-agnostic. If the LLM is unavailable, even that step becomes fully generic through manual criteria entry.

---

## What the Current System Does

**Decision input** is the starting point. The user names the decision, lists the alternatives being compared, and selects the criteria that matter. Preset decision types are available for common scenarios. The system has no domain assumptions — the same flow works for choosing a laptop, a job offer, a university, a supplier, or anything else expressible as alternatives against criteria.

**Criteria discovery** is AI-assisted. When a decision name is entered, the system suggests relevant criteria based on context. The user can accept, remove, or add their own. If the AI is unavailable, presets or manual entry take over — the rest of the system is unaffected.

**Preference capture** uses a drag-to-rank interface followed by a small number of slider comparisons between adjacent criteria. The user expresses relative importance naturally rather than assigning abstract percentages. The system builds the full weight structure from these few inputs.

**Rating** supports two modes per criterion. Slider mode for subjective ratings and real value mode for actual numbers — price, battery capacity, salary figures. Both can be used in the same decision. Real values are converted to a comparable scale automatically with a live preview shown as the user types.

**Analysis, stability testing, and recommendation** run on the backend. The result screen shows the full ranking, what criteria drove the outcome, whether the result holds under different weight assumptions, and a plain-language explanation of why the winner won.

**The system works fully without the LLM.** Criteria must be added manually when the suggestion service is unavailable, but every other step — weight elicitation, rating, analysis, sensitivity, recommendation — continues normally.



## 2. Assumptions Made

| Assumption | Rationale |
|---|---|
| 2–10 alternatives are a reasonable decision scope | Fewer than 2 is not a decision; more than 10 introduces noise that degrades TOPSIS discrimination |
| 2–8 criteria cover most real-world decisions adequately | Beyond 8, the pairwise comparison matrix becomes unwieldy even with the neighbour-gap simplification |
| Criteria are treated as independent | AHP requires this; ANP would relax it but is deferred to future work |
| Slider ratings (1–9) and real values can coexist in the same decision | Users rarely have objective data for every criterion — hybrid input is the realistic case |
| A Consistency Ratio below 0.1 indicates acceptable judgment coherence | Standard AHP threshold from Saaty (1980) |
| The LLM is used only for criteria suggestion, never for weighting or ranking | Preserves determinism and auditability of core decision logic |

---

## 3. Why the Solution Is Structured This Way

### Five-step guided flow

The UI breaks a complex analytical task into five progressive screens — decision context, alternatives, criteria, ratings, results. Each step collects exactly what the next step needs. Users are never shown the full complexity at once.


### Modular backend

The backend is split into independent modules — one each for weight extraction, objective weighting, ranking, stability testing, and recommendation generation. Each module has a single responsibility and a clean interface. The ranking engine accepts any weight vector regardless of how it was derived, meaning any component can be swapped or extended without affecting the others.


### Hybrid weighting as the core architectural decision

Neither subjective weights alone (Fuzzy AHP) nor objective weights alone (Entropy) are sufficient. AHP without entropy reflects beliefs that may be biased. Entropy without AHP ignores strategic intent. The system combines both using an adaptive alpha derived from the variance of each weight vector — criteria where the user has stronger differentiated opinions receive more AHP influence; criteria where the data varies more receive more entropy influence.

---

## 4. Design Decisions and Trade-offs

### Neighbour-gap pairwise matrix instead of full AHP

Full AHP for 6 criteria requires 15 pairwise questions. The system reduces this to 5 — one per adjacent pair in the ranked list. The full comparison structure is derived from these neighbouring gaps, preserving the logical ordering the user specified.

**Trade-off accepted:** slight theoretical purity loss in exchange for a dramatically simpler user experience. The preference order the user expressed is always respected.

### Dynamic fuzziness in TOPSIS

Uncertainty in each criterion is set based on how much variation exists in the actual scores rather than using a fixed value for all criteria. Criteria where alternatives score very differently get wider uncertainty bands than criteria where alternatives score similarly.

**Trade-off accepted:** more complex implementation, but significantly more realistic uncertainty modelling.

### Scaled normalisation over simple max normalisation

Score values are scaled relative to the full distribution across all alternatives rather than just dividing by the highest value. This prevents one extreme score from distorting all other comparisons on that criterion.

**Trade-off accepted:** slightly less intuitive to explain but produces more balanced comparisons.

### Adaptive blending of subjective and objective weights

How much the user's stated preferences influence the final weights versus how much the data patterns influence them is determined automatically from the data . When the user has strong differentiated opinions, their preferences carry more influence. When the data varies more, the objective signal carries more.

**Trade-off accepted:** slightly harder to explain to a non-technical user than a fixed split, but more accurate in practice.

### Recommendation based on actual contribution, not weight alone

The winner's strengths are identified by how much each criterion actually contributed to its ranking — combining weight with performance — rather than just listing the highest-weighted criteria. A heavily-weighted criterion where all alternatives scored equally contributes nothing to the outcome and is not reported as a strength.

**Trade-off accepted:** requires the full score data to be passed into the recommendation module alongside the weights.



---

## 5. Edge Cases Considered

| Case | Handling |
|---|---|
| All alternatives score identically on a criterion | Entropy fallback to uniform distribution — prevents division by zero |
| Zero sum of entropy diversity values | Equal weight fallback — prevents NaN propagation through weight vector |
| Fewer than 2 benefit criteria exist | Three-branch message guard in recommendation — no IndexError |
| Cost criterion with low normalised score | Excluded from weaknesses — low cost score means good performance |
| Strengths and weaknesses overlap with few criteria | Explicit deduplication: weaknesses exclude anything already in strengths |
| Backend unavailable during analysis | Local rank-weighted fallback activates — user sees estimate with clear warning |
| AI criteria suggestion fails | Falls back to hardcoded preset suggestions per decision type |
| Real values entered for only some alternatives | Normalisation withheld until all alternatives have values for that criterion |
| Consistency Ratio exceeds 0.1 | Flagged in results UI — user warned that preferences conflict but result still shown |

---

## 6. Approaches Considered and Dropped

### SAW (Simple Additive Weighting)

The first approach implemented. Each criterion is given a weight, each alternative is scored, and the final result is a weighted sum. Simple to build and easy to explain.

Dropped because it requires users to assign exact weights directly — a task most people cannot do reliably for abstract criteria. 

### AHP (Analytic Hierarchy Process)

Adopted to solve the weight assignment problem. Instead of asking users to assign percentages, AHP asks them to compare criteria in pairs — "is price more important than performance, and by how much?" This matches how people actually think about relative importance.

Dropped in its standard form because it requires exact numerical judgments. Human judgment is rarely that precise. This limitation led directly to Fuzzy AHP.

### Fuzzy AHP

Adopted as the replacement for standard AHP. Instead of requiring a single exact comparison value, each judgment is expressed as a range — capturing the natural uncertainty in human preference. A user who thinks price is "somewhere between moderately and strongly more important" than performance can express that without being forced to pick one number.

This is the weighting method used in the current system. It is not dropped — it is retained and extended with entropy weighting to balance subjective preferences with objective data.

### MAUT (Multi-Attribute Utility Theory)

Evaluated as a more sophisticated alternative to AHP. MAUT models how satisfaction changes as criterion values change — for example, capturing the fact that an extra ₹1,00,000 in salary matters more at ₹4,00,000 than at ₹50,00,000. This diminishing returns behaviour is mathematically correct but requires users to construct a utility function per criterion, which most users cannot do without domain expertise. Dropped in favour of the simpler AHP pairwise comparison approach. A simplified version — piecewise linear utility approximation — is planned for future work.

### DuckDuckGo for RAG

A retrieval layer was considered to auto-populate real-world criterion values at decision time — pulling current prices, specs, or ratings from the web without requiring an API key. Dropped for two reasons: scraping search results is fragile and breaks silently when page structures change, and auto-populated values the user cannot verify undermine the core principle that every input must be auditable. A more robust structured RAG approach is retained in the future roadmap.



---

## 7. How to Run the Project

### Prerequisites

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) package manager

### Install uv (if not present)

**macOS / Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Verify installation:
```bash
uv --version
```

---

### Create virtual environment

```bash
# Create .venv in the project root
uv venv

# Activate it
# macOS / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

---

### Install dependencies

```bash
uv pip install -r requirements.txt
```

If a `pyproject.toml` is present instead:
```bash
uv sync
```

---

### Run the FastAPI server

```bash
uvicorn main:app --reload 
```

The API will be available at `http://localhost:8000`.  
Interactive docs at `http://localhost:8000/docs`.

---

### Serve the frontend

The frontend is a static HTML/JS/CSS bundle served by FastAPI:

```python
# main.py — static files are mounted automatically
app.mount("/static", StaticFiles(directory="static"), name="static")
```

Open `http://localhost:8000` in a browser to use the application.

---

### Environment variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

The AI criteria suggestion endpoint requires a valid Groq API key. If absent, the system falls back to hardcoded preset suggestions — all other functionality remains available.

---

## 8. What Would Be Improved With More Time

### Immediate improvements

**Modular decision pipeline**  
Break the system into independently selectable modules — a user could choose to run only preference-based weights without entropy, or swap the ranking method entirely. Each module exposes a clean interface so the pipeline is composable rather than fixed. For example: preference weights only, objective weights only, or both combined; TOPSIS ranking or an alternative ranking method.


**ANP instead of AHP for dependent criteria**  
AHP assumes criteria are independent. For decisions where criteria interact — for example, performance and battery life in a laptop are negatively correlated — ANP (Analytic Network Process) models these dependencies using a supermatrix. The pairwise comparison mechanism is retained; only the structure changes from a hierarchy to a network.

**Piecewise linear utility approximation (simplified MAUT)**  
The current system normalises criterion values linearly — a jump from ₹3,00,000 to ₹5,00,000 in salary is treated the same as a jump from ₹50,00,000 to ₹52,00,000, even though the first is far more meaningful. Full MAUT addresses this by having users construct a utility function per criterion, but that requires mathematical literacy the system deliberately avoids requiring.

---

### RAG with a better approach than scraping

Rather than scraping DuckDuckGo (fragile, unverifiable), a structured RAG pipeline would:

1. **Use a trusted structured source per decision domain**
   - Laptops / phones → GSMArena API or Notebookcheck structured specs
   - Jobs → LinkedIn Salary Insights or Glassdoor API

2. **Embed domain knowledge into a vector store** (FAISS or ChromaDB) using chunked spec sheets and review data

3. **At decision time**, retrieve relevant chunks for each alternative + criterion pair and extract the value using a lightweight LLM call

4. **Present retrieved values with source citations** — the user can accept, edit, or reject each auto-populated value before analysis runs

This preserves auditability — no value enters the analysis without user confirmation.

---

### Explanation layer

Current recommendation output names the top criteria and states a confidence level. A deeper explanation would include:

- **Margin analysis** — by how much the winner outperformed the runner-up on each criterion
- **Counterfactual** — "If [criterion] were weighted 20% higher, [alternative] would win instead"
- **Natural language synthesis** — a paragraph-length explanation generated by the LLM using the structured recommendation fields as grounding context, preventing hallucination

---

### Additional innovations worth exploring

**Decision versioning**  
Store decision sessions with a hash of inputs and results. Users can revisit past decisions, compare how updated inputs change the outcome, and track how their priorities have shifted over time.

**Collaborative decisions**  
Multiple stakeholders submit independent preference matrices. The system aggregates them using geometric mean aggregation (standard AHP group decision method) and highlights where stakeholders disagree most — making the conflict visible rather than averaging it away silently.


**Uncertainty propagation display**  
Currently, fuzzy weights are defuzzified before display. A more transparent UI would show the full fuzzy range of each weight as a band rather than a point, making the inherent uncertainty in the result visible to the user rather than hiding it in the computation.

---

## Dependencies

| Package | Purpose |
|---|---|
| `fastapi` | API framework |
| `uvicorn` | ASGI server |
| `numpy` | Matrix operations throughout the pipeline |
| `python-dotenv` | Environment variable loading |
| `groq` | LLM API client for criteria suggestion |
| `pydantic` | Request/response schema validation |

---

## Test Cases

The following test cases cover the main scenarios, edge cases, and failure modes of the system.

### Functional Tests


**TC-01 — Mixed slider and real value inputs**
- Decision: Choosing a laptop
- Price entered as real values: 85000, 120000, 95000
- Remaining criteria rated by slider
- Expected: Price normalised correctly - Live preview shown during entry.

**TC-02 — All real value inputs**
- Decision: Choosing a phone
- Alternatives: Pixel 8, iPhone 15, Galaxy S24
- Criteria: Price (cost, real), Camera Score (benefit, real), Battery mAh (benefit, real)
- Expected: All values normalised before analysis. 

**TC-03 — LLM unavailable**
- Groq API key removed from `.env`
- Decision name entered, alternatives added, proceed to criteria step
- Expected: Preset suggestions shown if decision type matches a known preset. If no preset matches, manual entry prompt shown. All subsequent steps function normally. No error thrown.

**TC-04 — Backend unavailable**
- FastAPI server stopped
- User completes all inputs and clicks Analyse
- Expected: Local rank-weighted fallback activates. Results shown with warning banner. No broken screen. Recommendation and sensitivity boxes empty since those require the backend.

---

### Edge Case Tests

**TC-05 — Minimum inputs (2 alternatives, 2 criteria)**
- Decision: Choosing between two job offers
- Alternatives: Offer A, Offer B
- Criteria: Salary (benefit), Work-Life Balance (benefit)
- Expected: System runs without error. Recommendation produces valid message with one or two strengths. No IndexError from criteria list access.


**TC-06 — All alternatives score identically on one criterion**
- One criterion rated 5 for all alternatives
- Expected: Entropy assigns near-zero weight to that criterion — it contributes nothing discriminatively. No division by zero error. Remaining criteria carry full weight.


**TC-07 — Consistency ratio above threshold**
- Manually construct a preference matrix with contradictory inputs by setting extreme and irregular neighbour gaps
- Expected: CR above 0.1 flagged in results UI with "Some preferences conflict" badge. Analysis still completes and ranking still shown. User not blocked.


**TC-08 — Start over resets all state**
- Complete a full analysis, then click Start Over
- Expected: All fields cleared — decision name, alternatives, criteria, scores, real values, results. Progress bar returns to step 1. No stale data from previous session appears in subsequent run.

---

## Notes

- The system degrades gracefully at every layer — AI failure falls back to presets, backend failure falls back to a local rank-weighted estimate, missing real values are flagged before analysis runs
- The Groq API key is the only external dependency required for full functionality; the core decision engine runs entirely locally
- Consistency Ratio computation uses the standard Saaty RI table; a CR above 0.1 triggers a warning but does not block the result
- All decision data is held in browser memory for the duration of the session only; closing the tab or refreshing the page clears all state

