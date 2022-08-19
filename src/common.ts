export interface i18nJsonMessageFormat {
	message: string;
	comment: string[];
}

export type MessageInfo = string | i18nJsonMessageFormat;

/**
 * The format of package.nls.json and i18n bundle files
 */
export interface i18nJsonFormat {
	[key: string]: MessageInfo;
}

export interface i18nJsonDetails {
	messages: i18nJsonFormat;
	type: 'bundle' | 'package';
	language: string;
}
