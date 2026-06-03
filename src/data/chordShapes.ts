import type { ChordShape } from "../types/music";

export const BUILT_IN_CHORD_SHAPES: Record<string, ChordShape> = {
  C: {
    name: "C",
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    baseFret: 1,
  },
  G: {
    name: "G",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3],
    baseFret: 1,
  },
  D: {
    name: "D",
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    baseFret: 1,
  },
  A: {
    name: "A",
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    baseFret: 1,
  },
  E: {
    name: "E",
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    baseFret: 1,
  },
  F: {
    name: "F",
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    baseFret: 1,
  },
  Am: {
    name: "Am",
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    baseFret: 1,
  },
  Em: {
    name: "Em",
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    baseFret: 1,
  },
  Dm: {
    name: "Dm",
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    baseFret: 1,
  },
  G7: {
    name: "G7",
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, 0, 0, 0, 1],
    baseFret: 1,
  },
  Cmaj7: {
    name: "Cmaj7",
    frets: [-1, 3, 2, 0, 0, 0],
    fingers: [0, 3, 2, 0, 0, 0],
    baseFret: 1,
  },
  Am7: {
    name: "Am7",
    frets: [-1, 0, 2, 0, 1, 0],
    fingers: [0, 0, 2, 0, 1, 0],
    baseFret: 1,
  },
  Dm7: {
    name: "Dm7",
    frets: [-1, -1, 0, 2, 1, 1],
    fingers: [0, 0, 0, 3, 1, 1],
    baseFret: 1,
  },
  Cadd9: {
    name: "Cadd9",
    frets: [-1, 3, 2, 0, 3, 0],
    fingers: [0, 3, 2, 0, 4, 0],
    baseFret: 1,
  },
  Dsus4: {
    name: "Dsus4",
    frets: [-1, -1, 0, 2, 3, 3],
    fingers: [0, 0, 0, 1, 3, 4],
    baseFret: 1,
  },
  Dsus2: {
    name: "Dsus2",
    frets: [-1, -1, 0, 2, 3, 0],
    fingers: [0, 0, 0, 1, 3, 0],
    baseFret: 1,
  },
};
