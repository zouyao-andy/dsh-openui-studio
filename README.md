# OpenUI for DeepSeek Harness

This plugin adds `/openui` to an ordinary DSH conversation. DSH owns the
conversation, history, reasoning, tool records, and composer. The plugin uses
the selected model to generate OpenUI Lang, validates it against the official
OpenUI chat library, and renders the saved tool result in the chat with the
official OpenUI Renderer and styles.

## Use

In a Standard or PTC conversation, enter `/openui <question>`. The agent passes
relevant facts from the conversation to `openui_generate`. An ordinary message
does not invoke OpenUI. Buttons in the rendered answer insert their prompts
into the DSH composer for review; they do not send automatically.

The generated source is saved as a DSH tool result. Reopening the conversation
renders that result without another model call. The plugin does not create its
own conversations, database, sidebar, composer, or OpenUI mode.

## Implementation

- `src/host/index.js`: command, gated tool, model call, and official schema validation.
- `src/client/chat-answer.js`: displays recorded tool results in DSH's chat turn.
- `src/client/native-answer.js`: official OpenUI Renderer and stylesheet.
- `src/client/tool-results.js`: associates saved tool results with the correct turn.
- `src/client/jsx-runtime.js`: uses DSH's React instance inside the bundled renderer.
- `scripts/gen.mjs`: generates the official OpenUI prompt and schema.
- `scripts/build.mjs`: builds the Host and Client bundles.

The Host makes one generation call and, only when the result is invalid, one
repair call. Invalid output is reported as a tool error rather than saved as a
partial interface. The model route follows DSH's current default selection,
unless `provider` and `model` are configured in `cordis.patch.yml`.
The Client uses OpenUI's default stylesheet and the editable `render.css` file
for local rendering overrides. Click the icon beside **OpenUI Studio** to open
the file in DSH's file pane, then edit it with your preferred editor. Visible
answers refresh within a few seconds after saving; no rebuild or model call is
needed. The file includes `--openui-studio-font`, `--openui-studio-body-size`,
`--openui-studio-body-leading`, and `--openui-studio-heading-size` for common
typography changes. Keep new selectors under `.openui-answer` or
`.openui-native` so they do not affect DSH's own interface.

## Build

```sh
npm install
npm run build
npm test
npm run test:render
```

Install this directory as a DSH bundle with `plugin_manager` or use the
existing linked desktop profile. Restart DSH after rebuilding the bundle.
Only newly generated OpenUI answers use this version; old custom `Stack`
answers are intentionally unsupported.
