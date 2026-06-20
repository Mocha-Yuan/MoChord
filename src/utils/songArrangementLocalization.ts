import type {
  SongArrangement,
  SongArrangementDifficulty,
  SongArrangementStyle,
  SongSection,
} from "../types/songArrangement";

type SongArrangementLanguage = "en" | "zh";

const ZH_TEXT: Record<string, string> = {
  "6/8 arpeggio": "6/8 分解和弦",
  "6/8 Slow Song Form": "6/8 慢歌结构",
  "Alternating bass": "交替低音",
  Arpeggio: "分解和弦",
  "Bass strum": "低音加扫弦",
  "Big finish": "强收尾",
  "Bright strum": "明亮扫弦",
  Bridge: "桥段",
  Build: "渐强铺垫",
  "Build picking": "渐强拨弦",
  "Broad 6/8 strum": "宽阔 6/8 扫弦",
  "Campfire Short Form": "篝火短歌结构",
  Chorus: "副歌",
  "City Pop Practice Form": "City Pop 练习结构",
  "Copied Form": "复制编排",
  "Count two large pulses.": "按两个大拍来数。",
  "Down / Down-Up": "下扫 / 下-上扫",
  "Down / Up": "下扫 / 上扫",
  "Driving strum": "推进扫弦",
  "Easy warm-up.": "作为轻松热身。",
  "Folk Story Form": "民谣叙事结构",
  "Full strum": "完整扫弦",
  "Gentle strum": "轻柔扫弦",
  "Half-time": "半速律动",
  "Held chords": "保持和弦",
  "Hold a steady vocal-friendly groove.": "保持适合弹唱的稳定律动。",
  "Hold the final chord.": "保持最后一个和弦。",
  Intro: "前奏",
  "Keep changes smooth.": "保持换和弦顺滑。",
  "Keep it controlled.": "保持稳定克制。",
  "Keep it gentle.": "保持轻柔。",
  "Keep it singable.": "保持适合跟唱。",
  "Keep the E chord tense.": "让 E 和弦保留紧张感。",
  "Keep the first pass simple.": "第一遍保持简单。",
  "Keep the verse narrow and clear.": "主歌保持收束清晰。",
  "Lean into beat one.": "强调每组第一拍。",
  "Leave space between changes.": "换和弦之间留出呼吸。",
  "Let final E ring.": "让最后的 E 和弦延长。",
  "Let notes sustain.": "让音符自然延长。",
  "Let the dominant chord pull.": "让属和弦带出推动感。",
  "Let the final G ring.": "让最后的 G 和弦延长。",
  "Let the last bar lead into the chorus.": "让最后一小节自然导入副歌。",
  "Light Rock Form": "轻摇滚结构",
  "Light down strum": "轻下扫",
  "Make it dance.": "让律动更有舞感。",
  "Make the chorus direct.": "让副歌更直接有力。",
  "Make the chorus warmer.": "让副歌更温暖。",
  "Make this a breath before final chorus.": "把这里当作最终副歌前的呼吸。",
  "Minor Ballad Form": "小调抒情结构",
  "Muted eighths": "闷音八分",
  "Muted groove": "闷音律动",
  Outro: "尾奏",
  "Open power strum": "开放强力扫弦",
  "Open strum": "开放扫弦",
  "Open the sound.": "把声音打开。",
  "Open up the dynamics.": "打开动态层次。",
  "Palm-muted build": "掌根闷音渐强",
  "Pop 1-5-6-4 Form": "流行 1-5-6-4 结构",
  "Prepare the chorus lift.": "为副歌抬升做准备。",
  "Pre-Chorus": "预副歌",
  "Push the top strings.": "突出高音弦。",
  "Raise intensity.": "逐步提高强度。",
  "Relax into the final chord.": "放松落到最后一个和弦。",
  "Resolved tag": "收束反复",
  "Resolve clearly.": "清楚地解决到主和弦。",
  "Return to the story feel.": "回到叙事感。",
  "Rolling pick": "滚动拨弦",
  "Simple down strum": "简单下扫",
  "Slow down lightly": "轻微放慢",
  "Smooth ending": "顺滑收尾",
  Solo: "间奏",
  "Soft arpeggio": "柔和分解和弦",
  "Soft ending": "柔和收尾",
  "Sparse picking": "稀疏拨弦",
  "Start spacious.": "开头保持宽松空间。",
  Swells: "音量渐入",
  "Syncopated clean strum": "切分干净扫弦",
  Tag: "收束段",
  "Tight downstrokes": "紧凑下扫",
  "Untitled Arrangement": "未命名编排",
  "Use a brighter attack.": "使用更明亮的触弦。",
  "Use a relaxed feel.": "保持放松的感觉。",
  "Use it as an instrumental break.": "把它当作器乐间奏。",
  "Use lighter right-hand touch.": "右手触弦轻一点。",
  Verse: "主歌",
  "Verse 1": "主歌 1",
  "Verse 2": "主歌 2",
  "Wide strum": "宽阔扫弦",
  "Worship/Anthem Form": "赞美/颂歌结构",
};

const STYLE_LABELS: Record<SongArrangementStyle, { en: string; zh: string }> = {
  pop: { en: "pop", zh: "流行" },
  folk: { en: "folk", zh: "民谣" },
  ballad: { en: "ballad", zh: "抒情" },
  rock: { en: "rock", zh: "摇滚" },
  worship: { en: "worship", zh: "赞美/颂歌" },
  "city-pop": { en: "city-pop", zh: "City Pop" },
  campfire: { en: "campfire", zh: "篝火弹唱" },
};

const DIFFICULTY_LABELS: Record<SongArrangementDifficulty, { en: string; zh: string }> = {
  beginner: { en: "beginner", zh: "入门" },
  intermediate: { en: "intermediate", zh: "进阶" },
  advanced: { en: "advanced", zh: "高阶" },
};

export function getLocalizedArrangementText(value: string, language: SongArrangementLanguage): string {
  if (language !== "zh") return value;
  return ZH_TEXT[value] ?? value;
}

export function getSongArrangementStyleLabel(style: SongArrangementStyle, language: SongArrangementLanguage): string {
  return STYLE_LABELS[style]?.[language] ?? style;
}

export function getSongArrangementDifficultyLabel(
  difficulty: SongArrangementDifficulty,
  language: SongArrangementLanguage,
): string {
  return DIFFICULTY_LABELS[difficulty]?.[language] ?? difficulty;
}

export function localizeSongArrangementForLanguage(
  arrangement: SongArrangement,
  language: SongArrangementLanguage,
): SongArrangement {
  if (language !== "zh") return arrangement;

  return {
    ...arrangement,
    title: getLocalizedArrangementText(arrangement.title, language),
    sections: arrangement.sections.map((section) => localizeSongSectionForLanguage(section, language)),
  };
}

function localizeSongSectionForLanguage(section: SongSection, language: SongArrangementLanguage): SongSection {
  return {
    ...section,
    name: getLocalizedArrangementText(section.name, language),
    rhythmPattern: getLocalizedArrangementText(section.rhythmPattern, language),
    notes: section.notes ? getLocalizedArrangementText(section.notes, language) : section.notes,
  };
}
