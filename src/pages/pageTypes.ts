export type AppPage = "home" | "chords" | "practice" | "arranger" | "metronome" | "tuner" | "learning";

export type NavigateToPage = (page: AppPage) => void;
