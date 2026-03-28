declare module "colormap" {
  interface ColormapOptions {
    colormap: string;
    nshades?: number;
    format?: "float" | "rgb" | "rgbaString" | "hex";
    alpha?: number | number[];
  }
  function colormap(options: ColormapOptions): number[][];
  export default colormap;
}
