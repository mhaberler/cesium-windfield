// Augment the cesium module to declare functions missing from its shipped type definitions
import type { ProviderViewModel } from "cesium";

declare module "cesium" {
  /** @deprecated Use imageryProviderViewModels on Viewer instead */
  function createDefaultImageryProviderViewModels(): ProviderViewModel[];
  /** @deprecated Use terrainProviderViewModels on Viewer instead */
  function createDefaultTerrainProviderViewModels(): ProviderViewModel[];
}
