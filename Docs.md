# Ideas Processor — System Documentation

**Version**: 4.0
**Core Architecture**: PWT (Providers, Workers, Transformers)
**Designed by**: Houssam Bensiyed

---

## 1. What This System Does

An AI-powered pipeline that reads existing content ideas, generates new ones, writes scripts for each idea, ranks the scripts, sorts everything by quality score, and saves it all back. Script files live in Google Drive.

---

## 2. PWT — The Core Architecture

PWT is not a pattern applied on top of something else. **PWT is the architecture itself.** Every piece of logic in this project flows through one of four PWT roles. There is no code that lives outside these roles except for configuration and the entry point.

### The Four Roles

**Provider** — The system's hands. Providers are the only components that touch external data stores. They read state in and push state out. If data enters or leaves the system, a Provider did it.

**Worker** — The system's brain. Workers are the only components that run AI. Every LLM call in the entire project happens inside a Worker. If the system needs to think, generate, evaluate, or reason, a Worker does it.

**Transformer** — The system's organizer. Transformers reshape data. They parse, sort, filter, merge, and format. They never reach outside the system. They take data in one shape and return it in another shape. Pure logic, zero dependencies.

**Cleaner** — The system's janitor. Cleaners manage files. They save, delete, move, and organize files in storage. If a file is created, moved, or removed, a Cleaner did it.

### The Rules

These rules are absolute. No exceptions unless explicitly documented and justified.

| Rule | Meaning |
|------|---------|
| A Provider never calls AI | Providers don't think. They fetch and store. |
| A Provider never touches files | File management belongs to Cleaners. |
| A Worker never reads/writes the data store | Workers don't do I/O. They compute. |
| A Worker never touches files | File management belongs to Cleaners. |
| A Transformer never calls AI | Transformers don't think. They reshape. (One documented exception exists.) |
| A Transformer never reads/writes the data store | Transformers have zero external dependencies. |
| A Transformer never touches files | Transformers are pure logic. |
| A Cleaner never calls AI | Cleaners don't think. They manage files. |
| A Cleaner never reads/writes the data store | Data persistence belongs to Providers. |

**One documented exception**: The Score Parser is a Transformer that uses AI. The raw ranking response from the AI is unstructured natural language. Extracting just the numeric score with regex would be brittle and break when the AI changes its output format. Using AI to extract the score is the reliable approach. This exception is documented, justified, and singular.

### How PWT Is Enforced

Each role is a base class. The base class constructor determines what the component can access:

- A Provider base receives the data store connection — that's all it can see
- A Worker base receives the AI service — that's all it can see
- A Transformer base receives nothing — it literally cannot access anything external
- A Cleaner base receives the file storage connection — that's all it can see

This is not convention. It is structural. A Worker cannot access the data store because the data store is not available in its scope. TypeScript enforces this at compile time.

---

## 3. The Three External Services

Each external service maps to exactly one PWT role. No service is shared across roles.

| Service | What It Is | Which Role Uses It | No Other Role Touches It |
|---------|-----------|-------------------|-------------------------|
| **Google Sheets** | Persistent storage for ideas data | Providers | Workers, Transformers, Cleaners cannot access it |
| **Anthropic LLM** | AI for generation, writing, ranking | Workers (+ one Transformer exception) | Providers, Cleaners cannot access it |
| **Google Drive** | File storage for scripts (dev and prod folders) | Cleaners | Providers, Workers, Transformers cannot access it |

Each service has an interface so that tests can substitute stubs without changing any PWT component.

---

## 4. Data Model

### Idea Object

| Field | Description | Set By |
|-------|-------------|--------|
| `id` | Unique identifier | Ideas Organizer (Transformer) |
| `title` | The idea title | Ideas Organizer (Transformer) |
| `status` | Current status | Ideas Organizer (Transformer) |
| `batchId` | Batch identifier for corruption detection | Ideas Organizer (Transformer) |
| `ideaContent` | Detailed idea description | Ideas Organizer (Transformer) |
| `script` | Script filename in Google Drive (e.g., `script_1716400000_a3f2.txt`) | File Saver (Cleaner) |
| `score` | AI-generated quality score | Score Appender (Transformer) |

