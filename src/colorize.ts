import colormap from "colormap";

const colors: number[][] = colormap({
  colormap: "jet",
  nshades: 101,
  format: "float",
  alpha: 1,
});

export function valueToJetRGB(value: number): number[] {
  const index = Math.round(value);
  return colors[index]; // [r, g, b, a] as 0-1 floats
}
