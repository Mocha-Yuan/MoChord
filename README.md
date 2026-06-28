# MoChord （魔弦）

<div align="center">
  <img src="mochord-readme-header.png" alt="MoChord" width="666" />
  <p><strong>把灵感变成能听、能练、能续的音乐工作台。</strong></p>
  <p>
    <a href="#一句话亮点">功能亮点</a> ·
    <a href="#快速开始">快速开始</a> ·
    <a href="#技术栈">技术栈</a> ·
    <a href="#mochord-english-version">English</a>
  </p>
</div>

<p align="center">
  <img src="mochord-product-interaction.jpeg" alt="MoChord product interaction showcase" width="100%" />
</p>

Scroll down – the English instructions are below.

把和弦灵感、吉他把位、实时调音、节拍练习和 AI 编曲放进同一个工作台。

MoChord 不是一个只会画和弦图的小工具。它更像一间面向吉他手的智能练习室：输入一个和弦，马上看到指板、五线谱、六线谱和可播放音色；输入一个调式或级数走向，AI 会生成初学者版与进阶版和弦进行；打开调音器，麦克风信号会经过实时音高检测、滤波、平滑和八度纠偏，帮助你把每一根弦调到更可靠的位置。

如果你正在写歌、练琴、教学、扒歌、做和声实验，MoChord 想解决的是同一个痛点：不要在和弦网站、调音器、节拍器、谱面工具和 AI 聊天窗口之间来回切换。

## 一句话亮点

- AI 和弦进行生成：基于 DeepSeek 的桌面端生成流程，支持本地兜底算法，断网或未配置 API key 也能给出可练习结果。
- 智能把位推荐：从和弦音覆盖、根音位置、低音根音、把位跨度、空弦可用性、闷音结构和手型可达性等维度为吉他手排序。
- 实时调音器：基于 Web Audio 捕捉麦克风信号，使用 YIN 风格音高检测、RMS 门限、清晰度门限、中值平滑和八度跳变纠偏。
- 调音频率体系：默认 A4 = 440Hz，支持 432Hz 至 445Hz 参考音校准，覆盖 Standard、Drop D、Low C、DADGAD、Half Step Down 和自定义调弦。
- 练习闭环：AI 生成的和弦可以直接播放、保存、进入练习模式，并跟随 BPM、小节、当前和弦、下一个和弦与目标音练习。
- 多端能力：React + Vite Web 应用，Tauri 2 桌面应用，并支持 Tauri Android 工作流。
- 云同步：Supabase Auth + Postgres 保存账号、资料、进度、曲库和练习轨迹；未登录时也支持本地访客进度。

## 为什么 MoChord 值得被关注

大多数音乐工具只解决一个动作：查和弦、调音、听音、打节拍、生成灵感。MoChord 的目标是把这些动作串成一个完整创作和练习链路。

你可以从一句非常模糊的想法开始：

```text
D Major 4-5-6-6
C Major 1-5-6-4
G Major I-V-VI-IV
A minor melancholy chorus
```

MoChord 会把它变成：

- 可以解释的和声结果：调性、调式、级数、罗马数字、功能色彩。
- 两套可选择的和弦方案：一套更适合入门，一套更有色彩和专业感。
- 可视化吉他按法：每个和弦都能进入指板图和多把位候选。
- 可播放音频：用 Tone.js 试听单个和弦、扫弦或整段进行。
- 可练习计划：AI 教练会给出节奏型、起始 BPM、循环次数、提速策略和练习目标。

这意味着 MoChord 不只是“给你答案”，而是把答案变成你能立刻弹、立刻听、立刻练的材料。

## AI 功能

### DeepSeek 智能生成

桌面版 MoChord 通过 Tauri/Rust 侧调用 DeepSeek，避免把 API key 暴露在浏览器前端。用户可以在本地 `.env` 配置密钥，也可以通过应用界面保存密钥；保存后的 key 留在本机。

AI 生成流程会返回结构化 JSON，并经过前端 schema 校验。结果包括：

- 标准化输入
- 调性与调式
- 级数数组和罗马数字
- Beginner 和 Professional 两个版本
- 每个和弦的功能说明与解释
- AI Practice Coach 练习方案
- notes 与 warnings

当 DeepSeek 不可用、返回异常或未配置 key 时，MoChord 会自动进入本地兜底生成流程，根据调式与级数生成可用和弦，不让创作流中断。

### AI 练习教练

