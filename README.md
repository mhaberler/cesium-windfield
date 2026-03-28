# cesium-windfield

animates a wind field in CesiumJS over time

![image.png](/assets/image.png)

## method

on right-click retrieve a bounded box of u/v values from [open-meteo ](https://open-meteo.com/)and create a [CZML](https://github.com/CesiumGS/cesium/wiki/CZML-Guide) animation.

## Cesium Terrain and Imagery

This demo uses Cesium terrain and imagery which needs an [ION acces token](https://cesium.com/learn/ion/cesium-ion-access-tokens/).

Register a free account at [Cesium ION ](https://ion.cesium.com/signup/?)and create a token.

rename `.env.example` to `.env.development` and set the token in this file.

## Running this application

```sh
bun install
bun run dev
```

For the built, production version

```sh
bun run build
bun run preview
```

Navigate to `localhost:5173`. For the built version navigate to `localhost:4173`

## Available scripts

- `npm run eslint` - Lint this project
- `npm run prettier` - Format all the code to a consistant style
- `npm run prettier-check` - Check the format of code but do not change it
- `npm run dev` - Starts the Vite development server server at `localhost:5173`
- `npm run build` - Runs the Vite production build
- `npm run preview` - Starts a local preview of the production build using [`vite preview`](https://vitejs.dev/guide/cli.html#vite-preview)
