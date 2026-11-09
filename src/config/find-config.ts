import {check} from '@augment-vir/assert';
import {extractExtension} from '@augment-vir/common';
import {type Dirent} from 'node:fs';
import {MultipleConfigFilesError} from '../errors/multiple-config-files.error.js';
import {deduceFileType} from './file-type.js';

/**
 * Imports Node.js built-ins without letting bundlers statically link them into browser builds,
 * which can never take the file system paths that need them.
 */
async function importNodeBuiltIns() {
    const fs: typeof import('node:fs/promises') = await import(
        [
            'node:',
            'fs/promises',
        ].join('')
    );
    const path: typeof import('node:path') = await import(
        [
            'node:',
            'path',
        ].join('')
    );
    return {
        fs,
        path,
    };
}

/**
 * Params for {@link findConfigFile}.
 *
 * @category Internal
 */
export type FindConfigFileParams = {
    /** The directory to look in. */
    directory: string;
    /**
     * The config file's name without its extension. It may start with sub-directories, like
     * `.my-app/settings`.
     */
    baseName: string;
};

/**
 * Finds the config file named `baseName` with any extension that `loadConfig` can parse. Node.js
 * only.
 *
 * @category Main
 * @returns The file's path, or `undefined` when there is none.
 * @throws MultipleConfigFilesError when more than one extension matches, such as both
 *   `settings.json` and `settings.yaml`.
 */
export async function findConfigFile({
    directory,
    baseName,
}: Readonly<FindConfigFileParams>): Promise<string | undefined> {
    const {fs, path} = await importNodeBuiltIns();
    const basePath = path.join(directory, baseName);
    const searchDirectory = path.dirname(basePath);
    const fileBaseName = path.basename(basePath);

    const entries: Dirent[] = await fs
        .readdir(searchDirectory, {
            withFileTypes: true,
        })
        .catch((error: unknown) => {
            if (check.hasKey(error, 'code') && error.code === 'ENOENT') {
                return [];
            }
            throw error;
        });

    const configPaths = entries
        .filter((entry) => {
            return (
                (entry.isFile() || entry.isSymbolicLink()) &&
                extractExtension(entry.name).basename === fileBaseName &&
                !!deduceFileType(entry.name)
            );
        })
        .map((entry) => path.join(searchDirectory, entry.name))
        .toSorted();

    if (configPaths.length > 1) {
        throw new MultipleConfigFilesError(configPaths);
    }

    return configPaths[0];
}

/**
 * Params for {@link findConfigFilesUpward}.
 *
 * @category Internal
 */
export type FindConfigFilesUpwardParams = Omit<FindConfigFileParams, 'directory'> & {
    /** The first directory to look in. */
    startDirectory: string;
    /**
     * The last directory to look in. When it isn't `startDirectory` or one of its ancestors, the
     * search continues up to the file system root.
     */
    stopDirectory: string;
};

/**
 * Lists `directory` and each of its ancestors, nearest first, ending at `stopDirectory` or the file
 * system root. Explicitly typed because it's recursive.
 */
function listDirectoriesUpward({
    directory,
    stopDirectory,
    path,
}: Readonly<{
    directory: string;
    stopDirectory: string;
    path: typeof import('node:path');
}>): string[] {
    const parent = path.dirname(directory);
    return directory === stopDirectory || parent === directory
        ? [
              directory,
          ]
        : [
              directory,
              ...listDirectoriesUpward({
                  directory: parent,
                  stopDirectory,
                  path,
              }),
          ];
}

/**
 * Runs {@link findConfigFile} in `startDirectory` and in each directory above it up to
 * `stopDirectory`. Node.js only.
 *
 * @category Main
 * @returns Every config file found, nearest first.
 * @throws MultipleConfigFilesError when any one directory has more than one match.
 */
export async function findConfigFilesUpward({
    startDirectory,
    stopDirectory,
    baseName,
}: Readonly<FindConfigFilesUpwardParams>): Promise<string[]> {
    const {path} = await importNodeBuiltIns();
    const directories = listDirectoriesUpward({
        directory: path.resolve(startDirectory),
        stopDirectory: path.resolve(stopDirectory),
        path,
    });
    const found = await Promise.all(
        directories.map(async (directory) => {
            return await findConfigFile({
                directory,
                baseName,
            });
        }),
    );
    return found.filter((configPath) => configPath != undefined);
}
