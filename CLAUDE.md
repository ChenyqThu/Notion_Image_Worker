# Repository Guidelines

## Project Overview
Notion Image Worker — a Notion Workers (alpha) AI tool that integrates Notion AI with Google Gemini image generation. Takes simple image descriptions, expands them into professional "Nano Banana Pro" prompts via Gemini, generates images, and embeds them natively into Notion pages using the File Upload API.

## Project Structure & Module Organization
- `src/index.ts` — Main worker entry point. Defines the `generateNanoBananaImage` tool, handles Notion File Upload API integration, and appends image + prompt blocks to pages.
- `src/gemini.ts` — Gemini API integration. Contains `expandPrompt()` (prompt expansion via text model) and `generateImage()` (image generation via image model).
- `dist/` — Compiled JavaScript output (generated, git-ignored).
- `workers.json` — Notion Workers deployment metadata (workspace/worker IDs).
- `.env` — Local environment variables (git-ignored, contains secrets).

## Worker Capability
Single tool registered on the worker:

```ts
worker.tool<GenerateImageInput, string>("generateNanoBananaImage", { ... })
```

**Input schema:**
- `short_description` (string, required) — Simple image description from the user.
- `page_id` (string, required) — Target Notion page ID for embedding.

**Execution pipeline:**
1. Validate `NOTION_API_KEY` from environment
2. `expandPrompt(short_description)` → detailed Nano Banana Pro prompt (Gemini text model)
3. `generateImage(expandedPrompt)` → image bytes + MIME type (Gemini image model)
4. `uploadImageToNotion()` → 3-step Notion File Upload API (create → upload bytes → get ID)
5. Append image block (file_upload reference) + paragraph block (expanded prompt) to page
6. Return success/error message

## Environment Variables
**Required:**
- `GEMINI_API_KEY` — Google Gemini API key
- `NOTION_API_KEY` — Notion integration secret

**Optional:**
- `GEMINI_PROMPT_MODEL` — Prompt expansion model (default: `gemini-2.5-flash`)
- `GEMINI_IMAGE_MODEL` — Image generation model (default: `gemini-3.1-flash-image-preview`)
- `GEMINI_IMAGE_ASPECT_RATIO` — Output aspect ratio (default: `1:1`)

## Build, Test, and Development Commands
- Node >= 22 and npm >= 10.9.2 (see `package.json` engines).
- `npm run build` — Compile TypeScript to `dist/`.
- `npm run check` — Type-check only (no emit).
- `ntn login` — Connect to a Notion workspace.
- `ntn workers deploy` — Build and publish capabilities.
- `ntn workers exec generateNanoBananaImage --local -d '<json>'` — Test tool locally.
- `ntn workers env set KEY=VALUE` — Store secrets for deployed worker.
- `ntn workers env push` — Push local `.env` secrets to remote.

## Key Dependencies
- `@notionhq/workers` — Notion Workers framework (Worker class, tool registration)
- `@notionhq/client` — Official Notion SDK (blocks API)
- `@google/genai` — Google Gemini SDK (text + image generation)

## Architecture Notes
- **Lazy SDK instantiation**: `GoogleGenAI` instances are created per-call in `gemini.ts` to avoid deployment snapshot issues.
- **Native Notion uploads**: Uses Notion File Upload API (`/v1/file_uploads`) directly instead of third-party image hosts, for seamless embedding.
- **No test runner**: Validate with `npm run check` and end-to-end via `ntn workers exec`.

## Coding Style & Naming Conventions
- TypeScript with `strict` enabled; keep types explicit for I/O shapes.
- Use tabs for indentation; capability keys in lowerCamelCase.

## Debugging & Monitoring
```shell
ntn workers runs list                    # List recent runs
ntn workers runs logs <runId>            # Logs for a specific run
ntn debug                                # CLI configuration overview
```