MoChord 的 AI 不停在“给一串和弦”。生成结果可以直接进入练习模式，AI Coach 会把和弦变成三轮或多轮练习计划：

- 起始速度
- 每轮提速幅度
- 每个和弦持续小节数
- 节奏型建议
- 当前轮练习目标
- 从熟悉顺序到提高手感再到稳定节拍的递进路径

这让 AI 结果从灵感文本变成真实可执行的吉他训练。

### AI 歌曲草稿与编曲

MoChord 还包含歌曲草稿生成提示词体系，可以根据风格、调性、难度、BPM、拍号、是否生成歌词等参数，生成吉他友好的完整歌曲结构。生成规则要求和弦可解析、段落可练习、歌词原创，并支持中英文输出。

## 智能把位推荐算法

MoChord 的把位系统不是简单查表。它会优先使用用户保存的自定义按法和内置经典按法；当没有现成按法时，会动态生成多把位候选。

算法会在 1 到 12 品范围内搜索可用组合，并对候选按法打分：

- 和弦音覆盖越完整越好。
- 必须尽量包含根音。
- 低音是根音时加分。
- 合理使用空弦时加分。
- 把位跨度过大时降权。
- 闷音过多或中间断弦时淘汰。
- 超过 4 品跨度的手型会被过滤。
- 超出四根手指能力的按法会被过滤。
- 自动识别可能的大横按，并重新分配指法。
- 同一把位不会无限堆叠，只保留更高质量候选。

最终，MoChord 会把这些候选变成可视化和弦图、六线谱、可播放音高，并允许用户保存自己的按法。保存后的把位会优先生效，适合长期建立个人指法库。

## 实时调音器与信号捕捉

调音器是 MoChord 的硬核模块之一。它直接使用浏览器/桌面运行时的麦克风输入，并关闭回声消除、噪声抑制和自动增益控制，让算法尽量接近原始乐器信号。

信号链路包括：

- `getUserMedia` 捕捉麦克风输入
- Web Audio `AudioContext`
- 38Hz 高通滤波，降低低频噪声
- 1250Hz 低通滤波，聚焦吉他有效基频范围
- `AnalyserNode`，`fftSize = 8192`
- 约 90ms 一次音高分析
- RMS 输入电平门限，过滤无效环境声
- YIN 风格差分函数与累积均值归一化
- 清晰度门限，拒绝不稳定音高
- 抛物线插值细化周期估计
- 中值平滑窗口，减少频率抖动
- 短暂丢帧保持，避免 UI 闪烁
- 八度跳变检测与纠偏，减少泛音误判

调音器会把检测到的频率转换为 MIDI 音高、音名、目标频率和 cents 偏差。对于吉他场景，MoChord 还会根据当前调弦目标选择最接近的弦和品位，而不是只显示孤立音名。

## 频率与调弦体系

MoChord 支持可调参考音：

```text
A4 reference: 432Hz - 445Hz
Default: 440Hz
```

内置调弦：

- Standard: E2 A2 D3 G3 B3 E4
- Drop D: D2 A2 D3 G3 B3 E4
- Low C: C2 G2 D3 G3 A3 D4
- DADGAD: D2 A2 D3 G3 A3 D4
- Half Step Down: D#2 G#2 C#3 F#3 A#3 D#4
- Custom: 自定义六根弦音高，并保存为个人预设

调音目标会根据参考 A4 重新计算频率，因此同一套调弦可以适配不同乐队、录音或现场环境。

## 核心功能总览

| 模块 | 能力 |
| --- | --- |
| 和弦工作台 | 输入和弦名，生成和弦结构、指板图、五线谱简图、六线谱和可播放音符 |
| AI 生成器 | 根据调性、调式、级数或自然语言提示生成 beginner/professional 两套进行 |
| 智能把位 | 多把位搜索、评分、排序、指法估计、大横按识别、自定义保存 |
| 音频试听 | Tone.js 播放和弦、扫弦和整段和弦进行 |
| 节拍器 | BPM、拍号、重拍、数拍和练习播放联动 |
| 练习模式 | 当前和弦、下一个和弦、拍点、小节、把位图和调音目标同步显示 |
| 调音器 | 实时音高检测、cents 偏差、输入电平、参考频率和调弦预设 |
| 歌曲编排 | 段落、歌词行和弦、节奏型、重复次数与整首练习 |
| 曲库 | 保存 AI 生成或手动整理的和弦进行 |
| 账号同步 | Supabase 登录、资料、头像、进度同步和访客进度合并 |
| 国际化 | 英文与中文界面文案 |

