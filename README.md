# ChordFlow

ChordFlow is a guitar chord workspace for exploring voicings, fretboard diagrams, tablature, staff notation, audio playback, metronome practice, and AI-assisted chord progression ideas.

The app can run as a Vite web app for local chord exploration, and as a Tauri desktop app for the full DeepSeek-powered progression workflow.

## Features

- Guitar chord input and voicing exploration
- Editable chord diagrams and fretboard visualization
- Tablature and staff notation views
- Audio audition powered by Tone.js
- Metronome and progression playback tools
- Local scale-mode progression generation
- DeepSeek-assisted beginner/professional chord progression suggestions in the desktop app
- English and Chinese UI copy

## Tech Stack

- React 19
- TypeScript
- Vite 7
- Tauri 2
- Rust
- Tone.js
- DeepSeek API

## Requirements

- Node.js and npm
- Rust toolchain
- Tauri 2 system prerequisites for your operating system

See the Tauri prerequisites documentation for platform-specific setup before running desktop commands.

## Setup

Install JavaScript dependencies:

```bash
npm install
```

Optional DeepSeek configuration for the desktop app:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

Do not commit `.env`. It may contain a real API key.

## Development

Run the Vite web app:

```bash
npm run dev
```

Run the Tauri desktop app:

```bash
npm run desktop:dev
```

## Build

Build the web assets:

```bash
npm run build
```

Build the desktop app:

```bash
npm run desktop:build
```

Generated files are written to `dist/` and `src-tauri/target/`. These directories should not be committed.

## DeepSeek Notes

DeepSeek requests are handled by the Tauri/Rust side of the app. In the desktop app, users can either set `DEEPSEEK_API_KEY` in a local `.env` file or save a key through the app UI. Saved keys are stored locally on that computer.

The browser-only Vite app does not expose the DeepSeek key to frontend code. AI progression generation is therefore intended for the desktop runtime.

## Repository Hygiene

For a checklist of files to publish or exclude before opening the repository on GitHub, see [OPEN_SOURCE.md](OPEN_SOURCE.md).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