**Script ID rule**: The `script` field stores only the filename. Never a path. Never a URL. The system resolves location by checking the `prod` folder first, then `dev`.

### Pipeline Context

A single shared state object that flows through all components. Each component reads what it needs and writes its output.

| Field | Description |
|-------|-------------|
| `tempLocalIdeas` | Copy of ideas read from Google Sheets |
| `rawIdeasText` | Raw AI response containing new ideas |
| `internalIdeasArray` | Master array of all ideas (existing + new) |
| `ideasToWrite` | Working copy used during script processing |
| `currentIdeaObject` | The idea currently being processed in the loop |
| `currentScriptText` | The script text just generated by AI |
| `currentRawRankResponse` | The raw ranking response from AI |
| `currentScore` | The parsed numeric score |
| `pattern` | The writing pattern/template for scripts |
| `batchId` | Current run's batch identifier |
| `pipelineRunId` | Unique identifier for this pipeline run |

---

## 5. Pipeline — Component Descriptions

The system runs as two pipelines: a **main pipeline** (6 components) and a **sub-pipeline** (9 components) that the main pipeline calls.

---

### Main Pipeline

```
Ideas Reader → Ideas Generator → Ideas Organizer → Scripts Processor → Ideas Saver → File Promoter
  Provider        Worker           Transformer        (sub-pipeline)     Provider       Cleaner
```

---

### Provider: Ideas Reader

**Input**: Google Sheets (external)

**Logic**: Connects to Google Sheets and reads all existing ideas into memory. Makes a deep copy so the original data is not modified during processing.

**Rules**:
- If the sheet does not exist, creates a new one with the correct columns
- Does not proceed if the read fails

**Output**: `tempLocalIdeas` — a local copy of all existing ideas

---

### Worker: Ideas Generator

**Input**: `tempLocalIdeas`

**Logic**: Sends the existing ideas to the AI along with a prompt asking it to generate new, unique ideas that don't duplicate any existing ones. The AI returns raw text containing the new ideas.

**Rules**:
- Only generates ideas — does not structure them, save them, or score them
- The prompt includes existing idea titles so the AI avoids duplicates

**Output**: `rawIdeasText` — unstructured text from the AI

---

### Transformer: Ideas Organizer

**Input**: `rawIdeasText`, `tempLocalIdeas`

**Logic**: Parses the raw AI text into individual ideas. For each idea, creates a structured idea object with a unique ID, title, status, batch ID, and idea content. Then merges the new ideas with the existing ideas into a single array.

**Rules**:
- New idea objects must follow the same structure as existing ideas
- Must add the `ideaContent` field to each new idea
- Skips any text it cannot parse rather than crashing
- Pure logic — no AI, no external calls of any kind

**Output**: `internalIdeasArray` — the combined array of existing + new ideas

---

### Scripts Processor (Sub-Pipeline)

**Input**: `internalIdeasArray`

**Logic**: Orchestrates the sub-pipeline described below. For each idea: writes a script, saves it to Google Drive, ranks it, extracts the score, and attaches the score. After all ideas are processed, sorts them by score and merges changes back.

**Rules**:
- All script files go to the Google Drive `dev` folder only
- No file promotion happens here — that is the last step of the main pipeline

**Output**: `internalIdeasArray` — enriched with `script` and `score` fields, sorted by score ascending

---

### Provider: Ideas Saver

**Input**: `internalIdeasArray`

**Logic**: Saves the fully enriched ideas array back to Google Sheets. Before saving, validates the batch ID to prevent data corruption from concurrent modifications.

**Rules**:
- Reads the last batch ID from Google Sheets and compares it with the current batch ID
- If they don't match, **rejects the save entirely** and halts the pipeline
- If they match, writes the data and confirms success
- The pipeline does not consider the run successful unless this component confirms it

**Output**: Data persisted to Google Sheets

---

### Cleaner: File Promoter

**Input**: Google Drive `dev` folder contents

**Logic**: Moves all script files from the Google Drive `dev` folder to the Google Drive `prod` folder. Cleans up the `dev` folder after successful transfer.

**Rules**:
- This is the **absolute last step** in the pipeline — it only runs after Ideas Saver has succeeded
- If the `dev` folder is empty or doesn't exist, does nothing
- Can be re-run safely via the recovery API endpoint

