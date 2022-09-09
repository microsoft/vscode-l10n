export interface l10nJsonMessageFormat {
	message: string;
	comment: string[];
}

export type MessageInfo = string | l10nJsonMessageFormat;

/**
 * The format of package.nls.json and l10n bundle files
 */
export interface l10nJsonFormat {
	[key: string]: MessageInfo;
}

export interface l10nJsonDetails {
	messages: l10nJsonFormat;
	name: string;
	language: string;
}
