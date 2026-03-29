import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Credit,
  CzmlDataSource,
  HeadingPitchRoll,
  Ion,
  Math as CM,
  ProviderViewModel,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  TileMapServiceImageryProvider,
  Viewer,
  WebMapTileServiceImageryProvider,
  createDefaultImageryProviderViewModels,
  defined,
  queryToObject,
  viewerCesiumInspectorMixin,
  viewerDragDropMixin,
  buildModuleUrl,
  JulianDate,
  CesiumTerrainProvider,
  createDefaultTerrainProviderViewModels,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";
import Compass from "@cesium-extends/compass";
import ZoomController from "@cesium-extends/zoom-control";
import { downloadObjectAsJson } from "./download.ts";
import { getEndpoint } from "./endpoint.ts";
import { valueToJetRGB } from "./colorize.ts";

// --- Types ---

interface HourlyData {
  time: string[];
  [key: string]: unknown;
}

interface OpenMeteoLocation {
  latitude: number;
  longitude: number;
  hourly: HourlyData;
  hourly_units: Record<string, string>;
}

interface PressureLevel {
  key: string;
  alt: number;
}

// --- URL options ---

const endUserOptions = queryToObject(
  window.location.search.substring(1),
) as Record<string, string>;
const {
  autostart,
  multiplier,
  instruments,
  view,
  source,
  debug,
  nav,
  velocityorient,
  terrain,
  noclearondrop,
  nosave,
  imagery,
  shadows,
  instructions,
  atmosphere,
} = endUserOptions;

let selectedTerrain = 1;

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

let imageryProvider: TileMapServiceImageryProvider | undefined;
if (defined(endUserOptions.tmsImageryUrl)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageryProvider = new TileMapServiceImageryProvider({
    url: endUserOptions.tmsImageryUrl,
  } as any);
}
const imageryViewModels = createDefaultImageryProviderViewModels();

// https://github.com/CesiumGS/cesium/blob/master/Apps/Sandcastle/standalone.html
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(buildModuleUrl as any).getCesiumBaseUrl();

imageryViewModels.push(
  new ProviderViewModel({
    name: "Austria Basemap",
    iconUrl:
      "https://www.geoland.at/assets/images/IndexGrid/basemap_hover_en.png",
    tooltip: "Austrian OGD Basemap.\nhttps://www.basemap.at/index_en.html",
    creationFunction() {
      return new WebMapTileServiceImageryProvider({
        url: "https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpeg",
        layer: "bmaporthofoto30cm",
        style: "normal",
        format: "image/jpeg",
        tileMatrixSetID: "google3857",
        maximumLevel: 19,
        rectangle: Rectangle.fromDegrees(8.782379, 46.35877, 17.5, 49.037872),
        credit: new Credit(
          '<a href="https://www.basemap.at/" target="_blank">Datenquelle: basemap.at</a>',
          true,
        ),
      });
    },
  }),
);

// Select one from the existing list to be currently active.
let selectedImagery: ProviderViewModel;
if (defined(imagery)) {
  selectedImagery = imageryViewModels[parseInt(imagery, 10)];
} else {
  [selectedImagery] = imageryViewModels;
}

const terrainViewModels = createDefaultTerrainProviderViewModels();

terrainViewModels.push(
  new ProviderViewModel({
    name: "Sonny Austria 10m DEM qmesh@mah",
    iconUrl: "flags/3x2/AT.svg",
    tooltip: "Sonny 10m DEM",
    category: "Other",
    creationFunction: () =>
      CesiumTerrainProvider.fromUrl(
        "https://static.mah.priv.at/tilesets/austria-10m-sonnyy",
        {
          requestWaterMask: true,
          requestVertexNormals: true,
          credit: new Credit(
            '<a href="https://data.opendataportal.at/dataset/dtm-austria" target="_blank">Source: Austria 10m DEM by Sonny</a>',
            true,
          ),
        },
      ),
  }),
);

terrainViewModels.push(
  new ProviderViewModel({
    name: "Steiermark SE 1m Surface",
    iconUrl: "flags/3x2/AT.svg",
    tooltip: "Steiermark SE 1m DSM",
    category: "Other",
    creationFunction: () =>
      CesiumTerrainProvider.fromUrl(
        "https://static.mah.priv.at/tilesets/dhm-1m-stmk-se",
        {
          requestWaterMask: true,
          requestVertexNormals: true,
          credit: new Credit(
            '<a href="https://data.opendataportal.at/dataset/dtm-austria" target="_blank">Source: Austria 10m DEM by Sonny</a>',
            true,
          ),
        },
      ),
  }),
);

terrainViewModels.push(
  new ProviderViewModel({
    name: "Steiermark SE 1m Terrain",
    iconUrl: "flags/3x2/AT.svg",
    tooltip: "Steiermark SE 1m DTM",
    category: "Other",
    creationFunction: () =>
      CesiumTerrainProvider.fromUrl(
        "https://static.mah.priv.at/tilesets/dgm-1m-stmk-se",
        {
          requestWaterMask: true,
          requestVertexNormals: true,
          credit: new Credit("<a>Source: Austria 10m DEM by Sonny</a>", true),
        },
      ),
  }),
);

