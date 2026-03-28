import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Credit,
  CzmlDataSource,
  GpxDataSource,
  GeoJsonDataSource,
  HeadingPitchRoll,
  Ion,
  KmlDataSource,
  Math as CM,
  ProviderViewModel,
  Quaternion as Q,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  TileMapServiceImageryProvider,
  Transforms,
  VelocityOrientationProperty,
  VelocityVectorProperty,
  Viewer,
  WebMapTileServiceImageryProvider,
  createDefaultImageryProviderViewModels,
  createWorldTerrainAsync,
  defined,
  formatError,
  objectToQuery,
  queryToObject,
  viewerCesiumInspectorMixin,
  viewerDragDropMixin,
  buildModuleUrl,
  JulianDate,
  knockout as ko,
  Ellipsoid,
  ConstantProperty,
  CesiumTerrainProvider,
  createDefaultTerrainProviderViewModels,
  IonResource,
  TimeStandard,
  Terrain,
  createOsmBuildingsAsync,
  HorizontalOrigin,
  VerticalOrigin,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";
import Compass from "@cesium-extends/compass";
import ZoomController from "@cesium-extends/zoom-control";
import { downloadObjectAsJson } from "./download.js";
import { getEndpoint } from "./endpoint.js";
import { valueToJetRGB } from "./colorize.js";
import { addWindToCoordinates } from "./windoffset.js";

const endUserOptions = queryToObject(window.location.search.substring(1));
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

Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3YmJlMzAyYy1hZTY4LTQ4OTUtYTIxMS02NTBlYzc1MDcxNTAiLCJpZCI6MTQ0MjAsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjU0NzE5Mzl9.j9eQVA5txZG-lRmcUBEwgzRuAWzd0fPxgf5LmM_xNLU";

let imageryProvider;
if (defined(endUserOptions.tmsImageryUrl)) {
  imageryProvider = new TileMapServiceImageryProvider({
    url: endUserOptions.tmsImageryUrl,
  });
}
const imageryViewModels = createDefaultImageryProviderViewModels();

// https://github.com/CesiumGS/cesium/blob/master/Apps/Sandcastle/standalone.html
// since we're fiddling the href
buildModuleUrl.getCesiumBaseUrl();

// https://gis.stmk.gv.at/image/services/OGD_DOP/Orthofotos_akt/ImageServer/WMSServer
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
        // subdomains: '1234',
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
let selectedImagery;
if (defined(imagery)) {
  selectedImagery = imageryViewModels[imagery];
} else {
  [selectedImagery] = imageryViewModels;
}

const terrainViewModels = createDefaultTerrainProviderViewModels();

// terrainViewModels.push(
//   new ProviderViewModel({
//     name: 'ALS',
//     iconUrl: "flags/3x2/AT.svg",
//     tooltip: 'ALS',
//     category: 'Other',
//     creationFunction: () => CesiumTerrainProvider.fromUrl('http://172.16.0.106:8083', {

//       requestWaterMask: true,
//       requestVertexNormals: true,
//       credit: new Credit('<a href="https://data.opendataportal.at/dataset/dtm-austria" target="_blank">Source: Austria 10m DEM by Sonny</a>',
//         true),
//     }),
//   }),
// );

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

// self-hosted
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

// self-hosted
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

if (defined(terrain) && !Number.isNaN(terrain)) {
  selectedTerrain = parseInt(terrain, 10);
}

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Viewer("cesiumContainer", {
  // terrain: Terrain.fromWorldTerrain(),
  imageryProviderViewModels: imageryViewModels,
  selectedImageryProviderViewModel: selectedImagery,
  imageryProvider,
  terrainProviderViewModels: terrainViewModels,
  selectedTerrain: terrainViewModels[selectedTerrain],
});

// Fly the camera to San Francisco at the given longitude, latitude, and height.
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

// Add Cesium OSM Buildings, a global 3D buildings layer.
// createOsmBuildingsAsync().then((buildingTileset) => {
//   viewer.scene.primitives.add(buildingTileset);
// });
viewer.extend(viewerDragDropMixin, { clearOnDrop: !defined(noclearondrop) });
if (defined(endUserOptions.inspector)) {
  viewer.extend(viewerCesiumInspectorMixin);
}

