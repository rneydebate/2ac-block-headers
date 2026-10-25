# 2AC Block Headers

A CardMirror plugin. Select the 1NC cards and analytics you want to answer, run **Copy 2AC block headers** from the command palette, and paste. Each argument becomes a Block followed by an Analytic:

```
2AC---AT: Garcia 23
[1NC 1] China doesn't preempt TNW deployment:

2AC---AT: Emboldenment Inevitable
[1NC 2] Emboldenment isn't inevitable:
```

## Insert latest chopped cards

Run **Insert latest chopped cards** with your cursor on an empty line, and the newest batch from your card inbox lands there as real tags, cites and cards, with underlining, emphasis, highlighting and shrink kept.

The card chopping project pushes each batch to a private GitHub repo (`latest.html`, plus `batches/<name>.html`). Set up once in the plugin's settings:

- **Card inbox repo**: `owner/repo`, default `rneydebate/card-inbox`.
- **GitHub token**: a fine-grained token with read-only Contents access to that repo only.
