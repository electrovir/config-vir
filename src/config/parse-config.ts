import {
    isRuntimeEnv,
    parseWithJson5,
    RuntimeEnv,
    type MaybePromise,
    type PartialWithUndefined,
    type UnknownObject,
} from '@augment-vir/common';
import {parse as parseToml} from 'smol-toml';
import {parse as parseYaml} from 'yaml';
import {FailedToParseConfigError} from '../errors/failed-to-parse-config.error.js';
import {ConfigFileType, deduceFileType, type ConfigParseOptions} from './file-type.js';
import {loadRawConfigContents} from './read-config.js';

/**
 * Parse config contents using the forced or deduced file type.
 *
 * @category Internal
 */
export async function parseConfigContents({
    configPath,
    forcedFileType,
    parseOptions,
    fetchOverride,
}: Readonly<
    {
        configPath: string;
    } & PartialWithUndefined<{
        /** Optional fetch override when loading a config via URL. */
        fetchOverride: typeof globalThis.fetch;
        parseOptions: PartialWithUndefined<ConfigParseOptions>;
        forcedFileType: ConfigFileType;
    }>
>): Promise<UnknownObject> {
    const fileType = forcedFileType || deduceFileType(configPath);

    if (!fileType) {
        throw new Error(`Unable to determine config file type from path: '${configPath}'.`);
    }

    const rawContentParser = rawFileContentParsers[fileType];

    if (rawContentParser) {
        const rawContents: string = await loadRawConfigContents(configPath, {
            fetchOverride,
        });

        try {
            return await rawContentParser({
                rawContents,
                parseOptions,
            });
        } catch (error) {
            throw new FailedToParseConfigError(configPath, error);
        }
    } else if (fileType === ConfigFileType.Js) {
        const module = await import(configPath);
        return module.default || module;
    } else if (fileType === ConfigFileType.Ts) {
        if (isRuntimeEnv(RuntimeEnv.Web)) {
            throw new Error('Cannot execute TS configs in a browser.');
        } else {
            const tsxApiSpecifier = [
                'tsx',
                '/esm/api',
            ].join('');
            const {tsImport} = await import(tsxApiSpecifier);
            const module = await tsImport(configPath, import.meta.url);

            return module.default || module;
        }
    } else {
        throw new Error(`No parser for config file type '${fileType}'`);
    }
}

/**
 * Parsers for config formats that can be read as raw text.
 *
 * @category Internal
 */
export const rawFileContentParsers = {
    /** JS configs are imported. */
    js: undefined,
    /** TS configs are imported. */
    ts: undefined,
    /** Parse JSON contents. */
    json(this: void, {rawContents}) {
        return parseWithJson5(rawContents);
    },
    /** Parse TOML contents. */
    toml(this: void, {rawContents, parseOptions}) {
        return parseToml(rawContents, parseOptions?.toml);
    },
    /** Parse YAML contents. */
    yaml(this: void, {rawContents, parseOptions}) {
        return parseYaml(rawContents, parseOptions?.yaml);
    },
} as const satisfies Record<
    ConfigFileType,
    | ((
          this: void,
          params: Readonly<
              {
                  rawContents: string;
              } & PartialWithUndefined<{
                  parseOptions: PartialWithUndefined<ConfigParseOptions>;
              }>
          >,
      ) => MaybePromise<UnknownObject>)
    | undefined
>;
