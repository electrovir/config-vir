import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {FailedToLoadConfigError} from '../errors/failed-to-load-config.error.js';
import {loadRawConfigContents} from './read-config.js';

describe(loadRawConfigContents.name, () => {
    it('loads config contents from a fetched URL', async () => {
        const configUrl = 'https://example.com/config.json';
        const expectedContents = '{"source":"fetch"}';

        assert.strictEquals(
            await loadRawConfigContents(configUrl, {
                fetchOverride(input) {
                    assert.strictEquals(input, configUrl);

                    return Promise.resolve(new Response(expectedContents));
                },
            }),
            expectedContents,
        );
    });

    it('wraps failed fetched responses', async () => {
        const configUrl = 'https://example.com/missing-config.json';

        await assert.throws(
            loadRawConfigContents(configUrl, {
                fetchOverride() {
                    return Promise.resolve(
                        new Response('missing', {
                            status: 404,
                        }),
                    );
                },
            }),
            {
                matchConstructor: FailedToLoadConfigError,
            },
        );
    });
});
