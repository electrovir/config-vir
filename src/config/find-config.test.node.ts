import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MultipleConfigFilesError} from '../errors/multiple-config-files.error.js';
import {findConfigFile, findConfigFilesUpward} from './find-config.js';

async function withTempFiles(
    filePaths: ReadonlyArray<string>,
    callback: (rootDirectory: string) => Promise<void>,
) {
    const rootDirectory = await mkdtemp(join(tmpdir(), 'config-vir-find-'));
    try {
        await Promise.all(
            filePaths.map(async (filePath) => {
                await mkdir(join(rootDirectory, filePath, '..'), {
                    recursive: true,
                });
                await writeFile(join(rootDirectory, filePath), '{}');
            }),
        );
        await callback(rootDirectory);
    } finally {
        await rm(rootDirectory, {
            force: true,
            recursive: true,
        });
    }
}

describe(findConfigFile.name, () => {
    it('finds the one parsable file and ignores other names and extensions', async () => {
        await withTempFiles(
            [
                '.app/settings.yaml',
                '.app/settings.txt',
                '.app/other.json',
            ],
            async (rootDirectory) => {
                assert.strictEquals(
                    await findConfigFile({
                        directory: rootDirectory,
                        baseName: '.app/settings',
                    }),
                    join(rootDirectory, '.app', 'settings.yaml'),
                );
            },
        );
    });
    it('returns undefined when the directory does not exist', async () => {
        await withTempFiles([], async (rootDirectory) => {
            assert.isUndefined(
                await findConfigFile({
                    directory: rootDirectory,
                    baseName: '.app/settings',
                }),
            );
        });
    });
    it('rejects two matching extensions', async () => {
        await withTempFiles(
            [
                'settings.json',
                'settings.toml',
            ],
            async (rootDirectory) => {
                await assert.throws(
                    findConfigFile({
                        directory: rootDirectory,
                        baseName: 'settings',
                    }),
                    {
                        matchConstructor: MultipleConfigFilesError,
                    },
                );
            },
        );
    });
});

describe(findConfigFilesUpward.name, () => {
    it('finds files nearest first and stops at the stop directory', async () => {
        await withTempFiles(
            [
                'settings.json',
                'home/settings.yml',
                'home/repo/settings.toml',
                'home/repo/packages/settings.json',
            ],
            async (rootDirectory) => {
                assert.deepEquals(
                    await findConfigFilesUpward({
                        startDirectory: join(rootDirectory, 'home', 'repo', 'packages', 'app'),
                        stopDirectory: join(rootDirectory, 'home'),
                        baseName: 'settings',
                    }),
                    [
                        join(rootDirectory, 'home', 'repo', 'packages', 'settings.json'),
                        join(rootDirectory, 'home', 'repo', 'settings.toml'),
                        join(rootDirectory, 'home', 'settings.yml'),
                    ],
                );
            },
        );
    });
});
