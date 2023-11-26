/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';

export async function readFileFromUri(uri: URL): Promise<string> {
    if (uri.protocol === 'file:') {
        return await readFile(uri, 'utf8');
    }
    if (uri.protocol === 'http:' || uri.protocol === 'https:') {
        const res = await fetch(uri.toString(), {
            headers: {
                'Accept-Encoding': 'gzip, deflate',
                'Accept': 'application/json'
            },
            redirect: 'follow',
        });

        if (!res.ok) {
            let error = `Unexpected ${res.status} response while trying to read ${uri}`;
            try {
                error += `: ${await res.text()}`;
            } catch {
                // ignore
            }

            throw new Error(error);
        }
        const decoded = await res.text();
        return decoded;
    }
    throw new Error('Unsupported protocol');
}

export function readFileFromFsPath(fsPath: string): string {
    return readFileSync(fsPath, 'utf8');
}