## 技术栈

- React 19
- TypeScript
- Vite 8
- Tauri 2
- Rust
- Tone.js
- DeepSeek API
- Supabase Auth / Postgres / Storage

## 快速开始

安装依赖：

```bash
npm install
```

启动 Web 版：

```bash
npm run dev
```

启动桌面版：

```bash
npm run desktop:dev
```

构建 Web 资源：

```bash
npm run build
```

构建桌面应用：

```bash
npm run desktop:build
```

## 环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

可配置项：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

说明：

- DeepSeek 主要用于桌面端 AI 工作流。
- 浏览器版不会把 DeepSeek key 暴露给前端代码。
- Supabase 用于账号登录、资料、头像、曲库与练习进度同步。
- 不要提交 `.env`，里面可能包含真实 API key。

## Supabase 初始化

MoChord 使用 Supabase Auth 和 `user_progress` 表保存学习与练习进度。

1. 创建 Supabase 项目。
2. 将项目 URL 和 anon public key 写入 `.env`。
3. 打开 Supabase SQL Editor。
4. 执行 `supabase/schema.sql`。
5. 重启 Vite dev server。

SQL 会创建：

- `public.profiles`
- `public.user_progress`
- `avatars` Storage bucket
- 新用户 profile 自动创建 trigger
- Row Level Security policies
- 用户只能读写自己资料、进度和头像的安全策略

## Android 工作流

MoChord 可以通过 Tauri 2 运行在 Android。

初始化 Android 项目：

```bash
npm run android:init
```

开发运行：

```bash
npm run android:dev
```

连接设备运行生产模式：

```bash
npm run android:run
```

构建 Android 产物：

```bash
npm run android:build
```

Android 需要网络权限用于 Supabase/DeepSeek，需要麦克风权限用于调音器。

## 测试与质量检查

项目包含多个聚焦测试脚本：

```bash
npm run test:tuner-engine
npm run test:practice-mode
npm run test:practice-coach
npm run test:practice-stats
npm run test:practice-voicing-path
npm run test:workspace-state
npm run test:progress-sync
npm run test:ai-generator-language
npm run test:song-draft
npm run test:song-arrangement
```

这些测试覆盖调音器算法、练习状态、AI 生成语言、歌曲草稿、曲库、同步、把位路径等核心能力。

## 项目定位

MoChord 适合：

- 想快速找到可弹和弦把位的吉他手
- 想把 AI 灵感直接变成练习材料的创作者
- 需要给学生展示和弦结构、级数、指板和节奏的老师
- 想研究和声进行、调式色彩和吉他编配的学习者
- 需要一个可扩展音乐练习 App 架构的开发者

MoChord 的目标不是替代音乐判断，而是把音乐判断需要的上下文放到同一个界面里：声音、手型、谱面、节奏、频率和 AI 建议互相对齐。

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

# MoChord English Version

Put chord inspiration, guitar voicings, real-time tuning, rhythm practice, and AI-powered arrangement in one focused workspace.

MoChord is more than a chord diagram tool. It is an intelligent practice room for guitar players: type a chord and immediately see the fretboard, staff view, tablature, and playable sound; enter a key, mode, or degree pattern and AI generates beginner-friendly and more advanced chord progressions; open the tuner and the microphone signal is processed through real-time pitch detection, filtering, smoothing, and octave-jump correction so every string lands closer to the target.

If you write songs, practice guitar, teach students, transcribe ideas, or explore harmony, MoChord is built around one simple promise: stop jumping between chord sites, tuners, metronomes, notation tools, and AI chat windows.

## Highlights

- AI chord progression generation: a DeepSeek-powered desktop workflow with a local fallback algorithm, so usable practice material is still available when the API is unavailable or not configured.
- Smart voicing recommendation: ranks guitar shapes by chord-tone coverage, root placement, bass root quality, fret span, open-string usefulness, muted-string structure, and hand ergonomics.
- Real-time tuner: captures microphone input with Web Audio and uses YIN-style pitch detection, RMS gating, clarity thresholds, median smoothing, and octave-jump correction.
- Tuning frequency system: default A4 = 440Hz, adjustable from 432Hz to 445Hz, with Standard, Drop D, Low C, DADGAD, Half Step Down, and custom tunings.
- Practice loop: AI-generated progressions can be played, saved, and sent directly into practice mode with BPM, bars, current chord, next chord, and target tuning notes.
- Multi-platform foundation: React + Vite for the web app, Tauri 2 for desktop, and a Tauri Android workflow.
- Cloud sync: Supabase Auth + Postgres for accounts, profiles, progress, libraries, and practice history; guest progress is also supported locally.