if (defined(nav)) {
  const compass = new Compass(viewer, {
    tips: {
      inner: "North",
      outer: "Rotate",
    },
  });
  const zoomController = new ZoomController(viewer, {
    // Stiwoll 75
    home: new Cartesian3.fromDegrees(
      15.211986252816368,
      47.12936449368258,
      50000,
    ),
  });
}

function windToUV(speed, direction) {
  const rad = (direction * Math.PI) / 180;
  const u = -speed * Math.sin(rad); // East-West component
  const v = -speed * Math.cos(rad); // North-South component
  return { u, v };
}

let datasource = null;
let counter = 0;

function getWindField(lon, lat) {
  console.log(lon, lat);

  const box = 0.05; // degrees
  const factor = 20.0;
  const model = "icon_d2";
  const forecast_hours = 24;

  const pressureLevels = [
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

  // https://api.open-meteo.com/v1/forecast?latitude=47&longitude=15&hourly=wind_speed_1000hPa,wind_speed_975hPa,wind_speed_950hPa,wind_speed_925hPa,wind_speed_900hPa,wind_speed_850hPa,wind_speed_800hPa,wind_speed_700hPa,wind_speed_600hPa,wind_speed_500hPa,wind_speed_10m,wind_direction_10m,wind_gusts_10m&models=icon_seamless&forecast_days=1
  const params = pressureLevels
    .map((p) => `wind_speed_${p.key},wind_direction_${p.key}`)
    .join(",");
  let uri = `https://api.open-meteo.com/v1/forecast?hourly=${params},&bounding_box=${lat - box},${lon - box},${lat + box},${lon + box}&models=${model}&forecast_hours=${forecast_hours}`;
  // console.log(uri);
  fetch(uri)
    .then((response) => response.json())
    .then((d) => {
      const czml = [
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

      // Generate wind arrows
      d.forEach((loc, locidx) => {
        pressureLevels.forEach((level, levidx) => {
          // prepare for trajectory interpolation
          // loc.hourly[`wind_u_${level.key}`] = [];
          // loc.hourly[`wind_v_${level.key}`] = [];

          // line start for loc + level
          czml.push({
            id: `start:${locidx}:${levidx}`,
            position: {
              cartographicDegrees: [loc.longitude, loc.latitude, level.alt],
            },
          });

          const t0 = new Date(loc.hourly.time[0]);
          let positions = [];

          loc.hourly.time.forEach((time, timeidx) => {
            const now = new Date(time);
            const secs = (now - t0) / 1000;

            const speed = loc.hourly[`wind_speed_${level.key}`][timeidx];
            const direction =
              loc.hourly[`wind_direction_${level.key}`][timeidx];

            if (speed && direction) {
              // prepare for trajectory interpolation
              // const { u, v } = windToUV(speed, direction)
              // loc.hourly[`wind_u_${level.key}`].push(u)
              // loc.hourly[`wind_v_${level.key}`].push(v)

              const endpoint = getEndpoint(
                loc.latitude,
                loc.longitude,
                direction,
                speed * factor,
              );

              const speed_unit = loc.hourly_units[`wind_speed_${level.key}`];
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

      // Add CZML and enable timeline
      if (datasource) {
        viewer.dataSources.remove(datasource);
      }
      datasource = CzmlDataSource.load(czml);
      viewer.dataSources.add(datasource);
      viewer.timeline.zoomTo(
        JulianDate.fromIso8601(d[0].hourly.time[0]),
        JulianDate.fromIso8601(d[0].hourly.time.slice(-1)[0]),
      );
      viewer.clock.shouldAnimate = true;
    });
}

function getClickCoordinates(viewer) {
  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    console.log("RIGHT_CLICK detected");
    const cartesian = viewer.camera.pickEllipsoid(
      click.position,
      viewer.scene.globe.ellipsoid,
    );
    if (cartesian) {
      const cartographic = Cartographic.fromCartesian(cartesian);
      const longitude = CM.toDegrees(cartographic.longitude);
      const latitude = CM.toDegrees(cartographic.latitude);
      getWindField(longitude, latitude);
    }
  }, ScreenSpaceEventType.RIGHT_CLICK);
}

getClickCoordinates(viewer);
