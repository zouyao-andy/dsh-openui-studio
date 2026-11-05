# OpenUI Studio for DeepSeek Harness

English | [简体中文](./README.zh-CN.md)

OpenUI Studio adds an on-demand `/openui` command to a normal DeepSeek Harness
(DSH) conversation. It generates [OpenUI Lang](https://openui.com/) with the
selected model, validates the result against the official OpenUI chat library,
and renders it in the conversation with the official OpenUI Renderer. DSH still
owns the conversation, reasoning, history, tool records, and composer.

## Quick start

1. Have DSH installed and select a default model in **Settings → Models**.
2. Clone and build the local bundle with Node.js 20 or newer:

   ```sh
   git clone https://github.com/zouyao-andy/dsh-openui-studio.git
   cd dsh-openui-studio
   npm ci
   npm run build
   ```

3. Install this directory as a local bundle through DSH's `plugin_manager`, or
   use an existing linked desktop profile. Fully quit and reopen DSH after
   building or updating the bundle.
4. In a Standard or PTC conversation, enter a command such as:

   ```text
   /openui Explain KV cache memory usage with a chart and a worked example
   ```

Only an explicit `/openui` request enables OpenUI generation for that turn.
Ordinary messages stay in DSH's normal flow. Attachments are supported; an
attachment-only `/openui` request is also accepted.

The agent calls `openui_generate` with the relevant conversation context. A
valid result is saved as a DSH tool result and shown in the main chat. If the
first result fails OpenUI validation, the plugin makes one repair call. If it
still fails, DSH shows a tool error; no partial interface is saved. Reopening a
conversation renders its saved result without another model call.

Buttons in an OpenUI answer insert their suggested question into the DSH
composer and focus it. They never send a message automatically.

## Drawing and replay

New answers use three cursors for structure, writing, and components. Headings
and outline labels type in; long prose reveals by block as the viewport reaches
it. Tables reveal headers and rows, then adjust the real table width when it is
small enough and does not overflow horizontally. Charts draw axes and marks
according to their type, with a short, bounded resize on suitable charts.
ImageText layouts resize their actual image container so nearby text reflows.

Saved answers open immediately. Click the **replay** icon beside **OpenUI
Studio** to redraw one without generating it again. Playback follows the active
block when enabled. Any pointer, wheel, or keyboard interaction immediately
reveals the complete answer. Playback is skipped when reduced motion is
requested or a new answer finishes while DSH is in the background.

The animation uses the already-rendered OpenUI DOM; it does not alter the
OpenUI Lang result or add records to the conversation.

## Render settings

Edit [`render.js`](./render.js) to customize the presentation layer. Use the
configuration icon beside **OpenUI Studio** to open it in DSH, or edit the file
directly. It exports one JavaScript object:

| Setting | Default | Effect |
| --- | --- | --- |
| `showEditButton` | `true` | Show the icon that opens `render.js`. |
| `toolbar` | `['replay']` | Order or hide `replay`, `debug`, and `download-log`. |
| `animation.autoPlay` | `true` | Draw newly generated answers automatically. Manual replay remains available. |
| `animation.followScroll` | `true` | Follow the drawing down the conversation. When `false`, only initially visible blocks animate. |
| `css` | Bundled stylesheet | Scoped CSS overrides for the OpenUI answer. |

The `css` string includes typography variables such as
`--openui-studio-font`, `--openui-studio-body-size`,
`--openui-studio-body-leading`, and `--openui-studio-heading-size`. Keep custom
selectors under `.openui-answer` or `.openui-native` so they do not affect DSH.
These settings change rendering and controls, not the LLM prompt or saved
answer. Fully quit and reopen DSH after editing `render.js`; no build or new
model call is needed. Invalid settings fall back to the bundled defaults and
show an error beside the answer title.

Model-call settings live separately in [`cordis.patch.yml`](./cordis.patch.yml):
`provider`, `model`, `maxTokens`, `temperature`, and `maxQuestionChars`.
`provider: null` and `model: null` use DSH's current default selection. A
missing model selection causes an explicit error. Restart DSH after changing
the plugin configuration.

## Animation diagnostics

1. Set `toolbar: ['replay', 'debug', 'download-log']` in `render.js` and restart
   DSH.
2. Click the bug icon beside **OpenUI Studio** to replay while recording block,
   cursor, animation, scroll, and finish events.
3. When playback ends, click the download icon to save the JSON log.

The log contains timing and geometry, not answer text. No DevTools Console is
required. Debug and download buttons are hidden by the default toolbar.

## Development

```sh
npm test
npm run test:render
npm run build
```

`src/host/index.js` handles the command, gated tool, model call, and OpenUI
validation. `src/client/chat-answer.js` places saved results in the DSH turn.
`src/client/native-answer.js` uses the official Renderer and stylesheet.
`src/client/drawing-reveal.js` coordinates playback, scrolling, cursors, and
cleanup; `src/client/drawing/` contains one strategy per block type.
`scripts/gen.mjs` generates the official OpenUI prompt and schema, and
`scripts/build.mjs` produces the Host `index.js` and Client `client.js`
bundles. Rebuild and restart DSH after changing plugin source code.

The plugin does not add its own conversation database, sidebar, composer, or
DSH mode. Earlier custom `Stack` answers are intentionally unsupported by this
official-renderer version.

## Community and license

Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to discover
other DSH plugins. For DSH feedback or bug reports, use the
[DeepSeek Harness Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions);
the [DSH Discord community](https://discord.gg/4MrtZUhpxg) is also available.
This plugin is released under the [MIT License](./LICENSE).