terrainViewModels.push(
  new ProviderViewModel({
    name: "CH 10m Terrain",
    iconUrl: "flags/3x2/CH.svg",
    tooltip: "Switzerland 10m DTM",
    category: "Other",
    creationFunction: () =>
      CesiumTerrainProvider.fromUrl(
        "https://static.mah.priv.at/tilesets/ch-10m",
        {
          requestWaterMask: true,
          requestVertexNormals: true,
          credit: new Credit(
            "<a>Source: Switzerland 10m DEM by Sonny</a>",
            true,
          ),
        },
      ),
  }),
);

terrainViewModels.push(
  new ProviderViewModel({
    name: "CZ 10m Terrain",
    iconUrl: "flags/3x2/CZ.svg",
    tooltip: "Czechia 20m DTM",
    category: "Other",
    creationFunction: () =>
      CesiumTerrainProvider.fromUrl(
        "https://static.mah.priv.at/tilesets/cz-20m",
        {
          requestWaterMask: true,
          requestVertexNormals: true,
          credit: new Credit("<a>Source: Czechia 20m DEM by Sonny</a>", true),
        },
      ),
  }),
);

terrainViewModels.push(
  new ProviderViewModel({
    name: "SI 20m Terrain",
    iconUrl: "flags/3x2/SI.svg",
    tooltip: "Slovenia 20m DTM",
    category: "Other",
    creationFunction: () =>
      CesiumTerrainProvider.fromUrl(
        "https://static.mah.priv.at/tilesets/si-20m",
        {
          requestWaterMask: true,
          requestVertexNormals: true,
          credit: new Credit("<a>Source: Slovenia 20m DEM by Sonny</a>", true),
        },
      ),
  }),
);

terrainViewModels.push(
  new ProviderViewModel({
    name: "IT 20m Terrain",
    iconUrl: "flags/3x2/IT.svg",
    tooltip: "Italy 20m DTM",
    category: "Other",
    creationFunction: () =>
      CesiumTerrainProvider.fromUrl(
        "https://static.mah.priv.at/tilesets/it-20m",
        {
          requestWaterMask: true,
          requestVertexNormals: true,
          credit: new Credit("<a>Source: Italy 20m DEM by Sonny</a>", true),
        },
      ),
  }),
);

terrainViewModels.push(
  new ProviderViewModel({
    name: "DE 20m Terrain",
    iconUrl: "flags/3x2/DE.svg",
    tooltip: "Germany 20m DTM",
    category: "Other",
    creationFunction: () =>
      CesiumTerrainProvider.fromUrl(
        "https://static.mah.priv.at/tilesets/de-20m",
        {
          requestWaterMask: true,
          requestVertexNormals: true,
          credit: new Credit("<a>Source: Germany 20m DEM by Sonny</a>", true),
        },
      ),
  }),
);

if (defined(terrain) && !Number.isNaN(Number(terrain))) {
  selectedTerrain = parseInt(terrain, 10);
}

// Initialize the Cesium Viewer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const viewer = new Viewer("cesiumContainer", {
  imageryProviderViewModels: imageryViewModels,
  selectedImageryProviderViewModel: selectedImagery,
  ...(imageryProvider ? { imageryProvider } : {}),
  terrainProviderViewModels: terrainViewModels,
  selectedTerrain: terrainViewModels[selectedTerrain],
} as any);

viewer.camera.flyTo({
  destination: Cartesian3.fromDegrees(
    15.211986252816368,
    47.12936449368258,
    1500,
  ),
  orientation: {
    heading: CM.toRadians(0.0),
    pitch: CM.toRadians(-15.0),
  },
});

viewer.extend(viewerDragDropMixin, { clearOnDrop: !defined(noclearondrop) });
if (defined(endUserOptions.inspector)) {
  viewer.extend(viewerCesiumInspectorMixin);
}

if (defined(nav)) {
  new Compass(viewer, {
    tips: {
      inner: "North",
      outer: "Rotate",
    },
  });
  new ZoomController(viewer, {
    home: Cartesian3.fromDegrees(15.211986252816368, 47.12936449368258, 50000),
  });
}

function windToUV(
  speed: number,
  direction: number,
): { u: number; v: number } {
  const rad = (direction * Math.PI) / 180;
  const u = -speed * Math.sin(rad);
  const v = -speed * Math.cos(rad);
  return { u, v };
}

let datasource: CzmlDataSource | null = null;
let counter = 0;