**Why this is last**: Moving files to prod is the hardest operation to undo. If Ideas Saver fails, File Promoter never runs. No orphaned files.

**Output**: Script files now in Google Drive `prod` folder, `dev` folder cleaned

---

### Sub-Pipeline

```
Scope Init → Pre-Loop Clean → [ Script Writer → File Saver → Script Ranker → Score Parser → Score Appender ] → Sorter → Scripts Organizer
Transformer    Cleaner          Worker           Cleaner      Worker          Transformer⚠️    Transformer       Transformer  Transformer
                                                                             (AI exception)
```

The stages inside the brackets run **once per idea** in a loop.

---

### Transformer: Scope Initializer

**Input**: `internalIdeasArray`

**Logic**: Creates a deep copy of the ideas array for the sub-pipeline to work on. Isolates sub-pipeline changes from the master array until processing is complete.

**Rules**:
- Deep copies the array so modifications during the loop don't affect the original

**Output**: `ideasToWrite` — the working copy

---

### Cleaner: Pre-Loop Cleaner

**Input**: Google Drive `dev` folder

**Logic**: Deletes any leftover files in the Google Drive `dev` folder from previous runs. Ensures a clean starting state.

**Rules**:
- Idempotent — if the folder is already empty or doesn't exist, no error occurs
- Never touches the `prod` folder

**Output**: Clean `dev` folder in Google Drive

---

### Worker: Script Writer (per idea)

**Input**: Current idea object, writing pattern

**Logic**: Sends the idea content and a writing pattern to the AI. The AI writes a complete script based on the idea, following the style defined in the pattern.

**Rules**:
- Only writes the script — does not save it to a file, does not rank it

**Output**: `currentScriptText` — the raw script text from the AI

---

### Cleaner: File Saver (per idea)

**Input**: `currentScriptText`

**Logic**: Saves the generated script as a text file in the Google Drive `dev` folder. Generates a unique filename using a timestamp and random suffix. Assigns this filename as the script ID on the current idea object.

**Rules**:
- Filenames use timestamp + random suffix for uniqueness
- Files go to the `dev` folder only
- The script ID is just the filename, not a path or URL

**Output**: `currentIdeaObject.script` — set to the filename

---

### Worker: Script Ranker (per idea)

**Input**: Current idea object and script text

**Logic**: Sends the script content to the AI for quality evaluation. The AI provides a detailed analysis with a score.

**Rules**:
- Only ranks — does not extract the score, does not rewrite the script
- Returns the full raw AI response including rationale and score

**Output**: `currentRawRankResponse` — the raw ranking text from the AI

---

### Transformer: Score Parser (per idea) ⚠️ AI Exception

**Input**: `currentRawRankResponse`

**Logic**: Sends the raw ranking response to the AI with a focused prompt asking it to extract only the numeric score.

**Rules**:
- Does not re-rank or modify the score — only extracts
- The extracted value must be a valid number between 0 and 10
- **This is the one documented PWT exception**: a Transformer using AI

**Output**: `currentScore` — a clean numeric value

---

### Transformer: Score Appender (per idea)

**Input**: `currentScore`, `currentIdeaObject`

**Logic**: Attaches the numeric score to the current idea object.

**Rules**:
- Pure data operation — no AI, no I/O

**Output**: `currentIdeaObject.score` — set to the parsed score value

---

### Transformer: Sorter

**Input**: `ideasToWrite` (all ideas now have scripts and scores)

**Logic**: Sorts the ideas array by score in ascending order (lowest first, highest last).

**Rules**:
- Pure data operation — no AI, no I/O

**Output**: `ideasToWrite` — sorted by score ascending

---

### Transformer: Scripts Organizer

**Input**: `ideasToWrite`

**Logic**: Merges the processed working copy back into the master `internalIdeasArray`. Clears the working copy.

**Rules**:
- Pure data operation — no AI, no I/O
- After this, `ideasToWrite` is cleared
- `internalIdeasArray` now has all scripts, scores, and is sorted

**Output**: `internalIdeasArray` — fully enriched and sorted

---

## 6. Transactional Integrity

### The Rule

> File promotion is the last step. If saving fails, nothing gets promoted. No orphaned files.

### Failure Analysis

