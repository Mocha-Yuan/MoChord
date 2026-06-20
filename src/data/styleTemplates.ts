export type StyleTemplate = {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
};

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: "mandopop",
    title: "华语流行",
    subtitle: "温暖副歌",
    prompt: "我想写一段适合新手练习的 C 调华语流行温暖副歌，4/4 拍，适合吉他弹唱。",
  },
  {
    id: "city-pop",
    title: "City Pop",
    subtitle: "明亮律动",
    prompt: "我想写一段 A 调 City Pop 吉他律动，听起来明亮、复古、有夜晚城市感。",
  },
  {
    id: "folk",
    title: "民谣弹唱",
    subtitle: "自然叙事",
    prompt: "我想写一段 G 调民谣弹唱吉他和弦，适合初学者，情绪自然、适合讲故事。",
  },
  {
    id: "rnb",
    title: "R&B",
    subtitle: "柔和慢歌",
    prompt: "我想写一段 D 小调 R&B 慢歌吉他和弦，带一点丝滑和声色彩，但按法要友好。",
  },
  {
    id: "rock-chorus",
    title: "摇滚副歌",
    subtitle: "有推动力",
    prompt: "我想写一段 E 调摇滚副歌吉他和弦，节奏有推动力，适合从简单扫弦开始练。",
  },
  {
    id: "cinematic",
    title: "电影感氛围",
    subtitle: "空间感铺陈",
    prompt: "我想写一段 C 小调电影感氛围吉他和弦，适合铺底，听起来有空间感和悬念。",
  },
];
