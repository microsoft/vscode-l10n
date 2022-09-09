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

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