## Why MoChord Is Share-Worthy

Most music tools solve one isolated action: look up a chord, tune a guitar, play a sound, count a beat, or generate an idea. MoChord connects those actions into a complete creative and practice workflow.

You can start with a loose idea:

```text
D Major 4-5-6-6
C Major 1-5-6-4
G Major I-V-IV-IV
A minor melancholy chorus
```

MoChord turns it into:

- Explainable harmonic output: key, mode, degrees, Roman numerals, and functional color.
- Two usable progression versions: one more beginner-friendly, one with richer musical color.
- Visual guitar shapes: each chord can be explored through fretboard diagrams and multiple voicing candidates.
- Playable audio: audition individual chords, strums, or full progressions with Tone.js.
- A practice plan: the AI coach provides rhythm patterns, starting BPM, loop count, tempo-ramp strategy, and concrete practice goals.

MoChord does not just give you an answer. It turns the answer into something you can play, hear, save, and practice immediately.

## AI Features

### DeepSeek-Powered Generation

The desktop version of MoChord calls DeepSeek from the Tauri/Rust side, so the API key is not exposed to frontend browser code. Users can configure a key in a local `.env` file or save one through the app UI; saved keys stay on the local machine.

The AI workflow returns structured JSON and validates it before use. Results include:

- Normalized input
- Key and mode
- Degree array and Roman numerals
- Beginner and Professional versions
- Function labels and explanations for each chord
- AI Practice Coach plan
- Notes and warnings

When DeepSeek is unavailable, returns an invalid response, or has no configured API key, MoChord falls back to a local generation path based on mode and degree logic, keeping the creative flow moving.

### AI Practice Coach

MoChord's AI does not stop at a chord list. Generated progressions can be sent directly into practice mode, where the AI Coach turns them into a progressive training plan:

- Starting tempo
- Tempo increase per loop
- Bars per chord
- Rhythm pattern suggestion
- Practice goals for each round
- A path from memorizing the order to improving transitions and stabilizing time feel

That makes each AI result practical rather than merely inspirational.

### AI Song Drafts And Arrangement

MoChord also includes a song draft prompt system that can generate guitar-friendly song structures from style, key, difficulty, BPM, time signature, length, and lyric settings. The prompt rules require parseable guitar chords, practice-ready sections, original lyrics, and bilingual output support.

## Smart Voicing Recommendation Algorithm

MoChord's voicing system is not just a lookup table. It first respects user-saved custom shapes and built-in classic shapes; when no direct shape is available, it dynamically generates multi-position candidates.

The algorithm searches across frets 1 to 12 and scores candidate shapes by musical and ergonomic quality:

- More complete chord-tone coverage scores higher.
- Root presence is strongly preferred.
- Bass root placement receives a bonus.
- Useful open strings receive a bonus.
- Wide fret spans are penalized.
- Excessive muted strings or broken internal string patterns are filtered out.
- Shapes spanning more than four frets are rejected.
- Shapes requiring more than four fingers are rejected.
- Likely barre shapes are detected and fingering is reassigned.
- Repeated candidates in the same position are reduced to the strongest options.

The final candidates become visual chord diagrams, tablature, playable pitches, and selectable saved voicings. Once a user saves a personal shape, MoChord prioritizes it in future sessions.

## Real-Time Tuner And Signal Capture

The tuner is one of MoChord's strongest technical modules. It uses microphone input directly from the browser or desktop runtime and disables echo cancellation, noise suppression, and automatic gain control to keep the signal closer to the raw instrument.

The signal chain includes:

- `getUserMedia` microphone capture
- Web Audio `AudioContext`
- 38Hz high-pass filtering to reduce low-frequency noise
- 1250Hz low-pass filtering to focus on the guitar's useful fundamental range
- `AnalyserNode` with `fftSize = 8192`
- Pitch analysis roughly every 90ms
- RMS input-level gating to reject weak environmental noise
- YIN-style difference function and cumulative mean normalization
- Clarity thresholding to reject unstable pitch readings
- Parabolic interpolation for refined period estimation
- Median smoothing to reduce frequency jitter
- Short dropout hold to prevent UI flicker
- Octave-jump detection and correction to reduce harmonic misreads

