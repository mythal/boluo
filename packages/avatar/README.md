# Avatar package

The symbol avatars contain pre-generated SVG paths and do not load fonts at runtime.
`src/glyphs.json` is vendored from
[mythal/symbols](https://github.com/mythal/symbols), which owns the symbol set,
font sources, and path generator.

After regenerating the catalog in an adjacent `myth-symbol` checkout, update the
vendored artifact from the Boluo repository root:

```sh
cp ../myth-symbol/glyphs.json packages/avatar/src/glyphs.json
```

The source fonts are licensed under OFL-1.1. See `LICENSES/OFL-1.1.txt` for attribution
and the full license text.