function getWindField(lon: number, lat: number): void {
  console.log(lon, lat);

  const box = 0.05;
  const factor = 20.0;
  const model = "icon_d2";
  const forecast_hours = 24;

  const pressureLevels: PressureLevel[] = [
    { key: "10m", alt: 10 },
    { key: "1000hPa", alt: 110 },
    { key: "975hPa", alt: 320 },
    { key: "950hPa", alt: 500 },
    { key: "925hPa", alt: 800 },
    { key: "900hPa", alt: 1000 },
    { key: "850hPa", alt: 1500 },
    { key: "700hPa", alt: 3000 },
    { key: "600hPa", alt: 4200 },
    { key: "500hPa", alt: 5500 },
  ];

  const params = pressureLevels
    .map((p) => `wind_speed_${p.key},wind_direction_${p.key}`)
    .join(",");
  const uri = `https://api.open-meteo.com/v1/forecast?hourly=${params},&bounding_box=${lat - box},${lon - box},${lat + box},${lon + box}&models=${model}&forecast_hours=${forecast_hours}`;

  fetch(uri)
    .then((response) => response.json())
    .then((d: OpenMeteoLocation[]) => {
      const czml: object[] = [
        {
          id: "document",
          name: `Windfield ${model} ${lat}/${lon} ${d[0].hourly.time[0]}`,
          version: "1.0",
          clock: {
            interval: `${d[0].hourly.time[0]}/${d[0].hourly.time.slice(-1)[0]}`,
            currentTime: d[0].hourly.time[0],
            multiplier: 3600,
            range: "LOOP_STOP",
            step: "SYSTEM_CLOCK_MULTIPLIER",
          },
        },
      ];

      d.forEach((loc, locidx) => {
        pressureLevels.forEach((level, levidx) => {
          czml.push({
            id: `start:${locidx}:${levidx}`,
            position: {
              cartographicDegrees: [loc.longitude, loc.latitude, level.alt],
            },
          });

          const t0 = new Date(loc.hourly.time[0]);
          const positions: (number | string)[] = [];

          loc.hourly.time.forEach((time, timeidx) => {
            const now = new Date(time);
            const secs = (now.getTime() - t0.getTime()) / 1000;

            const speed = (loc.hourly[`wind_speed_${level.key}`] as number[])[
              timeidx
            ];
            const direction = (
              loc.hourly[`wind_direction_${level.key}`] as number[]
            )[timeidx];

            if (speed && direction) {
              const endpoint = getEndpoint(
                loc.latitude,
                loc.longitude,
                direction,
                speed * factor,
              );

              const speed_unit =
                loc.hourly_units[`wind_speed_${level.key}`];
              const direction_unit =
                loc.hourly_units[`wind_direction_${level.key}`];

              positions.push(...[secs, endpoint[1], endpoint[0], level.alt]);

              czml.push({
                id: `${locidx}_${levidx}_${timeidx}`,
                name: `${level.key}/${level.alt}m ${speed}${speed_unit}/${direction}${direction_unit}`,
                polyline: {
                  positions: {
                    references: [
                      `start:${locidx}:${levidx}#position`,
                      `end:${locidx}:${levidx}:${timeidx}#position`,
                    ],
                  },
                  width: 7,
                  material: {
                    polylineArrow: {
                      color: {
                        rgbaf: valueToJetRGB(speed),
                      },
                    },
                  },
                },
              });
            }
            czml.push({
              id: `end:${locidx}:${levidx}:${timeidx}`,
              position: {
                epoch: loc.hourly.time[0],
                cartographicDegrees: positions,
              },
            });
          });
        });
      });

      const basename =
        `windfield_${lat}/${lon}_${d[0].hourly.time[0]}_${model}_${counter}`.replace(
          ".",
          "_",
        );
      downloadObjectAsJson(czml, `${basename}.czml`);
      downloadObjectAsJson(d, `${basename}.json`);

      counter = counter + 1;

      if (datasource) {
        viewer.dataSources.remove(datasource);
      }
      datasource = CzmlDataSource.load(czml) as unknown as CzmlDataSource;
      viewer.dataSources.add(datasource);
      viewer.timeline.zoomTo(
        JulianDate.fromIso8601(d[0].hourly.time[0]),
        JulianDate.fromIso8601(d[0].hourly.time.slice(-1)[0]),
      );
      viewer.clock.shouldAnimate = true;
    });
}

function getClickCoordinates(v: Viewer): void {
  const handler = new ScreenSpaceEventHandler(v.scene.canvas);
  handler.setInputAction(
    (click: ScreenSpaceEventHandler.PositionedEvent) => {
      console.log("RIGHT_CLICK detected");
      const cartesian = v.camera.pickEllipsoid(
        click.position,
        v.scene.globe.ellipsoid,
      );
      if (cartesian) {
        const cartographic = Cartographic.fromCartesian(cartesian);
        const longitude = CM.toDegrees(cartographic.longitude);
        const latitude = CM.toDegrees(cartographic.latitude);
        getWindField(longitude, latitude);
      }
    },
    ScreenSpaceEventType.RIGHT_CLICK,
  );
}

getClickCoordinates(viewer);

// Suppress TS unused-variable warnings for URL options not yet wired up
void autostart;
void multiplier;
void instruments;
void view;
void source;
void debug;
void velocityorient;
void nosave;
void shadows;
void instructions;
void atmosphere;
void windToUV;
