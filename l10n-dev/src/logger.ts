
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import debug from 'debug';

export const enum LogLevel {
    Verbose = 'VERBOSE',
    Debug = 'DEBUG',
    Warning = 'WARNING'
}

debug.enable(LogLevel.Warning);

export const logger = {
    verbose: debug(LogLevel.Verbose),
    debug: debug(LogLevel.Debug),
    warning: debug(LogLevel.Warning),
    log: console.log,
    error: console.error,
    setLogLevel(level: LogLevel): void {
        switch (level) {
            case LogLevel.Debug:
                debug.enable(LogLevel.Debug);
                break;
            case LogLevel.Verbose:
                debug.enable(LogLevel.Verbose);
                break;
            default:
                break;
        }
        debug.enable(level);
    }
};
