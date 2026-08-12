import {describe, itCases} from '@augment-vir/test';
import {pathToFileURL} from 'node:url';
import {testConfigPaths} from './file-paths.mock.js';
import {determineReadSource, loadRawConfigContents} from './read-config.js';

describe(determineReadSource.name, () => {
    itCases(determineReadSource, [
        {
            it: 'identifies HTTP URLs as fetch sources',
            input: 'http://example.com/config.json',
            expect: {
                fetch: 'http://example.com/config.json',
            },
        },
        {
            it: 'identifies HTTPS URLs as fetch sources',
            input: 'https://example.com/config.json',
            expect: {
                fetch: 'https://example.com/config.json',
            },
        },
        {
            it: 'identifies file URLs as file sources',
            input: pathToFileURL(testConfigPaths.json).href,
            expect: {
                readFileUrl: pathToFileURL(testConfigPaths.json),
            },
        },
        {
            it: 'identifies file paths as file sources',
            input: testConfigPaths.json,
            expect: {
                readFilePath: testConfigPaths.json,
            },
        },
    ]);
});

describe(loadRawConfigContents.name, () => {
    itCases(loadRawConfigContents, [
        {
            it: 'loads a local JSON config file',
            inputs: [testConfigPaths.json],
            expect: '{\n    "source": "filesystem-json"\n}\n',
        },
        {
            it: 'loads a local YAML config file',
            inputs: [testConfigPaths.yaml],
            expect: 'source: filesystem-yaml\n',
        },
        {
            it: 'loads a local config file from a file URL',
            inputs: [pathToFileURL(testConfigPaths.json).href],
            expect: '{\n    "source": "filesystem-json"\n}\n',
        },
    ]);
});
