# Llibreries incloses

| Fitxer | Origen | Versió | Llicència |
|---|---|---|---|
| `preact-htm.umd.js` | [`htm/preact/standalone.umd.js`](https://github.com/developit/htm) (Preact + hooks + htm) | htm 3.1.1 | htm: Apache-2.0 · Preact: MIT |
| `qrcode.js` | [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) (codis QR dels vídeos a l'informe) | 1.4.4 | MIT |
| `html-to-image.js` | [`html-to-image`](https://github.com/bubkoo/html-to-image) (`dist/html-to-image.js`, sense el comentari del *source map*): pàgines del PDF de l'informe fet a l'app | 1.11.13 | MIT |

| `mediapipe/` (`vision_bundle.mjs` sense el comentari del *source map*, `vision_wasm_internal.js`, `vision_wasm_internal.wasm`) | [`@mediapipe/tasks-vision`](https://github.com/google-ai-edge/mediapipe) (detector d'objectes) | 0.10.14 | Apache-2.0 |
| `mediapipe/efficientdet_lite0.tflite` | Model [EfficientDet-Lite0 (int8)](https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector) de MediaPipe: troba la persona a les fotos de l'informe per retallar-les | 1 | Apache-2.0 |

Els de `mediapipe/` no van dins del fitxer: es copien a `dist/m365/ai/` i l'app els carrega només quan cal retallar
una foto (16-photocrop.js). Sense ells (fitxer local, Google), les fotos surten senceres.

S'inclouen dins del fitxer final perquè l'aplicació funcioni igual a Google Apps Script,
en local i sense dependre de cap CDN.
