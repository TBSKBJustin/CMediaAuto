# ⛪ Church Media Automation System

A modular, “LEGO-style” media workflow designed for churches to streamline weekly production:

🎥 recording/streaming → 🖼 thumbnail creation → 🗣 captions/subtitles → ☁️ YouTube publishing → 🌍 website posts

This project is **pipeline-first** and **replaceable-by-design**: you can swap out any module (e.g., WhisperX → whisper.cpp, Ollama → another image model) without rewriting the whole system.

---

## Why this exists

Church media work often looks like this:

* There may be **multiple services in one day** (morning service, youth, Bible study, special events).
* Some gatherings **require livestreaming**, others don’t.
* Some events have **different workflows** (YouTube only, website only, captions only).
* Teams need **reliable automation**, but also **manual control** when needed.

This system is built for that reality:

* **Event-based runs** (each gathering is an “event” with its own settings)
* **Module toggles** per event (enable/disable thumbnail, subtitles, upload, website, etc.)
* **Multiple ingestion methods** (auto-detect recordings OR manually select a video to process)

---

## Key features

* **Event-based workflows** (supports multiple gatherings per day)
* **Module toggles** per event (turn modules on/off without code changes)
* **Two ingestion modes**

  * **OBS Monitor**: automatically detects new recordings
  * **Manual input**: pick a file and run the pipeline
* **Plugin architecture**: swap implementations (e.g., different subtitle engines)
* **Robust defaults + fallbacks**

  * If thumbnail AI fails → use a default character asset
  * If “direct video to subtitle engine” fails → fallback to audio extraction
* **Trackable outputs**: everything produced goes into an event folder with logs and metadata

---

## Architecture overview

### High level

```
               ┌────────────────────────┐
               │   Workflow Controller  │
               │  (orchestrator/queue)  │
               └───────────┬────────────┘
                           │
           ┌───────────────┼────────────────┐
           ▼               ▼                ▼
     Ingestion         Media Build       Publishing
 (OBS monitor/manual) (thumb/subtitles) (YouTube/site/etc.)
```

### Core idea: modules talk via files + JSON

Each module:

* takes a **standard JSON input** (config + paths)
* produces **standard outputs** (files + JSON results)
* does **one job only**

This keeps the system “swap-friendly.”

---

## Workflow model: Events

Every run is tied to an **Event**.

Examples:

* `2026-01-26_0900_sunday-service`
* `2026-01-26_1300_youth`
* `2026-01-26_1900_bible-study`

An event has:

* metadata (title, speaker, scripture, date/time, etc.)
* module toggles (which steps run)
* input media (one or more video files)
* outputs (thumbnail, subtitles, markdown, upload URLs, logs)

---

## Module toggles (per event)

Churches frequently need different outputs for different gatherings.
This system supports toggling modules per event:

* `live_control` (optional): control OBS start/stop/scene switching
* `ingest_obs_monitor` (optional): watch a folder for new recordings
* `thumbnail_ai` (optional): generate the right-side character image
* `thumbnail_compose` (optional): compose final thumbnail from layers
* `subtitles` (optional): generate SRT/VTT
* `publish_youtube` (optional): upload video + thumbnail + captions
* `publish_website` (optional): generate markdown + git push
* `archive` (optional): move outputs to long-term storage / NAS

You can:

* disable subtitles for quick uploads
* disable YouTube for events that are “in-person only”
* disable website posts for internal meetings
* run *only subtitles* on a previously uploaded video

---

## Ingestion modes

### 1) OBS Monitor (automatic)

A folder watcher detects when a new recording appears (e.g., `.mkv` or `.mp4`) and triggers a new event run (or attaches the file to a selected event).

Best for:

* regular Sunday services where recording ends predictably
* consistent “recording folder” setup

### 2) Manual selection (recommended for multi-service days)

You can manually select a recording to process and choose which event it belongs to.

Best for:

* multiple gatherings in one day
* events that don’t always follow the same recording pattern
* re-processing older videos (e.g., re-run captions with a new engine)

---

## Recommended user flow

### A) For a typical Sunday service

1. Create an event (title/speaker/scripture)
2. Enable modules: `thumbnail`, `subtitles`, `youtube`, `website`
3. Let OBS monitor detect the recording OR manually select it
4. Click: **Run Workflow**
5. Review outputs → optionally publish

### B) For a youth gathering that doesn’t need livestream or website

1. Create event
2. Enable only: `subtitles` + `youtube` (or only `subtitles`)
3. Manually select the video
4. Run workflow

### C) Re-run with a better AI model later

1. Select existing event
2. Disable everything except `thumbnail_ai` + `thumbnail_compose`
3. Run again → it updates the thumbnail output

---

## Project structure

