# Newton-Game

A first maths & logic game for 5–7 year olds, or whoever wants to learn. Enjoy mateys!

**Play:** https://newton-the-game.netlify.app

## Levels

| Level | Content |
| :-- | :-- |
| 1 | Plus en min (0–10), touch numpad |
| 2 | Plus en min (0–20) |
| 3 | Splitsen (1–10) |
| 4 | Splitsen (1–20) |

## Run locally

No build step: plain ES modules, with Phaser 3.80.1 loaded from the CDN. Serve the repo root
with any static server and open http://localhost:8080:

```bash
python -m http.server 8080
```

Opening `index.html` directly from disk will not work, because browsers block ES modules on `file://`.

## Layout

```
index.html        entry point
src/main.js       Phaser config and scene list
src/scenes/       Start, HyperJump, Level1–4
assets/           images
project.config    Phaser Editor project file
```

## Deploy

Netlify deploys `main` from the repo root (see `netlify.toml`); there is no build command.
Work happens on feature branches. The tag `live-2026-01-18` marks the last manual deploy
before the repo was connected.

## License

MIT, © Christophe van Eysendyck
