# Controlled receipt component fixtures

These DTOs are deliberate component doubles. They are not real sandbox, provider, model, compiler or production database observations. Imported source text is never supplied.

Use the existing pinned DOM test runtime (`npm ci --prefix tests/component-runtime --ignore-scripts` when installation is needed), then run from the repository root:

```sh
node --max-old-space-size=512 --import tsx --test tests/source-executions-ui.test.tsx
```

The test resolves the ordinary `tests/component-runtime` installation first. An isolated qualification may instead supply an ignored read-only `node_modules` symlink in this fixture directory. No dependency tree or lockfile is changed by the test.

The CSS loader supplies class names and jsdom models modal open/close; neither measures actual layout or the browser top layer. Root native qualification must check responsive overflow, real focus behavior and the integrated authenticated journey.
