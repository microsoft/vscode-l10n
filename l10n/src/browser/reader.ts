/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export async function readFileFromUri(uri: URL): Promise<string> {
    if (uri.protocol === 'http:' || uri.protocol === 'https:') {
        const res = await fetch(uri);
        return await res.text();
    }
    throw new Error('Unsupported protocol');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function readFileFromFsPath(_: string): string {
    throw new Error('Unsupported in browser');
}
