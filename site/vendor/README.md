# Vendored files

Copied by hand from npm, never fetched at build time. Update them in their own PR: download the package, copy the files listed here, and update the version below.

| Files | Package | Version | License |
|---|---|---|---|
| `marked.esm.js` | [marked](https://github.com/markedjs/marked), `lib/marked.esm.js` | 18.1.1 | MIT, `marked.LICENSE.md` |
| `phosphor/*.svg` | [@phosphor-icons/core](https://github.com/phosphor-icons/core), `assets/regular/` | 2.1.1 | MIT, `phosphor/LICENSE` |
| `fonts/inter-latin-wght-normal.woff2` | [@fontsource-variable/inter](https://fontsource.org/fonts/inter), `files/` | 5.3.0 | OFL-1.1, `fonts/inter.LICENSE.txt` |
| `fonts/jetbrains-mono-latin-wght-normal.woff2` | [@fontsource-variable/jetbrains-mono](https://fontsource.org/fonts/jetbrains-mono), `files/` | 5.3.0 | OFL-1.1, `fonts/jetbrains-mono.LICENSE.txt` |

Notes:

- `marked.esm.js` is used only by the build and is not served. Its last line, a `sourceMappingURL` comment, was removed because the source map isn't vendored.
- Only the icons the site uses are copied. The fonts are the Latin subset; other scripts fall back to system fonts.
- The fonts ship to the site together with their licenses, as the OFL requires.
