# @vscode/l10n-dev

Tooling used for extracting l10n strings from vscode extensions.

## Usage

### As a CLI
```
npm install -g @vscode/l10n-dev
```
or
```
npm install --save-dev @vscode/l10n-dev
```
or `yarn` equivalent.

#### Extracting strings
```
npx @vscode/l10n-dev extract ./src
```
> You can optionally specify an `--outDir` or `-o` to specify where the extracted strings should be written to. Current working directory is the default.

#### Generating an XLF file

If you find yourself needing to generate an XLF file, you can use the `generate-xlf` command. This command will generate an XLF file from the the strings in your `package.nls.json` and your newly extracted strings.

```
npx @vscode/l10n-dev generate-xlf ./package.l10n.json ./bundle.l10n.json --outFile vscode-git.xlf
```
> `-o` is the alias for `--outFile`. You can optionally specify a `--language` or `-l` to specify the language of the XLF file. `en` is the default.

#### Importing an XLF file

If you receive your translations from your translators in the form of an XLF file, you can use the `import-xlf` command to import the translations into `*.l10n.<language>.json` files.

```
npx @vscode/l10n-dev import-xlf ./translations.xlf
```
> You can optionally specify an `--outDir` or `-o` to specify where the extracted strings should be written to. Current working directory is the default.

### As a library

```
npm install --save-dev @vscode/l10n-dev
```
or `yarn` equivalent.

```typescript
import * as path from 'path';
import { readFileSync } from 'fs';
import { getL10nJson, getL10nXlf, getL10nFilesFromXlf, l10nJsonFormat } from '@vscode/l10n-dev';

// Get the computed l10n json from a set of files
const result = getL10nJson([readFileSync('extension.ts', 'utf8')]);

// Get the computed xlf from l10n JSON data
const map = new Map<string, l10nJsonFormat>();
map.set('package', readFileSync(path.resolve('package.l10n.json')));
map.set('bundle', result);
const stringXLF = getL10nXlf(map);

// Get the computed l10n json from an xlf file with translations
const l10nDetailsArrayFromXlf = getL10nFilesFromXlf(readFileSync(path.resolve('vscode.git.de.xlf')));
```

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
