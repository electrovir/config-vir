import {extractExtension, getObjectTypedEntries} from '@augment-vir/common';
import {type parse as parseToml} from 'smol-toml';
import {
    type DocumentOptions,
    type ParseOptions as ImportedYamlParseOptions,
    type SchemaOptions,
    type ToJSOptions,
} from 'yaml';

/**
 * Parser options for each config file type.
 *
 * @category Internal
 */
export type ConfigParseOptions = {
    [ConfigFileType.Yaml]: YamlParseOptions;
    [ConfigFileType.Toml]: TomlParseOptions;
};

/**
 * Options supported by the YAML parser.
 *
 * @category Internal
 */
export type YamlParseOptions = ImportedYamlParseOptions &
    DocumentOptions &
    SchemaOptions &
    ToJSOptions;

/**
 * Options supported by the TOML parser.
 *
 * @category Internal
 */
export type TomlParseOptions = NonNullable<Parameters<typeof parseToml>[1]>;

/**
 * Supported config file types.
 *
 * @category Internal
 */
export enum ConfigFileType {
    Json = 'json',
    Ts = 'ts',
    Js = 'js',
    Yaml = 'yaml',
    Toml = 'toml',
}

/**
 * File extensions associated with each supported config file type.
 *
 * @category Internal
 */
export const fileTypeExtensions: Record<ConfigFileType, string[]> = {
    [ConfigFileType.Ts]: [
        '.ts',
        '.tsx',
        '.mts',
        '.cts',
    ],
    [ConfigFileType.Yaml]: [
        '.yml',
        '.yaml',
    ],
    [ConfigFileType.Js]: [
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
        '.es6',
    ],
    [ConfigFileType.Toml]: [
        '.toml',
    ],
    [ConfigFileType.Json]: [
        '.json',
        '.jsonc',
        '.json5',
    ],
};

/**
 * Deduce a config file type from a file path or URL extension.
 *
 * @category Internal
 */
export function deduceFileType(path: string): ConfigFileType | undefined {
    const extension = extractExtension(path).extension;

    return getObjectTypedEntries(fileTypeExtensions).find(
        ([
            ,
            extensions,
        ]) => extensions.includes(extension),
    )?.[0];
}
