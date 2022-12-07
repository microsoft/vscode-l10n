# Localization tooling for Visual Studio Code

This repository contains tooling for localizing Visual Studio Code extensions. Localization for VS Code extension's source code has 4 important parts:

* [`vscode.l10n.t`](#vscodel10nt) - The API for translating strings in your extension's code
* [`@vscode/l10n-dev`](#vscodel10n-dev) - The tooling used for extracting l10n strings from vscode extensions and working with XLF files
* [`@vscode/l10n`](#vscodel10n) - The library used for loading the translations into subprocesses of your extension
* [`package.nls.json`](#packagenlsjson) - The file used for translating static contributions in your extension's `package.json`

Additionally, for a sample of how to use these tools, see the [l10n-sample](https://github.com/microsoft/vscode-extension-samples/tree/main/l10n-sample) in the vscode-extension-samples repo.

## `vscode.l10n.t`

This API, introduced in VS Code 1.73, is used for translating strings in your extension's code. It is a part of the main VS Code extension API and is further documented [here](https://code.visualstudio.com/api/references/vscode-api#l10n).

> **Note**
>
> Make sure you your VS Code engine and `@types/vscode` version in your extension manifest is at least `^1.73.0`.

## `@vscode/l10n-dev`

Tooling used for extracting `l10n` strings from vscode extensions and working with XLF files. See it's dedicated [README](./l10n-dev) for usage instructions.

## `@vscode/l10n`

Library used for loading the translations into subprocesses of your extension. See it's dedicated [README](./l10n) for usage instructions.

> **Note**
>
> You should _NOT_ use this library in your extension's main process. The translations are loaded into the main process by VS Code itself.

## `package.nls.json`

This file, along with `package.nls.{locale}.json` files, are used for translating static contributions in your extension's `package.json`. Here's an example:

Your `./package.json`:

```jsonc
{
  "name": "my-extension",
  "version": "0.0.1",
  "main": "./out/extension.js",
  "l10n": "./l10n",
  //...
  "contributes": {
    "commands": [
      {
        "command": "my-extension.helloWorld",
        // The key is surrounded by % characters
        "title": "%my-extension.helloWorld.title%"
      }
    ]
  }
}
```

Your `./package.nls.json`:

```jsonc
{
  // That same key from the package.json
  "my-extension.helloWorld.title": "Hello World"
}
```

Your `./package.nls.de.json`:

```jsonc
{
  // That same key from the package.json
  "my-extension.helloWorld.title": "Hallo Welt"
}
```

VS Code will automatically load the correct `package.nls.{locale}.json` (or `package.nls.json` for English) file based on the locale of the user. If no translation is available for a given key, VS Code will fall back to the English translation.

> **Note**
>
> [@vscode/l10n-dev](#vscodel10n-dev) has some tooling around these files (converting them to XLIFF files, generating Pseudo-Localization files, etc.) that you can use.

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

### Build steps

First, install all of the dependencies using `npm install`.

If you plan on working with `l10n-dev` it has one additional step. This package requires building the tree-sitter WASM files for the two grammars that we consume. To do this, you can run the following commands:

```
cd l10n-dev
npm run build-wasm
```

> **Note**
>
> On macOS or Windows, you will need to have Docker running in order to build the WASM files. The CLI runs a linux container to build the WASM files.

If you've done this correctly, you should see two `.wasm` files in the `l10n-dev` folder.

At this point you can run the build task in the repo to build in the background and run the tests with `npm test`.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
