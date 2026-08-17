import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ShapeMismatchError, defineShape} from 'object-shape-tester';
import {testConfigPaths} from './file-paths.mock.js';
import {loadConfig} from './load-config.js';

type UpdatedConfigTestParams = {
    fileExtension: string;
    createContents: (source: string) => string;
    isModule?: boolean | undefined;
};

async function testUpdatedConfig({
    createContents,
    fileExtension,
    isModule = false,
}: Readonly<UpdatedConfigTestParams>) {
    const tempDirPath = await mkdtemp(join(tmpdir(), 'config-vir-'));
    const configFilePath = join(tempDirPath, `config.${fileExtension}`);

    try {
        if (isModule) {
            await writeFile(join(tempDirPath, 'package.json'), '{"type":"module"}');
        }

        await writeFile(configFilePath, createContents('first'));
        assert.deepEquals(
            await loadConfig({
                configPath: configFilePath,
                configShape: defineShape({
                    source: '',
                }),
            }),
            {
                source: 'first',
            },
        );

        await writeFile(configFilePath, createContents('second'));
        assert.deepEquals(
            await loadConfig({
                configPath: configFilePath,
                configShape: defineShape({
                    source: '',
                }),
            }),
            {
                source: 'second',
            },
        );
    } finally {
        await rm(tempDirPath, {
            force: true,
            recursive: true,
        });
    }
}

describe(loadConfig.name, () => {
    it('loads and validates a local config file', async () => {
        assert.deepEquals(
            await loadConfig({
                configPath: testConfigPaths.json,
                configShape: defineShape({
                    source: '',
                }),
            }),
            {
                source: 'filesystem-json',
            },
        );
    });

    it('loads and validates a config file from a URL', async () => {
        const configUrl = 'https://example.com/config.json';

        assert.deepEquals(
            await loadConfig({
                configPath: configUrl,
                configShape: defineShape({
                    source: '',
                }),
                fetchOverride(input) {
                    assert.strictEquals(input, configUrl);

                    return Promise.resolve(new Response('{"source":"fetch"}'));
                },
            }),
            {
                source: 'fetch',
            },
        );
    });

    it('loads and validates a local TypeScript config file', async () => {
        assert.deepEquals(
            await loadConfig({
                configPath: testConfigPaths.ts,
                configShape: defineShape({
                    enabled: false,
                    source: '',
                }),
            }),
            {
                enabled: true,
                source: 'typescript',
            },
        );
    });

    it('reloads a changed local JavaScript config file', async () => {
        await testUpdatedConfig({
            fileExtension: 'mjs',
            createContents: (source) => `export default {source: '${source}'};`,
        });
    });

    it('reloads a changed local TypeScript config file', async () => {
        await testUpdatedConfig({
            fileExtension: 'ts',
            createContents: (source) => {
                return `const configSource: string = '${source}';

export default {source: configSource};`;
            },
            isModule: true,
        });
    });

    it('reloads a changed local CommonJS config file', async () => {
        await testUpdatedConfig({
            fileExtension: 'cjs',
            createContents: (source) => `module.exports = {source: '${source}'};`,
        });
    });

    it('reloads a changed local CommonJS TypeScript config file', async () => {
        await testUpdatedConfig({
            fileExtension: 'cts',
            createContents: (source) => `module.exports = {source: '${source}'};`,
        });
    });

    it('rejects a local config file that does not match its shape', async () => {
        await assert.throws(
            loadConfig({
                configPath: testConfigPaths.json,
                configShape: defineShape({
                    source: 0,
                }),
            }),
            {
                matchConstructor: ShapeMismatchError,
            },
        );
    });
});
