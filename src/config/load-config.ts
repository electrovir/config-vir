import {type PartialWithUndefined} from '@augment-vir/common';
import {assertValidShape, type Shape} from 'object-shape-tester';
import {type ConfigFileType, type ConfigParseOptions} from './file-type.js';
import {parseConfigContents} from './parse-config.js';

/**
 * Params for {@link loadConfig}.
 *
 * @category Internal
 */
export type LoadConfigParams<ConfigShape extends Shape> = {
    /** Where to read the config file from. */
    configPath: string | URL;
    /** The shape that the parsed config file must adhere to. */
    configShape: ConfigShape;
} & PartialWithUndefined<{
    /**
     * By default, this is inferred from the config path. By setting this, you force the file to be
     * parsed with the given file type.
     */
    fileType: ConfigFileType;
    parseOptions: PartialWithUndefined<ConfigParseOptions>;
    /** Optional fetch override when loading a config via URL. */
    fetchOverride: typeof globalThis.fetch;
}>;

/**
 * Load a config file. All supported file formats will be tried in order.
 *
 * @category Main
 * @throws FailedToParseError: if no supported file formats can parse the loaded file.
 * @throws FailedToLoadConfigError: if the file's raw contents failed to load.
 */
export async function loadConfig<const ConfigShape extends Shape>({
    configPath,
    configShape,
    fileType: forcedFileType,
    parseOptions,
    fetchOverride,
}: Readonly<LoadConfigParams<ConfigShape>>): Promise<Shape['runtimeType']> {
    const loadPath = String(configPath);

    const contents = await parseConfigContents({
        configPath: loadPath,
        forcedFileType,
        parseOptions,
        fetchOverride,
    });

    assertValidShape(contents, configShape, undefined, `Invalid config file: '${loadPath}'.`);

    return contents;
}
