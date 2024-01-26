# @vscode/l10n-dev

Tooling used for extracting l10n strings from vscode extensions. Supports extracting strings in usages of:

* `vscode.l10n.t(...)` from the [VS Code API](https://code.visualstudio.com/api/references/vscode-api#l10n)
* `l10n.t(...)` from the [l10n subprocess library](https://github.com/microsoft/vscode-l10n/tree/main/l10n)

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

#### Exporting strings

Here's a simple example of using the command line tool:

```sh
npx @vscode/l10n-dev export --outDir ./l10n ./src
```

This will search all TypeScript files in `./src` and place a `bundle.l10n.json` file in the `./l10n` folder with all the strings you want to be localized. From there you can make a `bundle.l10n.LOCALE.json` file for each locale you want to support. For example, let's say that the command above generates the following `bundle.l10n.json` file:

```json
{
  "Hello": "Hello",
  "Hello {0}": "Hello {0}",
  "Hello {0}/This is a comment": {
    "message": "Hello {0}",
    "comment": ["This is a comment"]
  }
}
```

If you wanted to support French, you would create this in a `bundle.l10n.fr.json` file:

```json
{
  "Hello": "Bonjour",
  "Hello {0}": "Bonjour {0}",
  "Hello {0}/This is a comment": "Bonjour {0}"
}
```

> **Note**
>
> You don't need the comments in the localized bundles since the comments are only useful for translators translating the original bundle.

> **Warning**
>
> Make sure your `package.json` has an `l10n` field that points to where you are storing these bundles. For example:
>
> ```json
> {
>   "main": "./out/extension.js",
>   "l10n": "./l10n"
> }
> ```

##### Psuedo-Localization

If you don't speak another language but want to test out localization changes, you can use the [Pseudolocalization](https://en.wikipedia.org/wiki/Pseudolocalization) generator built in to the `@vscode/l10n-dev` package. Give it a try:

```sh
npx @vscode/l10n-dev generate-pseudo -o ./l10n/ ./l10n/bundle.l10n.json ./package.nls.json
```

This will create a `package.nls.qps-ploc.json` file and a `bundle.l10n.qps-ploc.json` file. If you install the [Pseudo Language Language Pack](https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-qps-ploc), you'll be able to set VS Code to this locale which will pull strings for this extension out of the respective `qps-ploc` files. The `qps-ploc` is the language code for Pseudolocalization used by VS Code.

##### Azure AI Translator (Experimental)

https://github.com/microsoft/vscode-l10n/assets/2644648/5500f414-302f-40d5-a62e-49c7a624bed1

If you have an Azure subscription, you can use the [Azure AI Translator](https://azure.microsoft.com/en-us/services/cognitive-services/translator-text-api/) to generate translations for your extension. Give it a try:

First, set the `AZURE_TRANSLATOR_KEY` and `AZURE_TRANSLATOR_REGION` environment variables. You can get these values from the [Azure Portal](https://portal.azure.com/). Then run:

```sh
npx @vscode/l10n-dev generate-azure -o ./l10n/ ./l10n/bundle.l10n.json ./package.nls.json
```

This will create a `package.nls.<language>.json` file and a `bundle.l10n.<language>.json` file for each language that VS Code supports (you can choose the languages using the `-l` flag).

#### Advanced usage

##### Generating an XLIFF file

The VS Code team generates XLIFF (`.xlf`) files that we then give to translators at Microsoft. The translators then give us back the translated XLIFF files. We then use the `@vscode/l10n-dev` module to generate the localized bundles from the translated XLIFF files. We plan on writing a blog post that goes into more detail about our localization process as a whole.

If you find yourself needing to generate an XLIFF file, you can use the `generate-xlf` command. This command will generate an XLIFF file from the the strings in your `package.nls.json` and your newly extracted strings (`bundle.l10n.json`).

```
npx @vscode/l10n-dev generate-xlf ./package.nls.json ./bundle.l10n.json --outFile vscode-git.xlf
```

> **Note**
>
> `-o` is the alias for `--outFile`. You can optionally specify a `--language` or `-l` to specify the language of the XLIFF file. `en` is the default.

XLIFF has a wide range of tools out there. As we learn about successful workflows, we'll add them here.

##### Importing an XLIFF file

If you receive your translations from your translators in the form of an XLIFF file, you can use the `import-xlf` command to import the translations into `*.l10n.<language>.json` files.

```
npx @vscode/l10n-dev import-xlf ./translations.xlf
```

> **Note**
>
> You can optionally specify an `--outDir` or `-o` to specify where the extracted strings should be written to. Current working directory is the default.

This command will then place a `bundle.l10n.<language>.json` and a `package.nls.<language>.json` file in the current working directory for whatever language that XLIFF file targets.

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
const stringXLIFF = getL10nXlf(map);

// Get the computed l10n json from an xlf file with translations
const l10nDetailsArrayFromXlf = getL10nFilesFromXlf(readFileSync(path.resolve('vscode.git.de.xlf')));
```
