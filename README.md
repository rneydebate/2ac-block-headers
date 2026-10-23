# 2AC Block Headers

A CardMirror plugin. Select the 1NC cards and analytics you want to answer, run **Copy 2AC block headers** from the command palette, and paste. Each argument becomes a Block followed by an Analytic:

```
2AC---AT: Garcia 23
[1NC 1] "China preempts TNW deployment" is wrong:

2AC---AT: Emboldenment Inevitable
[1NC 2] "Emboldenment inevitable" is wrong:
```

- A card's block uses the cite's author and date ("Garcia 23"). Anything after the date, such as "- Professor of Law", is dropped. Turn off "Keep the year in author names" for just "Garcia".
- An analytic, or a tag with no cite, gets a 1 to 3 word title-case summary of its lead clause, with filler words like "the" and "is" dropped.
- The quoted claim is the first clause of the tag, cut at `---` or the first sentence break.
- Undertags and card text are skipped. Numbering follows document order.

Settings (Settings > Plugins > gear): the answering speech (`2AC`), the speech being answered (`1NC`), keep the year in author names (on by default), the word limits, and restarting the count at each block in the selection.

## Install from GitHub (desktop app only)

This repo isn't on CardMirror's curated plugin list, so allow community installs first: open the developer tools ("Toggle Developer Tools" in the command palette, or Ctrl+Shift+I) and run `__plugins('community-on')` in the Console. It stays on.

Then in Settings > Plugins, enter `rneydebate/2ac-block-headers`, click Install, and enable **2AC Block Headers**. Later versions show up under **Check for updates**.

## Install by hand

1. Quit CardMirror.
2. Open `%APPDATA%\@cardmirror\desktop\plugins` (Win+R, paste, Enter).
3. Make a folder named exactly `cardmirror-2ac-headers` and put `plugin.js` and `cardmirror-plugin.json` in it.
4. Start CardMirror. In Settings > Plugins, check the box next to **2AC Block Headers**. The gear next to it opens the settings.

It then loads at every launch. To update, replace `plugin.js` and restart CardMirror.

**Load plugin from file...** also works for a quick try, but only until you quit, with no settings gear. Loading it again in the same session keeps the old code, so restart after any change.

## Publish

Make a GitHub release with `cardmirror-plugin.json` and `plugin.js` attached as assets. Installing from GitHub only works for repos on CardMirror's allowlist, so ask the CardMirror maintainer to list it.

## Tests

```
node test.js
```
