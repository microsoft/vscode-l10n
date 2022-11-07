/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import fetch from 'node-fetch';

export async function readFileFromUri(uri: URL): Promise<string> {
    if (uri.protocol === 'file:') {
        return await readFile(uri, 'utf8');
    }
    if (uri.protocol === 'http:' || uri.protocol === 'https:') {
        const res = await fetch(uri);
        return await res.text();
    }
    throw new Error('Unsupported protocol');
}

export function readFileFromFsPath(fsPath: string): string {
    return readFileSync(fsPath, 'utf8');
}
