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
import {determineReadSource, loadRawConfigContents} from './read-config.js';

const cachedNodeConfigModuleHashes = new WeakMap<object, string>();

type ConfigModule = UnknownObject &
    PartialWithUndefined<{
        default: UnknownObject;
    }>;

type ConfigModuleLoadParams = Readonly<
    {
        configPath: string;
    } & PartialWithUndefined<{
        fetchOverride: typeof globalThis.fetch;
    }>
>;

const configModuleImporters: Readonly<
    Partial<Record<ConfigFileType, (moduleImportPath: string) => Promise<ConfigModule>>>
> = {
    [ConfigFileType.Js]: importJavascriptConfigModule,
    [ConfigFileType.Ts]: importTypescriptConfigModule,
};

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
    } else {
        return loadExecutableConfigModule({
            configPath,
            fetchOverride,
            fileType,
        });
    }
}

async function loadExecutableConfigModule({
    configPath,
    fetchOverride,
    fileType,
}: Readonly<
    {
        fileType: ConfigFileType;
    } & ConfigModuleLoadParams
>) {
    const configModuleImporter = configModuleImporters[fileType];

    if (!configModuleImporter) {
        throw new Error(`No parser for config file type '${fileType}'`);
    }

    const configModuleImport = await createConfigModuleImport({
        configPath,
        fetchOverride,
    });
    const nodeConfigModuleCache = await getNodeConfigModuleCache(configPath);

    const cachedConfigModule =
        nodeConfigModuleCache?.configRequire.cache[nodeConfigModuleCache.resolvedConfigPath];

    if (
        nodeConfigModuleCache &&
        (!cachedConfigModule ||
            cachedNodeConfigModuleHashes.get(cachedConfigModule) !==
                configModuleImport.contentsHash)
    ) {
        delete nodeConfigModuleCache.configRequire.cache[nodeConfigModuleCache.resolvedConfigPath];
    }

    const module = await configModuleImporter(configModuleImport.moduleImportPath);
    const loadedConfigModule =
        nodeConfigModuleCache?.configRequire.cache[nodeConfigModuleCache.resolvedConfigPath];

    if (loadedConfigModule) {
        cachedNodeConfigModuleHashes.set(loadedConfigModule, configModuleImport.contentsHash);
    }

    return module.default || module;
}

async function getNodeConfigModuleCache(configPath: string) {
    if (isRuntimeEnv(RuntimeEnv.Web)) {
        return;
    }

    const configReadSource = determineReadSource(configPath);
    /** Prevent bundlers from statically resolving Node-only imports in browser builds. */
    const nodeUrlSpecifier = [
        'node:',
        'url',
    ].join('');
    const configFilePath =
        configReadSource.readFilePath ||
        (configReadSource.readFileUrl &&
            (await import(nodeUrlSpecifier)).fileURLToPath(configReadSource.readFileUrl));

    if (configFilePath) {
        /** Prevent bundlers from statically resolving Node-only imports in browser builds. */
        const nodeModuleSpecifier = [
            'node:',
            'module',
        ].join('');
        const configRequire = (await import(nodeModuleSpecifier)).createRequire(import.meta.url);
        const resolvedConfigPath = configRequire.resolve(configFilePath);

        return {
            configRequire,
            resolvedConfigPath,
        };
    }

    return undefined;
}

async function createConfigModuleImport({configPath, fetchOverride}: ConfigModuleLoadParams) {
    const moduleUrl = new URL(configPath, import.meta.url);
    const contents = await loadRawConfigContents(configPath, {
        fetchOverride,
    });
    const contentsHash = Array.from(
        new Uint8Array(
            await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(contents)),
        ),
    )
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');

    moduleUrl.searchParams.set('config-vir-reload', contentsHash);

    return {
        contentsHash,
        moduleImportPath: moduleUrl.href,
        configPath,
    };
}

async function importJavascriptConfigModule(moduleImportPath: string): Promise<ConfigModule> {
    return await import(moduleImportPath);
}

async function importTypescriptConfigModule(moduleImportPath: string): Promise<ConfigModule> {
    if (isRuntimeEnv(RuntimeEnv.Web)) {
        throw new Error('Cannot execute TS configs in a browser.');
    }

    const tsxApiSpecifier = [
        'tsx',
        '/esm/api',
    ].join('');
    const {tsImport} = await import(tsxApiSpecifier);

    return tsImport(moduleImportPath, import.meta.url);
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