```
church-media-automation/
│
├── controller/
│   ├── workflow_controller.py     # orchestrates modules, queue, retries
│   ├── event_manager.py           # create/load/update events
│   └── state_store.py             # saves run state (json/sqlite)
│
├── modules/
│   ├── ingest/
│   │   ├── obs_monitor.py         # watches recording folder
│   │   └── manual_ingest.py       # validate + attach selected file
│   │
│   ├── live/
│   │   └── obs_control.py         # optional: obs-websocket control
│   │
│   ├── thumbnail/
│   │   ├── ai_generator_ollama.py # character image generator (pluggable)
│   │   └── composer_pillow.py     # background + pastor + character + text
│   │
│   ├── subtitles/
│   │   ├── engine_whispercpp.py   # subtitle engine (pluggable)
│   │   └── engine_whisperx.py     # optional alternative engine
│   │
│   ├── publish/
│   │   ├── youtube_uploader.py    # upload video/thumb/captions
│   │   └── website_publisher.py   # generate markdown + git push
│   │
│   └── archive/
│       └── archiver.py            # optional storage move/cleanup
│
├── assets/
│   ├── backgrounds/               # fixed templates
│   ├── logos/                     # church logo
│   ├── pastor/                    # pre-made pastor portrait assets
│   └── fonts/                     # fonts for consistent typography
│
├── events/
│   └── 2026-01-26_0900_sunday-service/
│       ├── input/
│       ├── output/
│       ├── logs/
│       └── event.json
│
├── config/
│   ├── config.yaml                # global defaults
│   └── profiles/                  # per-church / per-team presets
│
└── README.md
```

---

## Event configuration example

`events/2026-01-26_0900_sunday-service/event.json`

```json
{
  "event_id": "2026-01-26_0900_sunday-service",
  "title": "Miracles and Wonders",
  "series": "Acts",
  "scripture": "15:12",
  "speaker": "Pastor Name",
  "language": "auto",
  "inputs": {
    "video_files": [
      "events/2026-01-26_0900_sunday-service/input/recording.mp4"
    ]
  },
  "modules": {
    "live_control": false,
    "ingest_obs_monitor": true,
    "thumbnail_ai": true,
    "thumbnail_compose": true,
    "subtitles": true,
    "publish_youtube": true,
    "publish_website": true,
    "archive": false
  }
}
```

**Note:** This is the heart of “module toggles.”
The controller reads this and only runs enabled modules.

---

## Thumbnail composition (template-based)

The thumbnail is built from layers:

1. AI-generated background (via Ollama image models or Stable Diffusion)
2. title text + stroke/shadow
3. scripture reference text
4. church logo (fixed)
5. pastor portrait (pre-made, fixed, optional)

**AI Background Generation:**

The system supports multiple backends for generating sermon thumbnails:
- **Ollama** (e.g., x/z-image-turbo) - easiest setup, uses existing Ollama service
- **Stable Diffusion WebUI** - highest quality, requires separate installation
- **Fallback** - uses pre-made images from assets/backgrounds/

Outputs:

* `thumbnail.jpg` (1280×720)

This keeps visual consistency while letting weekly content vary.

---

## Subtitles strategy (practical)

For many church videos, forced word-level alignment (e.g., WhisperX alignment) isn’t needed.
This system supports engines as plugins:

* `engine_whispercpp` (fast, simple deployment)
* `engine_whisperx` (optional if you later want word-level timestamps / diarization)

Recommended default:

* Generate `.srt` for upload
* Also generate `.vtt` if your website player benefits from it

Fallback behavior (recommended):

* Try direct video input
* If it fails, extract audio and retry automatically

---

## Execution modes

### CLI (first target)

* Create event
* Attach video (monitor or manual)
* Run controller

Example (conceptual):

```bash
python controller/workflow_controller.py run --event 2026-01-26_0900_sunday-service
```

### Web UI (planned / optional)

A simple control panel to:

* create/select event
* upload or pick video file
* toggle modules
* run workflow
* view outputs and logs
* publish when ready

---

## Failure handling & re-runs

This system is designed for real church conditions:

* last-minute edits
* re-uploads
* “captions need to be regenerated”
* thumbnail style changes

Each module run produces:

* logs
* outputs
* a module result JSON

Re-running the same event can:

* only re-run the modules you enable
* skip modules that already succeeded (unless “force” is set)

---

## Replaceability roadmap

Examples of future swaps:

* Ollama → Stable Diffusion / OpenAI Images / ComfyUI server
* whisper.cpp → WhisperX / faster-whisper / cloud ASR
* YouTube → Vimeo / Facebook / other platforms
* Pillow composer → Figma API / Photoshop automation

If the module input/output contract stays consistent, swaps are painless.

---

* **GPLv3**
