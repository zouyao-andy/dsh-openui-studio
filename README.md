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

Newly generated answers draw the full document with separate structure, writing,
and component cursors while the conversation scroll follows their work at a few
deliberate progress points. Titles
and outline labels reveal character by character without replacing OpenUI's DOM;
long prose reveals one paragraph at a time after it enters the viewport, without
slow character-by-character playback. Table rows, cards, and chart marks use
distinct reveals. OpenUI's horizontal ImageText and vertical ImageTextLarge
resize their real image container during playback so adjacent text reflows. The
motion takes its interaction cues from AffectUI Agent Cursors and React Bits
BlurText / AnimatedContent. Saved answers open immediately; the refresh icon
beside **OpenUI Studio** remounts a saved
answer and replays the animation without a model call. Reduced motion skips
playback, and background completions appear immediately. User interaction
reveals the whole document immediately.

For animation diagnosis in the DSH window, include `debug` and `download-log`
in `render.js`'s toolbar and restart DSH. Then click the bug icon beside the replay
button. This replays the answer while recording block, cursor, animation, scroll,
and finish events. When playback ends, click the download icon to save the JSON
log. The log contains geometry and event timing, not answer text. No DevTools
Console is required.

## Implementation

- `src/host/index.js`: command, gated tool, model call, and official schema validation.
- `src/client/chat-answer.js`: displays recorded tool results in DSH's chat turn.
- `src/client/drawing-reveal.js`: animates the saved renderer DOM and follows its active block.
- `src/client/native-answer.js`: official OpenUI Renderer and stylesheet.
- `src/client/tool-results.js`: associates saved tool results with the correct turn.
- `src/client/jsx-runtime.js`: uses DSH's React instance inside the bundled renderer.
- `scripts/gen.mjs`: generates the official OpenUI prompt and schema.
- `scripts/build.mjs`: builds the Host and Client bundles.

The Host makes one generation call and, only when the result is invalid, one
repair call. Invalid output is reported as a tool error rather than saved as a
partial interface. The model route follows DSH's current default selection,
unless `provider` and `model` are configured in `cordis.patch.yml`.
The Client uses OpenUI's default stylesheet and the editable `render.js` file
for local presentation settings. Click the icon beside **OpenUI Studio** to open
the file in DSH's file pane. `css` holds scoped style overrides; the existing
font and size variables remain there. `toolbar` orders or hides the built-in
`replay`, `debug`, and `download-log` buttons; `showEditButton` controls the
configuration icon. `animation.autoPlay` controls first-time playback, and
`animation.followScroll` controls automatic following (when off, only visible
blocks animate). The file is loaded once per DSH run: fully quit and restart
DSH after editing `render.js`. A configuration edit needs no plugin rebuild or
model call. Invalid settings fall back to the bundled defaults and display an
error beside the answer title. The toolbar action names
form the extension point for future registered controls; their handlers remain
in the plugin, not in generated OpenUI content. Keep CSS selectors under
`.openui-answer` or `.openui-native` so they do not affect DSH's own interface.

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
