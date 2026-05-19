# Ollama Configuration Guide (LemonAI)

This guide explains exactly what to change, where to change it, and where Ollama API key details are stored.

## 1) What must be configured

To use Ollama as the active model provider, configure:

1. Provider: enable `Ollama` and disable other providers (optional but recommended).
2. Provider API URL: set to your Ollama-compatible endpoint.
3. Provider API key: set your Ollama key/token if required by your endpoint.
4. Default model settings: set assistant/topic_naming/translation defaults to an Ollama model.
5. Environment model hint: set `LLM_MODEL` in `.env`.

## 2) Where API key details are stored

### Database (runtime source of truth)

LemonAI reads provider/model settings from SQLite at runtime.

- Database file path:
  - `${LEMON_AI_PATH}/data/database.sqlite`
  - If `LEMON_AI_PATH` is not set, path is resolved by runtime logic in `src/utils/electron.js`.

- Provider table/model:
  - File: `src/models/Platform.js`
  - Key fields:
    - `name` (provider name, e.g. `Ollama`)
    - `api_key` (this is where Ollama API key is stored)
    - `api_url` (base URL, e.g. `http://localhost:11434/v1`)
    - `is_enabled` (active/inactive provider)

- Model table/model:
  - File: `src/models/Model.js`
  - Key fields:
    - `platform_id`
    - `model_id` (e.g. `glm-5.1:cloud`)
    - `model_name`

- Default model settings table/model:
  - File: `src/models/DefaultModelSetting.js`
  - Key fields:
    - `setting_type` (`assistant`, `topic_naming`, `translation`)
    - `model_id` (points to `Model.id`)
    - `user_id`

## 3) Where to modify via API routes (preferred)

Use these backend routes to configure instead of editing DB directly:

- Provider routes:
  - `src/routers/platform/platform.js`
  - Relevant endpoints:
    - `GET /api/platform`
    - `PUT /api/platform/:platform_id` (set `api_key`, `api_url`, `is_enabled`)

- Model routes:
  - `src/routers/model/model.js`
  - Relevant endpoints:
    - `GET /api/model/list/:platform_id`
    - `POST /api/model` (create model if missing)

- Default setting routes:
  - `src/routers/default_model_setting/default_model_setting.js`
  - Relevant endpoints:
    - `PUT /api/default_model_setting` (set default for each `setting_type`)
    - `GET /api/default_model_setting/check`

## 4) Environment values to set

- File: `.env`
- Minimum setting:
  - `LLM_MODEL=glm-5.1:cloud` (or your chosen Ollama model)

Note: `.env` is not the authoritative source for provider key/url in this project. Provider key/url come from DB (`platform.api_key`, `platform.api_url`).

## 5) Safe handling of API keys

1. Do not commit API keys to Git.
2. Keep keys out of scripts that may be committed.
3. Ensure `.env` and local DB files are not pushed.
4. Before pushing code, scan staged diff for token-like values.

## 6) Quick verification checklist

1. `Ollama` provider exists and `is_enabled = true`.
2. `platform.api_url` points to your Ollama endpoint.
3. `platform.api_key` set only in local DB (or via secured API flow).
4. Default assistant model points to your target model (`glm-5.1:cloud`, etc.).
5. `.env` has `LLM_MODEL` matching your selected model.

## 7) Relevant code locations summary

- Provider model definition: `src/models/Platform.js`
- Model definition: `src/models/Model.js`
- Default model setting definition: `src/models/DefaultModelSetting.js`
- Runtime default model resolution: `src/utils/default_model.js`
- DB sync/bootstrap logic: `src/models/sync.js`
- Provider API routes: `src/routers/platform/platform.js`
- Model API routes: `src/routers/model/model.js`
- Default setting API routes: `src/routers/default_model_setting/default_model_setting.js`
- Path resolution for DB/data files: `src/utils/electron.js`
