/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from "pseudo-localization";
import { l10nJsonFormat } from "../common";

export function pseudoLocalizedTranslate(dataToLocalize: l10nJsonFormat): l10nJsonFormat {
	// deep clone
	const contents = JSON.parse(JSON.stringify(dataToLocalize));
	for (const key of Object.keys(contents)) {
		const value = contents[key];
		const message = typeof value === 'string' ? value : value!.message;
		let index = 0;
		let localized = '';
		// escape command and icon syntax
		for (const match of message.matchAll(/(?:\(command:\S+)|(?:\$\([A-Za-z-~]+\))|(?:\{\S+\})/g)) {
			const section = localize(message.substring(index, match.index));
			localized += section + match[0]!;
			index = match.index! + match[0]!.length;
		}

		contents[key] = index === 0
			? localize(message)
			: localized + localize(message.substring(index));
	}

	return contents;
}
