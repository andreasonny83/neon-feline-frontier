import type { Player } from "../shared/types.js";
import { WORLD_SIZE } from "../shared/types.js";

const CAT_NAMES = [
  "Meow-tron",
  "Cyber-Whiskers",
  "Pixel-Paw",
  "Bit-Kitten",
  "Neon-Tabby",
  "Glitch-Cat",
  "Data-Pounce",
  "Synth-Claw",
  "Logic-Tail",
  "Laser-Mew",
  "Matrix-Mog",
  "Aero-Fluff",
];

const CAT_COLORS = ["#ff0055", "#00ff99", "#00ccff", "#cc00ff", "#ffcc00"];

function getRandomNeonColor(): string {
  return CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)];
}

export function createPlayer(id: string, withPenny: boolean): Player {
  const name = withPenny
    ? [...CAT_NAMES, "Penny"][Math.floor(Math.random() * CAT_NAMES.length + 1)]
    : CAT_NAMES[Math.floor(Math.random() * CAT_NAMES.length)];
  // const name = withPenny
  //   ? "Penny"
  //   : CAT_NAMES[Math.floor(Math.random() * CAT_NAMES.length)] + "-" + Math.floor(Math.random() * 99);
  const isPenny = name === "Penny";

  return {
    id,
    x: Math.random() * WORLD_SIZE,
    y: Math.random() * WORLD_SIZE,
    direction: 1,
    skinType: isPenny ? 4 : Math.floor(Math.random() * 3),
    name: isPenny
      ? "Penny"
      : CAT_NAMES[Math.floor(Math.random() * CAT_NAMES.length)] + "-" + Math.floor(Math.random() * 99),
    color: isPenny ? "#333" : getRandomNeonColor(),
  };
}
