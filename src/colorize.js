import colormap from "colormap";

const colors = colormap({
  colormap: "jet", // 'spring', // ,
  nshades: 101,
  format: "float",
  alpha: 1,
});

export function valueToJetRGB(value) {
  const index = Math.round(value);
  return colors[index]; // [r, g, b]
}