| Failure Point | Data Store | Drive prod | Drive dev | Orphans? |
|--------------|-----------|-----------|----------|----------|
| Ideas Reader fails | Unchanged | Unchanged | Unchanged | ❌ None |
| Ideas Generator fails | Unchanged | Unchanged | Unchanged | ❌ None |
| Ideas Organizer fails | Unchanged | Unchanged | Unchanged | ❌ None |
| Any sub-pipeline stage fails | Unchanged | Unchanged | Partial files → cleaned next run | ❌ None |
| Ideas Saver fails | **Unchanged** | **Unchanged** | Has files → cleaned next run | ❌ None |
| File Promoter fails | Updated ✓ | Partial or empty | Has all files | ❌ None — recoverable |

### Startup Reconciliation

Runs once when the application starts, before the server accepts requests.

**Logic**:
1. Check if Google Drive `dev` folder exists. If not, system is clean.
2. List files in `dev`. If empty, system is clean.
3. Read all ideas from Google Sheets.
4. For each file in `dev`:
   - If filename matches a script ID in the data store → move to `prod` (interrupted promotion)
   - If filename has no matching record → delete it (leftover from a failed run)

**Rules**:
- Idempotent
- Runs before the server starts
- Logs every action

### Recovery Endpoint

`POST /api/pipeline/promote-scripts` — reads script IDs from Google Sheets, moves any that are still in `dev` to `prod`. Idempotent.

### Batch Integrity

1. Ideas Organizer assigns a `batchId` to the current run
2. Ideas Saver reads the last `batchId` from Google Sheets before writing
3. If they don't match → save rejected → pipeline halts → File Promoter never runs

### Script Resolution

When the API serves a script, it checks `prod` first, then falls back to `dev`. This handles the edge case where File Promoter failed but Ideas Saver succeeded.

---

## 7. AI Calls Per Run

| Component | AI Calls | Per |
|-----------|----------|-----|
| Ideas Generator | 1 | run |
| Script Writer | 1 | idea |
| Script Ranker | 1 | idea |
| Score Parser | 1 | idea |
| **Total** | **3N + 1** | N = number of ideas |

All AI calls include automatic retry with exponential backoff on failure.

---

## 8. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/pipeline/run` | Triggers the pipeline. Returns immediately. Rejects if already running. |
| `GET` | `/api/pipeline/status` | Returns: idle, running, completed, or failed. |
| `POST` | `/api/pipeline/promote-scripts` | Manual recovery: promotes unpromoted scripts. |
| `GET` | `/api/ideas` | Returns all ideas from Google Sheets. |
| `GET` | `/api/ideas/:id` | Returns a single idea. |
| `GET` | `/api/scripts/:id` | Returns script content (checks prod, then dev). |
| `GET` | `/api/health` | Health check. |

---

## 9. Configuration

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port |
| `AI_API_KEY` | Anthropic API key |
| `AI_MODEL` | AI model to use |
| `AI_RETRY_MAX_ATTEMPTS` | Max retry count for failed AI calls |
| `GOOGLE_SHEETS_ID` | Google Sheets spreadsheet ID |
| `GOOGLE_CREDENTIALS_PATH` | Path to Google service account credentials |
| `GOOGLE_DRIVE_PARENT_FOLDER_ID` | Google Drive folder containing dev and prod subfolders |
| `WRITING_PATTERN_PATH` | Path to the writing pattern template file |

---

## 10. Project Structure

PWT is the top-level organizing principle. Every source file lives under its PWT role. There are no generic folders like `stages/` or `components/`. **The folder structure is the architecture.**

