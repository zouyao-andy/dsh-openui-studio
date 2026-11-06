// OpenUI presentation settings. Fully quit and restart DSH after editing this
// file. Editing this file alone does not require npm run build or a model call.
export default {
  // Show the icon before "OpenUI Studio" that opens this file in DSH.
  showEditButton: true,

  // Buttons after the title, in this order. Remove an ID to hide its button.
  // replay: redraw the saved answer; debug: redraw and record animation events;
  // download-log: appears after a debug recording has completed.
  // Available IDs: 'replay', 'debug', 'download-log'.
  // Example: toolbar: ['replay', 'debug', 'download-log'],
  toolbar: ['replay'],

  animation: {
    // Play the drawing animation for a newly generated answer. Saved answers
    // can still be replayed manually when this is false.
    autoPlay: true,

    // Follow the reconstructed answer as it is drawn. When false, show the
    // complete answer immediately without starting the cinematic playback.
    followScroll: true,
  },

  // Scoped CSS overrides for the official OpenUI renderer and answer chrome.
  // Use .openui-answer or .openui-native selectors to avoid styling DSH itself.
  // String.raw preserves CSS backslashes inside this template literal.
  css: String.raw`
/* OpenUI Studio render styles */
.openui-turn-answers {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
  margin: 22px 0 10px;
}

.openui-answer {
  min-width: 0;
  --openui-studio-font: Georgia, "Times New Roman", "Songti SC", "Noto Serif CJK SC", SimSun, serif;
  --openui-studio-body-size: 15px;
  --openui-studio-body-leading: 25px;
  --openui-studio-heading-size: 18px;
}

.openui-answer-header {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 0 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  font: 600 12px/18px var(--dsw-font-family, system-ui, sans-serif);
}

.openui-answer-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  margin: -4px 0 -4px -5px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 4px);
  background: transparent;
  color: var(--dsw-alias-state-business-primary);
  cursor: pointer;
}
.openui-answer-edit:hover { background: var(--dsw-alias-state-business-tertiary); }
.openui-answer-edit:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.openui-answer-replay {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 24px;
  height: 24px;
  margin-left: 2px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 4px);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.openui-answer-replay:hover { background: var(--dsw-alias-state-business-tertiary); color: var(--dsw-alias-state-business-primary); }
.openui-answer-replay:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
.openui-answer-replay:disabled { opacity: .45; cursor: default; }
.openui-answer-error { margin-left: auto; color: var(--dsw-alias-state-error-primary); font-weight: 400; }
.openui-answer-content { position: relative; min-width: 0; padding-top: 18px; }

/* The official cards use width:100% and expect border-box sizing. */
.openui-native,
.openui-native *,
.openui-native *::before,
.openui-native *::after { box-sizing: border-box; }

.openui-native {
  color-scheme: light;
  --openui-background: #ffffff;
  --openui-foreground: #ffffff;
  --openui-popover-background: #ffffff;
  --openui-sunk-light: #ffffff;
  --openui-sunk: #f0f5fc;
  --openui-sunk-deep: #e7effa;
  --openui-text-neutral-primary: #24364b;
  --openui-text-neutral-secondary: #586b85;
  --openui-text-neutral-link: #0966d9;
  --openui-text-brand: #0966d9;
  --openui-interactive-accent-default: #1677ff;
  --openui-inverted-background: #1677ff;
  --openui-border-default: #dbe5f1;
  --openui-border-interactive: #b8c9df;
  --openui-info-background: #eaf2ff;
  --openui-radius-3xs: 0px;
  --openui-radius-2xs: 0px;
  --openui-radius-xs: 0px;
  --openui-radius-s: 0px;
  --openui-radius-m: 0px;
  --openui-radius-l: 0px;
  --openui-radius-xl: 0px;
  --openui-radius-2xl: 0px;
  --openui-radius-3xl: 0px;
  --openui-radius-4xl: 0px;
  --openui-radius-5xl: 0px;
  --openui-radius-6xl: 0px;
  --openui-radius-7xl: 0px;
  --openui-radius-8xl: 0px;
  --openui-radius-9xl: 0px;
  --openui-radius-full: 0px;
  --openui-font-body: var(--openui-studio-font);
  --openui-font-heading: var(--openui-studio-font);
  --openui-font-label: var(--openui-studio-font);
  --openui-font-numbers: var(--openui-studio-font);
  --openui-font-variation-regular: normal;
  --openui-font-variation-medium: normal;
  --openui-text-body-xs: 400 12px/18px var(--openui-studio-font);
  --openui-text-body-xs-heavy: 600 12px/18px var(--openui-studio-font);
  --openui-text-body-sm: 400 13px/20px var(--openui-studio-font);
  --openui-text-body-sm-heavy: 600 13px/20px var(--openui-studio-font);
  --openui-text-body-default: 400 var(--openui-studio-body-size)/var(--openui-studio-body-leading) var(--openui-studio-font);
  --openui-text-body-default-heavy: 600 var(--openui-studio-body-size)/var(--openui-studio-body-leading) var(--openui-studio-font);
  --openui-text-body-lg: 400 16px/25px var(--openui-studio-font);
  --openui-text-body-lg-heavy: 600 16px/25px var(--openui-studio-font);
  --openui-text-heading-xs: 600 15px/21px var(--openui-studio-font);
  --openui-text-heading-sm: 600 var(--openui-studio-heading-size)/23px var(--openui-studio-font);
  --openui-text-heading-md: 600 20px/26px var(--openui-studio-font);
  --openui-text-heading-lg: 600 24px/30px var(--openui-studio-font);
  --openui-text-heading-xl: 700 28px/34px var(--openui-studio-font);
  --openui-text-label-xs: 400 12px/15px var(--openui-studio-font);
  --openui-text-label-xs-heavy: 600 12px/15px var(--openui-studio-font);
  --openui-text-label-sm: 400 13px/18px var(--openui-studio-font);
  --openui-text-label-sm-heavy: 600 13px/18px var(--openui-studio-font);
  --openui-text-label-default: 500 14px/20px var(--openui-studio-font);
  --openui-text-label-default-heavy: 600 14px/20px var(--openui-studio-font);
  --openui-text-label-lg: 400 16px/22px var(--openui-studio-font);
  --openui-text-label-lg-heavy: 600 16px/22px var(--openui-studio-font);
  --openui-text-numbers-xs: 400 12px/18px var(--openui-studio-font);
  --openui-text-numbers-xs-heavy: 600 12px/18px var(--openui-studio-font);
  --openui-text-numbers-sm: 400 13px/20px var(--openui-studio-font);
  --openui-text-numbers-sm-heavy: 600 13px/20px var(--openui-studio-font);
  --openui-text-numbers-default: 400 14px/24px var(--openui-studio-font);
  --openui-text-numbers-default-heavy: 600 14px/24px var(--openui-studio-font);
  --openui-text-numbers-lg: 400 16px/25px var(--openui-studio-font);
  --openui-text-numbers-lg-heavy: 600 16px/25px var(--openui-studio-font);
  --openui-text-numbers-heading-sm: 600 16px/23px var(--openui-studio-font);
  --openui-text-numbers-heading-md: 600 20px/26px var(--openui-studio-font);
  --openui-text-numbers-heading-lg: 600 24px/30px var(--openui-studio-font);
  --openui-text-numbers-heading-xl: 600 28px/34px var(--openui-studio-font);
  --openui-text-body-xs-letter-spacing: 0;
  --openui-text-body-xs-heavy-letter-spacing: 0;
  --openui-text-body-sm-letter-spacing: 0;
  --openui-text-body-sm-heavy-letter-spacing: 0;
  --openui-text-body-default-letter-spacing: 0;
  --openui-text-body-default-heavy-letter-spacing: 0;
  --openui-text-body-lg-letter-spacing: 0;
  --openui-text-body-lg-heavy-letter-spacing: 0;
  --openui-text-label-xs-letter-spacing: 0;
  --openui-text-label-xs-heavy-letter-spacing: 0;
  --openui-text-label-sm-letter-spacing: 0;
  --openui-text-label-sm-heavy-letter-spacing: 0;
  --openui-text-label-default-letter-spacing: 0;
  --openui-text-label-default-heavy-letter-spacing: 0;
  --openui-text-label-lg-letter-spacing: 0;
  --openui-text-label-lg-heavy-letter-spacing: 0;
  --openui-text-heading-xs-letter-spacing: 0;
  --openui-text-heading-sm-letter-spacing: 0;
  --openui-text-heading-md-letter-spacing: 0;
  --openui-text-heading-lg-letter-spacing: 0;
  --openui-text-heading-xl-letter-spacing: 0;
  --openui-text-numbers-xs-letter-spacing: 0;
  --openui-text-numbers-xs-heavy-letter-spacing: 0;
  --openui-text-numbers-sm-letter-spacing: 0;
  --openui-text-numbers-sm-heavy-letter-spacing: 0;
  --openui-text-numbers-default-letter-spacing: 0;
  --openui-text-numbers-default-heavy-letter-spacing: 0;
  --openui-text-numbers-lg-letter-spacing: 0;
  --openui-text-numbers-lg-heavy-letter-spacing: 0;
  --openui-text-numbers-heading-sm-letter-spacing: 0;
  --openui-text-numbers-heading-md-letter-spacing: 0;
  --openui-text-numbers-heading-lg-letter-spacing: 0;
  --openui-text-numbers-heading-xl-letter-spacing: 0;
}

.openui-native .openui-overview-card {
  padding: 18px;
  box-shadow: none;
}

:is(body[data-ds-dark-theme], html[data-theme="dark"], html[data-openui-theme="dark"]) .openui-native {
  color-scheme: dark;
  --openui-background: #000000;
  --openui-foreground: #111111;
  --openui-popover-background: #181818;
  --openui-sunk-light: #181818;
  --openui-sunk: #232323;
  --openui-sunk-deep: #2a2a2a;
  --openui-text-neutral-primary: #f1f1f1;
  --openui-text-neutral-secondary: #b0b0b0;
  --openui-text-neutral-link: #91caff;
  --openui-text-brand: #91caff;
  --openui-interactive-accent-default: #69a9ff;
  --openui-inverted-background: #69a9ff;
  --openui-border-default: #2e2e2e;
  --openui-border-interactive: #474747;
  --openui-info-background: #1b2a40;
  --openui-success-background: #13291f;
  --openui-alert-background: #30250f;
  --openui-danger-background: #3a1b19;
  --openui-purple-background: #261f3a;
  --openui-pink-background: #371b2a;
  --openui-text-success-primary: #8fd3b2;
  --openui-text-alert-primary: #e6c27c;
  --openui-text-danger-primary: #f0a39b;
}
`,
}
