# 2AC Block Headers

A CardMirror plugin. Select the 1NC cards and analytics you want to answer, run **Copy 2AC block headers** from the command palette, and paste. Each argument becomes a Block followed by an Analytic:

```
2AC---AT: Garcia 23
[1NC 1] China doesn't preempt TNW deployment:

2AC---AT: Emboldenment Inevitable
[1NC 2] Emboldenment isn't inevitable:
```

- A card's block uses the cite's author and date ("Garcia 23"). Anything after the date, such as "- Professor of Law", is dropped. Turn off "Keep the year in author names" for just "Garcia".
- An analytic, or a tag with no cite, gets a 1 to 3 word title-case summary of its lead clause, with filler words like "the" and "is" dropped.
- The analytic line flips the argument's lead clause into the 2AC's answer: "won't" becomes "will", "is" becomes "isn't", "causes" becomes "doesn't cause", "No allied buy-in" becomes "Allies buy in" (other "No X" claims become "Yes X"), "Relations high" becomes "Relations low", and a bare noun phrase gets "No" ("Alt causes to US-China relations" becomes "No alt causes to relations"). With two clauses joined by "and", only the first is flipped and the second dropped, unless the second is "solves" ("Consultation is binding and solves" becomes "Consultation doesn't solve"). The flip follows fixed rules, not AI. A claim it can't parse, or one over the word limit, gets `"claim" is wrong` instead. The "Analytic line" setting switches to that style for every argument.
- Undertags and card text are skipped. Numbering follows document order.

Settings (Settings > Plugins > gear): the answering speech (`2AC`), the speech being answered (`1NC`), keep the year in author names (on by default), the word limits, the analytic line style, and restarting the count at each block in the selection.

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

Bump `version` in `cardmirror-plugin.json`, then make a GitHub release with `cardmirror-plugin.json` and `plugin.js` attached as assets. Installed copies pick it up under **Check for updates**.

## Tests

```
node test.js
```
