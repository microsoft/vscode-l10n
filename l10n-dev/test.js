const path = require('path');
const Parser = require('web-tree-sitter');

// Workaround for https://github.com/tree-sitter/tree-sitter/issues/1765
try {
	const matches = /^v(\d+).\d+.\d+$/.exec(process.version);
	if (matches && matches[1]) {
		const majorVersion = matches[1];
		if (parseInt(majorVersion) >= 18) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-ignore
			delete WebAssembly.instantiateStreaming
		}
	}
} catch {
	// ignore any errors here
}

(async () => {
    await Parser.init();
    const parser = new Parser();
    const Lang = await Parser.Language.load(path.join(__dirname, 'tree-sitter-typescript.wasm'));
    parser.setLanguage(Lang);
    const tree = parser.parse('let x = 1;');
    console.log(tree.rootNode.toString());
})();
