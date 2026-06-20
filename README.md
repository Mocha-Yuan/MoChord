# MoChord

MoChord is a guitar chord workspace for exploring voicings, fretboard diagrams, tablature, staff notation, audio playback, metronome practice, and AI-assisted chord progression ideas.

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
- Vite 8
- Tauri 2
- Rust
- Tone.js
- DeepSeek API
- Supabase Auth and Postgres

## Requirements

- Node.js and npm
- Rust toolchain
- Tauri 2 system prerequisites for your operating system
- A Supabase project for login and cloud progress sync

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

Then edit `.env`. DeepSeek is optional for the desktop AI workflow, while Supabase is required for account login and cloud sync:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not commit `.env`. It may contain a real API key.

## Supabase Setup

MoChord uses Supabase Auth for email/password accounts and a `user_progress` table for learning and practice progress.

1. Create a Supabase project.
2. Copy the project URL and anon public key into `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

3. Open the Supabase SQL Editor.
4. Run the SQL in [`supabase/schema.sql`](supabase/schema.sql).
5. Restart the Vite dev server after changing `.env`.

The SQL creates:

- `public.profiles`, linked to `auth.users`, including display name, avatar URL, age, gender, and guitar years
- `public.user_progress`, keyed by `user_id + progress_key`
- a public `avatars` Storage bucket for profile images, limited to JPG, PNG, and WebP files up to 2 MB
- an auth trigger that creates a profile when a user signs up
- Row Level Security policies so users can only read, insert, update, or delete their own profile/progress rows
- Storage policies so users can only upload, update, or delete avatar files inside their own user-id folder

Never use a `service_role` key in the frontend. Only `VITE_SUPABASE_ANON_KEY` belongs in the Vite app.

### Local and Guest Progress

Users can keep using MoChord without logging in. Guest progress is saved to localStorage with:

- `mochord_guest_progress`
- `mochord_guest_progress_updated_at`

After login, MoChord compares local guest progress with the cloud `global_progress` record. If local progress is newer, it uploads it. If cloud progress is newer, it restores the cloud copy locally. If timestamps are ambiguous, the cloud copy wins and the local copy is saved as `guest_backup_before_merge`.

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

Run focused checks:

```bash
npm run test:progress-sync
npm run test:workspace-state
```

Build the desktop app:

```bash
npm run desktop:build
```

## Android Development

MoChord can run on Android through Tauri 2.

Android prerequisites:

- Android Studio or Android SDK command-line tools
- Android SDK platform tools
- A JDK compatible with the Android Gradle Plugin
- Rust Android targets installed by Tauri or rustup
- A connected Android device or configured emulator

Useful environment checks on Windows:

```powershell
$env:JAVA_HOME
$env:ANDROID_HOME
& "$env:ANDROID_HOME\platform-tools\adb.exe" devices
npm run tauri -- info
```

Initialize the Android project once:

```bash
npm run android:init
```

Run on Android during development:

```bash
npm run android:dev
```

Run a production-mode Android build on a device:

```bash
npm run android:run
```

Build Android APK/AAB artifacts:

```bash
npm run android:build
```

Android permissions:

- Network access is required for Supabase login/sync and DeepSeek generation.
- Microphone access is required for the tuner.

Android troubleshooting:

- If no device is found, run `adb devices` and start an emulator or connect a phone with USB debugging enabled.
- If Android build fails while creating `jniLibs` symbolic links on Windows, enable Developer Mode or grant the current user the Create symbolic links privilege.
- If the dev server cannot be reached from a phone, use an emulator or set Tauri's dev host to an address reachable from the device.
- If tuner start fails, allow microphone access in Android app settings and reopen the tuner page.
- If Supabase or DeepSeek fails, confirm `.env` contains `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and that the app has network access.

Generated files are written to `dist/` and `src-tauri/target/`. These directories should not be committed.

## DeepSeek Notes

DeepSeek requests are handled by the Tauri/Rust side of the app. In the desktop app, users can either set `DEEPSEEK_API_KEY` in a local `.env` file or save a key through the app UI. Saved keys are stored locally on that computer.

The browser-only Vite app does not expose the DeepSeek key to frontend code. AI progression generation is therefore intended for the desktop runtime.

## Supabase Troubleshooting

- Missing environment variables: login remains unavailable and the app continues in guest mode.
- Signup says to check email: Supabase email confirmation is enabled; verify the email before logging in.
- Sync fails after login: confirm `supabase/schema.sql` was executed and RLS policies are enabled.
- Avatar upload fails: re-run `supabase/schema.sql`, then confirm the `avatars` Storage bucket exists and allows JPG, PNG, or WebP files up to 2 MB.
- One user can see another user's data: stop using the app and re-run the RLS policies in `supabase/schema.sql`; the intended policies always compare `auth.uid()` to the row owner.
- Changed `.env` but login still fails: restart `npm run dev` so Vite reloads environment variables.

## Repository Hygiene

For a checklist of files to publish or exclude before opening the repository on GitHub, see [OPEN_SOURCE.md](OPEN_SOURCE.md).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
