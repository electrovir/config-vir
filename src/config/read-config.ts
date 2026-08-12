import {
    isRuntimeEnv,
    RuntimeEnv,
    wrapInTry,
    type PartialWithUndefined,
    type RequireExactlyOne,
} from '@augment-vir/common';
import {parseUrl} from 'url-vir';
import {FailedToLoadConfigError} from '../errors/failed-to-load-config.error.js';

/** Only these protocols are treated as URLs to fetch the config from. */
const fetchUrlProtocols = [
    'http',
    'https',
];

/** These protocols are treated as file paths to load the config from. */
const readFileUrlProtocols = [
    'file',
];

/**
 * Determine what type of read should be used to load this config path.
 *
 * @category Internal
 */
export function determineReadSource(configPath: string): RequireExactlyOne<{
    fetch: string;
    readFilePath: string;
    readFileUrl: URL;
}> {
    const parsedConfigUrl = wrapInTry(() => parseUrl(configPath), {
        fallbackValue: undefined,
    });

    const configUrlInstance = wrapInTry(() => new URL(configPath), {
        fallbackValue: undefined,
    });

    /** In browsers, we can never read from the file system, so always try to fetch. */
    if (isRuntimeEnv(RuntimeEnv.Web)) {
        return {
            fetch: configPath,
        };
    } else if (parsedConfigUrl) {
        if (fetchUrlProtocols.includes(parsedConfigUrl.protocol)) {
            return {
                fetch: parsedConfigUrl.href,
            };
        } else if (readFileUrlProtocols.includes(parsedConfigUrl.protocol) && configUrlInstance) {
            return {
                readFileUrl: configUrlInstance,
            };
        }
    }
    return {
        readFilePath: configPath,
    };
}

/**
 * Load a config file's raw string contents, either from fetching a URL or reading a local file.
 *
 * @category Internal
 * @throws FailedToLoadConfigError if anything fails
 */
export async function loadRawConfigContents(
    configPath: string,
    options?:
        | PartialWithUndefined<{
              /** Optional fetch override. */
              fetchOverride: typeof globalThis.fetch;
          }>
        | undefined,
): Promise<string> {
    try {
        const readSource = determineReadSource(configPath);

        if (readSource.fetch) {
            const response = await (options?.fetchOverride || globalThis.fetch)(readSource.fetch);

            if (!response.ok) {
                throw new Error(`Failed to fetch config, HTTP ${response.status}.`);
            }

            return response.text();
        } else {
            const readFrom = readSource.readFileUrl || readSource.readFilePath;

            if (!readFrom) {
                throw new Error('Failed to determine config read source.');
            }

            /**
             * Prevent bundlers from statically trying to link `node:fs/promises` in browser builds
             * (which makes no sense and isn't necessary because browser environments cannot take
             * this path anyway.
             */
            const nodeFsPromisesSpecifier = [
                'node:',
                'fs/promises',
            ].join('');
            const {readFile} = await import(nodeFsPromisesSpecifier);

            return readFile(readFrom, 'utf8');
        }
    } catch (error) {
        throw new FailedToLoadConfigError(configPath, error);
    }
}
