import type { Language } from "../i18n";

export type HarmonicFunctionInfo = {
  label: string;
  detail: string;
};

const ZH_FUNCTIONS: Record<number, HarmonicFunctionInfo> = {
  1: { label: "稳定", detail: "主和弦像音乐回到家，适合作为开始或落点。" },
  2: { label: "过渡", detail: "二级和弦常用于连接，让进行自然走向下一个功能。" },
  3: { label: "色彩", detail: "三级和弦带来柔和变化，常让旋律有一点内省感。" },
  4: { label: "展开", detail: "四级和弦打开空间，让段落从稳定状态向外延展。" },
  5: { label: "回归", detail: "五级和弦制造回到主和弦的期待，是最常见的推动力。" },
  6: { label: "转暗", detail: "六级和弦带来关系小调色彩，是流行歌常见的情绪变化。" },
  7: { label: "悬念", detail: "七级和弦带有不稳定张力，适合制造短暂悬念。" },
};

const EN_FUNCTIONS: Record<number, HarmonicFunctionInfo> = {
  1: { label: "Stable", detail: "The tonic feels like home and works well as a start or landing point." },
  2: { label: "Bridge", detail: "The second degree connects harmony and helps the progression move forward." },
  3: { label: "Color", detail: "The third degree adds a softer color and a more reflective mood." },
  4: { label: "Open", detail: "The fourth degree opens space and expands away from the tonic." },
  5: { label: "Return", detail: "The fifth degree creates pull back to the tonic and adds momentum." },
  6: { label: "Darker", detail: "The sixth degree brings relative-minor color and emotional contrast." },
  7: { label: "Tension", detail: "The seventh degree is unstable and useful for brief suspense." },
};

export function getHarmonicFunction(degree: number, language: Language = "en"): HarmonicFunctionInfo {
  const table = language === "zh" ? ZH_FUNCTIONS : EN_FUNCTIONS;
  return table[degree] ?? table[1];
}
