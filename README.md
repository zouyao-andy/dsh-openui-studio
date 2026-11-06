# OpenUI Studio for DeepSeek Harness

English | [简体中文](./README.zh-CN.md)

OpenUI Studio adds an on-demand `/openui` command to a normal DeepSeek Harness
(DSH) conversation. It generates [OpenUI Lang](https://openui.com/) with the
selected model, validates the result against the official OpenUI chat library,
and renders it in the conversation with the official OpenUI Renderer. DSH still
owns the conversation, reasoning, history, tool records, and composer.

## Quick start

1. Have DSH installed and select a default model in **Settings → Models**.
2. In **Settings → Plugins → Add plugin**, enter `dsh-openui-studio`. Fully
   quit and reopen DSH after installation or an update. You can also install
   directly from the [GitHub repository](https://github.com/zouyao-andy/dsh-openui-studio).
3. In a Standard or PTC conversation, enter a command such as:

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

For OpenUI source generation, the plugin follows the current DSH conversation's
model, output-token budget, and reasoning effort. If the model produces no usable text, the tool error reports
the stream's finish reason, chunk counts, and raw text length without logging
the model's content. The tool will not start another generation in the same
`/openui` turn. Send a new `/openui` request to retry after a failure.

Buttons in an OpenUI answer insert their suggested question into the DSH
composer and focus it. They never send a message automatically.

## Drawing and replay

New answers use the Swarm Rebuild engine to reconstruct the rendered answer
layer by layer. Its cursors draw frames, type text, place media, duplicate
repeated elements, adjust dimensions, and use alignment guides. The tour
scrolls through unfinished work, then fades back to the live OpenUI answer.

Saved answers open immediately. Click the **replay** icon beside **OpenUI
Studio** to rebuild one without generating it again. Click the canvas or press
Escape to return to the interactive answer. Playback is skipped when reduced
motion is requested or a new answer finishes while DSH is in the background.
The drawing controls follow DSH's light or dark theme; switching themes during
playback returns to the live answer.

The animation snapshots the already-rendered OpenUI DOM. It does not alter the
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
| `animation.followScroll` | `true` | Follow the reconstruction down the conversation. When `false`, show the complete answer immediately. |
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
`provider`, `model`, `maxTokens`, `temperature`, `reasoningEffort`,
`maxQuestionChars`, and `promptSuffix`. Leave the model and generation settings
`null` to use the current DSH conversation's request settings. When a session
has no token budget, the plugin reads the selected model's `defaultMaxTokens`;
if that is unavailable, it lets DSH choose. A non-null plugin value overrides
the corresponding session setting. `maxQuestionChars` limits the question sent
to the generator, and `promptSuffix` appends environment-specific instructions
to the generated official OpenUI prompt. The base prompt and validation schema
still come from the installed OpenUI package. Restart DSH after changing the
plugin configuration. A profile's `cordis.patch.yml` is applied after the
plugin bundle, so it can override these fields for that environment without
editing the plugin source. Interface controls follow the DSH locale; generated
answer text follows the question's language.

## Animation diagnostics

1. Set `toolbar: ['replay', 'debug', 'download-log']` in `render.js` and restart
   DSH.
2. Click the bug icon beside **OpenUI Studio** to replay while recording block,
   cursor, animation, scroll, and finish events.
3. When playback ends, click the download icon to save the JSON log.

The log contains timing and geometry, not answer text. No DevTools Console is
required. Debug and download buttons are hidden by the default toolbar.

## Development

To work from a local checkout with Node.js 20 or newer:

```sh
git clone https://github.com/zouyao-andy/dsh-openui-studio.git
cd dsh-openui-studio
npm ci
npm run build
```

Install that directory as a local bundle through DSH's plugin manager. The
local checkout and npm package use the same plugin ID, so remove an older
`@local/dsh-openui-studio` installation before adding this one.

```sh
npm test
npm run test:render
npm run build
```

`src/host/index.js` handles the command, gated tool, model call, and OpenUI
validation. `src/client/chat-answer.js` places saved results in the DSH turn.
`src/client/native-answer.js` uses the official Renderer and stylesheet.
`src/client/swarm-reveal.js` connects the answer to the adapted Swarm Rebuild
engine in `src/client/vendor/swarm-rebuild.js`. The previous drawing strategy
files remain on this experimental branch for comparison but are not used.
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
The drawing engine is adapted from [Swarm Rebuild](https://github.com/JoelBastoneLopez/swarm-rebuild)
at commit `601f6e2`, under its [MIT License](./src/client/vendor/SWARM_LICENSE).
