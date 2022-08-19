export interface LocalizeInfo {
	key: string;
	comment: string[];
}

export type KeyInfo = string | LocalizeInfo;
export namespace KeyInfo {
	export function key(value: KeyInfo): string {
		return typeof value === 'string' ? value : value.key;
	}
	export function comment(value: KeyInfo): string[] | undefined {
		return typeof value === 'string' ? undefined : value.comment;
	}
}

export interface JavaScriptMessageBundle {
	[key: string]: string | { message: string; comment: string[] };
}
