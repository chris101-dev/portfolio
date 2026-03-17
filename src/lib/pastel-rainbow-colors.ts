export type PastelRainbowColor = {
  name: string;
  hex: string;
  rgb: string;
};

// Ordered as requested: yellow, orange, red, pink, purple, blue, cyan, green.
export const pastelRainbowColors: PastelRainbowColor[] = [
  { name: "yellow", hex: "#F9E79F", rgb: "249 231 159" },
  { name: "orange", hex: "#F8CBA6", rgb: "248 203 166" },
  { name: "red", hex: "#F5B7B1", rgb: "245 183 177" },
  { name: "pink", hex: "#F5C6EC", rgb: "245 198 236" },
  { name: "purple", hex: "#D7BDE2", rgb: "215 189 226" },
  { name: "blue", hex: "#AED6F1", rgb: "174 214 241" },
  { name: "cyan", hex: "#A9DFEF", rgb: "169 223 239" },
  { name: "green", hex: "#ABEBC6", rgb: "171 235 198" },
];
