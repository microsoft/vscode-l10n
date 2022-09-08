# Localization tooling for Visual Studio Code

This repository contains tooling for localizing Visual Studio Code extensions. Localization for VS Code extension's source code has 4 important parts:

* `vscode.l10n.t` - The API for translating strings in your extension's code
* `@vscode/l10n-dev` - The tooling used for extracting l10n strings from vscode extensions and working with XLF files
* `@vscode/l10n` - The library used for loading the translations into subprocesses of your extension
* `package.l10n.json` - The file used for translating static contributions in your extension's `package.json`

## `vscode.l10n.t`

This API is used for translating strings in your extension's code. It is a part of the main VS Code extension API and id further documented [here](https://code.visualstudio.com/api/references/vscode-api#env).

## `@vscode/l10n-dev`

Tooling used for extracting l10n strings from vscode extensions and working with XLF files. See it's dedicated [README](./l10n-dev) for usage instructions.

## `@vscode/l10n`

Library used for loading the translations into subprocesses of your extension. See it's dedicated [README](./l10n) for usage instructions.

> NOTE: You should _NOT_ use this library in your extension's main process. The translations are loaded into the main process by VS Code itself.

## `package.l10n.json`

> NOTE: for backwards compatibility, `package.nls.json` is also supported.

This file is used for translating static contributions in your extension's `package.json`.
