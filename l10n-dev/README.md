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
