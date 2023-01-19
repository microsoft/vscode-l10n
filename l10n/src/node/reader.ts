/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { xhr, getErrorStatusDescription } from 'request-light';

export async function readFileFromUri(uri: URL): Promise<string> {
    if (uri.protocol === 'file:') {
        return await readFile(uri, 'utf8');
    }
    if (uri.protocol === 'http:' || uri.protocol === 'https:') {
        try {
            const res = await xhr({
                url: uri.toString(),
                followRedirects: 5,
                headers: {
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept': 'application/json'
                }
            });
            const decoded = new TextDecoder().decode(res.body);
            return decoded;
        } catch(e: any) {
            throw new Error(e.responseText ?? getErrorStatusDescription(e.status) ?? e.toString());
        }
    }
    throw new Error('Unsupported protocol');
}

export function readFileFromFsPath(fsPath: string): string {
    return readFileSync(fsPath, 'utf8');
}