The tuner converts detected frequency into MIDI pitch, note name, target frequency, and cents deviation. For guitar use, MoChord also selects the nearest string and fret target from the active tuning context, instead of showing only an isolated note name.

## Frequency And Tuning System

MoChord supports an adjustable reference pitch:

```text
A4 reference: 432Hz - 445Hz
Default: 440Hz
```

Built-in tunings:

- Standard: E2 A2 D3 G3 B3 E4
- Drop D: D2 A2 D3 G3 B3 E4
- Low C: C2 G2 D3 G3 A3 D4
- DADGAD: D2 A2 D3 G3 A3 D4
- Half Step Down: D#2 G#2 C#3 F#3 A#3 D#4
- Custom: define and save personal six-string tuning presets

Tuning targets are recalculated from the selected A4 reference, making the same tuning layout adaptable to different bands, recordings, and live contexts.

## Core Modules

| Module | Capability |
| --- | --- |
| Chord workspace | Type a chord and generate chord structure, fretboard diagram, simplified staff view, tab, and playable notes |
| AI generator | Generate beginner/professional progressions from keys, modes, degrees, or natural-language prompts |
| Smart voicings | Multi-position search, scoring, sorting, fingering estimation, barre detection, and custom shape saving |
| Audio audition | Play chords, strums, and full progressions with Tone.js |
| Metronome | BPM, time signature, accents, count-in, and practice playback integration |
| Practice mode | Current chord, next chord, beat, bar, voicing diagram, and tuning target display |
| Tuner | Real-time pitch detection, cents deviation, input level, reference frequency, and tuning presets |
| Song arranger | Sections, lyric-line chords, rhythm patterns, repeat counts, and full-song practice |
| Library | Save AI-generated or manually arranged chord progressions |
| Account sync | Supabase login, profile, avatar, progress sync, and guest-progress merging |
| Internationalization | English and Chinese UI copy |

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Tauri 2
- Rust
- Tone.js
- DeepSeek API
- Supabase Auth / Postgres / Storage

## Quick Start

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

Run the desktop app:

```bash
npm run desktop:dev
```

Build web assets:

```bash
npm run build
```

Build the desktop app:

```bash
npm run desktop:build
```

## Environment Variables

Copy the environment template:

```bash
cp .env.example .env
```

Configurable values:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Notes:

- DeepSeek is primarily used by the desktop AI workflow.
- The browser version does not expose the DeepSeek key to frontend code.
- Supabase powers account login, profiles, avatars, libraries, and practice progress sync.
- Do not commit `.env`; it may contain real API keys.

## Supabase Setup

MoChord uses Supabase Auth and a `user_progress` table to store learning and practice progress.

1. Create a Supabase project.
2. Add the project URL and anon public key to `.env`.
3. Open the Supabase SQL Editor.
4. Run `supabase/schema.sql`.
5. Restart the Vite dev server.

The SQL creates:

- `public.profiles`
- `public.user_progress`
- `avatars` Storage bucket
- Trigger that creates a profile for new users
- Row Level Security policies
- Safety policies so users can only read and write their own profile, progress, and avatar files

## Android Workflow

MoChord can run on Android through Tauri 2.

Initialize the Android project:

```bash
npm run android:init
```

Run during development:

```bash
npm run android:dev
```

Run a production-mode build on a connected device:

```bash
npm run android:run
```

Build Android artifacts:

```bash
npm run android:build
```

Android requires network permission for Supabase/DeepSeek and microphone permission for the tuner.

## Tests And Quality Checks

The project includes focused test scripts:

```bash
npm run test:tuner-engine
npm run test:practice-mode
npm run test:practice-coach
npm run test:practice-stats
npm run test:practice-voicing-path
npm run test:workspace-state
npm run test:progress-sync
npm run test:ai-generator-language
npm run test:song-draft
npm run test:song-arrangement
```

These checks cover the tuner engine, practice state, AI generation language behavior, song drafts, song arrangement, library behavior, sync, and voicing paths.

## Project Positioning

MoChord is for:

- Guitar players who want playable chord shapes fast
- Creators who want AI ideas to become practice material immediately
- Teachers who need to show chord structure, degrees, fretboard positions, and rhythm in one place
- Learners exploring harmonic progressions, modal color, and guitar arrangement
- Developers looking for an extensible music-practice app architecture

MoChord is not trying to replace musical judgment. It puts the context that judgment needs into one interface: sound, hand shape, notation, rhythm, frequency, and AI suggestions aligned together.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
