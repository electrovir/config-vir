import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {ShapeMismatchError, defineShape} from 'object-shape-tester';
import {testConfigPaths} from './file-paths.mock.js';
import {loadConfig} from './load-config.js';

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
