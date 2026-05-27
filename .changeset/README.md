# Changesets

We use [changesets](https://github.com/changesets/changesets) to version shared packages. Apps deploy continuously from `main`; packages publish semantic versions when deps of apps need to pin to stable versions.

## Adding a changeset

```bash
pnpm changeset
```

Pick the packages affected, the bump type (major / minor / patch), write a summary. A markdown file is generated here — commit it in the same PR.

## Publishing (maintainers only)

```bash
pnpm version-packages   # consume pending changesets, bump versions
pnpm release            # build + publish to internal registry
```