```
ideas-processor/
│
├── src/
│   │
│   ├── pwt/                           # ── THE PWT ENGINE ──
│   │   ├── Provider.ts                # Provider base — receives DataStore
│   │   ├── Worker.ts                  # Worker base — receives AIService
│   │   ├── Transformer.ts            # Transformer base — receives nothing
│   │   ├── AITransformer.ts          # AI Transformer base — receives AIService (exception)
│   │   ├── Cleaner.ts                # Cleaner base — receives FileStorage
│   │   ├── Pipeline.ts               # Sequential runner
│   │   └── PipelineContext.ts        # Shared state
│   │
│   ├── providers/                     # ── EVERY PROVIDER IN THE SYSTEM ──
│   │   ├── IdeasReader.ts
│   │   └── IdeasSaver.ts
│   │
│   ├── workers/                       # ── EVERY WORKER IN THE SYSTEM ──
│   │   ├── IdeasGenerator.ts
│   │   ├── ScriptWriter.ts
│   │   └── ScriptRanker.ts
│   │
│   ├── transformers/                  # ── EVERY TRANSFORMER IN THE SYSTEM ──
│   │   ├── IdeasOrganizer.ts
│   │   ├── ScopeInitializer.ts
│   │   ├── ScoreParser.ts            # ⚠️ extends AITransformer (documented exception)
│   │   ├── ScoreAppender.ts
│   │   ├── Sorter.ts
│   │   └── ScriptsOrganizer.ts
│   │
│   ├── cleaners/                      # ── EVERY CLEANER IN THE SYSTEM ──
│   │   ├── PreLoopCleaner.ts
│   │   ├── FileSaver.ts
│   │   └── FilePromoter.ts
│   │
│   ├── pipelines/                     # ── PIPELINE DEFINITIONS ──
│   │   ├── main.ts                    # Wires the 6 main pipeline stages
│   │   └── scripts.ts                # Wires the 9 sub-pipeline stages + loop
│   │
│   ├── prompts/                       # ── AI PROMPT TEMPLATES ──
│   │   ├── ideas-generator.ts
│   │   ├── script-writer.ts
│   │   ├── script-ranker.ts
│   │   └── score-parser.ts
│   │
│   ├── services/                      # ── EXTERNAL SERVICE IMPLEMENTATIONS ──
│   │   ├── interfaces/
│   │   │   ├── AIService.ts           # Used by: workers/ and ScoreParser
│   │   │   ├── DataStore.ts           # Used by: providers/
│   │   │   └── FileStorage.ts        # Used by: cleaners/
│   │   ├── AnthropicService.ts
│   │   ├── GoogleSheetsService.ts
│   │   └── GoogleDriveService.ts
│   │
│   ├── routes/                        # ── API ENDPOINTS ──
│   │   ├── pipeline.routes.ts
│   │   ├── ideas.routes.ts
│   │   ├── scripts.routes.ts
│   │   └── health.routes.ts
│   │
│   ├── utils/
│   │   ├── generate-id.ts
│   │   ├── resolve-script.ts
│   │   ├── retry.ts
│   │   └── startup-reconciliation.ts
│   │
│   ├── config.ts
│   ├── server.ts
│   └── index.ts
│
├── patterns/
│   └── default-writing-pattern.txt
│
├── credentials/
│   └── google.json
│
├── tests/
│   ├── stubs/
│   │   ├── StubAIService.ts
│   │   ├── StubDataStore.ts
│   │   └── StubFileStorage.ts
│   ├── unit/
│   │   ├── providers/
│   │   │   ├── IdeasReader.test.ts
│   │   │   └── IdeasSaver.test.ts
│   │   ├── workers/
│   │   │   ├── IdeasGenerator.test.ts
│   │   │   ├── ScriptWriter.test.ts
│   │   │   └── ScriptRanker.test.ts
│   │   ├── transformers/
│   │   │   ├── IdeasOrganizer.test.ts
│   │   │   ├── ScopeInitializer.test.ts
│   │   │   ├── ScoreParser.test.ts
│   │   │   ├── ScoreAppender.test.ts
│   │   │   ├── Sorter.test.ts
│   │   │   └── ScriptsOrganizer.test.ts
│   │   ├── cleaners/
│   │   │   ├── PreLoopCleaner.test.ts
│   │   │   ├── FileSaver.test.ts
│   │   │   └── FilePromoter.test.ts
│   │   ├── pipelines/
│   │   │   └── scripts.test.ts
│   │   └── pwt/
│   │       └── Pipeline.test.ts
│   └── integration/
│       └── full-pipeline.test.ts
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### Why This Structure

```
Look at the src/ folder:

  pwt/              ← The architecture engine. This IS PWT.
  providers/        ← Every file here extends Provider. Can only see DataStore.
  workers/          ← Every file here extends Worker. Can only see AIService.
  transformers/     ← Every file here extends Transformer. Can see nothing.
  cleaners/         ← Every file here extends Cleaner. Can only see FileStorage.
