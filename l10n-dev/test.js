const path = require('path');
const Parser = require('web-tree-sitter');

(async () => {
    await Parser.init();
    const parser = new Parser();
    const Lang = await Parser.Language.load(path.join(__dirname, 'tree-sitter-typescript.wasm'));
    parser.setLanguage(Lang);
    const tree = parser.parse('let x = 1;');
    console.log(tree.rootNode.toString());
})();