```

There is no `stages/` folder. There is no `components/` folder. There is no ambiguity about where a new piece of logic goes. If it calls AI, it goes in `workers/`. If it reads/writes data, it goes in `providers/`. If it reshapes data, it goes in `transformers/`. If it manages files, it goes in `cleaners/`.

PWT is not a label. PWT is the directory structure. PWT is the base class hierarchy. PWT is the dependency injection rules. PWT is the architecture.

### Service Interfaces Live Under services/

The service interfaces (`AIService`, `DataStore`, `FileStorage`) live under `services/interfaces/` — not under `pwt/`. This is deliberate. The PWT engine defines the **roles**. The services define the **contracts with the outside world**. They're related but distinct:

- `pwt/Worker.ts` says: "A Worker receives an AIService"
- `services/interfaces/AIService.ts` says: "An AIService has a generate method"
- `services/AnthropicService.ts` says: "Here's how Anthropic implements that"

The PWT engine doesn't know about Anthropic. It only knows that Workers get something that satisfies the AIService contract.

---

## 11. Component Registry

| # | Name | PWT Role | AI? | Location | Can Access |
|---|------|----------|-----|----------|-----------|
| 1 | Ideas Reader | Provider | ❌ | `providers/` | DataStore |
| 2 | Ideas Generator | Worker | ✅ | `workers/` | AIService |
| 3 | Ideas Organizer | Transformer | ❌ | `transformers/` | Nothing |
| 4 | Scripts Processor | Pipeline | — | `pipelines/` | Wires sub-components |
| 5 | Ideas Saver | Provider | ❌ | `providers/` | DataStore |
| 6 | File Promoter | Cleaner | ❌ | `cleaners/` | FileStorage |
| A | Scope Initializer | Transformer | ❌ | `transformers/` | Nothing |
| B | Pre-Loop Cleaner | Cleaner | ❌ | `cleaners/` | FileStorage |
| C | Script Writer | Worker | ✅ | `workers/` | AIService |
| D | File Saver | Cleaner | ❌ | `cleaners/` | FileStorage |
| E | Script Ranker | Worker | ✅ | `workers/` | AIService |
| F | Score Parser | Transformer ⚠️ | ✅ | `transformers/` | AIService (exception) |
| G | Score Appender | Transformer | ❌ | `transformers/` | Nothing |
| H | Sorter | Transformer | ❌ | `transformers/` | Nothing |
| I | Scripts Organizer | Transformer | ❌ | `transformers/` | Nothing |

**Totals**: 2 Providers, 3 Workers, 6 Transformers (1 AI exception), 3 Cleaners, 1 Pipeline wiring = **15 components**

---

## 12. SOC and SRP

### SOC — Separation of Concerns (PWT Level)

PWT defines the concern boundaries. This is the architectural rule.

| Concern | PWT Role | Boundary |
|---------|----------|----------|
| Data I/O | Providers | Never calls AI, never touches files |
| AI compute | Workers | Never does I/O, never touches files |
| Data shaping | Transformers | Never does I/O, never touches files, never calls AI (one exception) |
| File management | Cleaners | Never calls AI, never does data I/O |

### SRP — Single Responsibility (Class Level)

Within each PWT role, each component has one reason to change.

| Component | Changes When |
|-----------|-------------|
| Ideas Reader | How ideas are read from Google Sheets changes |
| Ideas Generator | The idea generation prompt changes |
| Ideas Organizer | The parsing/structuring rules change |
| Script Writer | The script writing prompt changes |
| File Saver | The file naming strategy changes |
| Script Ranker | The ranking criteria change |
| Score Parser | The score extraction logic changes |
| Score Appender | The score attachment shape changes |
| Sorter | The sort rule changes |
| Scripts Organizer | The merge logic changes |
| Ideas Saver | The persistence or batch validation changes |
| File Promoter | The promotion strategy changes |
| Pre-Loop Cleaner | The cleanup strategy changes |

SOC draws the lanes. SRP ensures each car in those lanes has one driver.

---

*This document describes what the system does and how PWT governs its structure. Every piece of logic lives inside a PWT role. The folder structure is the architecture. The base classes are the enforcement.*