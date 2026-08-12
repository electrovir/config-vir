import {describe, itCases} from '@augment-vir/test';
import {ConfigFileType, deduceFileType} from './file-type.js';

describe(deduceFileType.name, () => {
    itCases(deduceFileType, [
        {
            it: 'deduces TypeScript files',
            input: 'config.ts',
            expect: ConfigFileType.Ts,
        },
        {
            it: 'deduces TypeScript JSX files',
            input: 'config.tsx',
            expect: ConfigFileType.Ts,
        },
        {
            it: 'deduces TypeScript module files',
            input: 'config.mts',
            expect: ConfigFileType.Ts,
        },
        {
            it: 'deduces TypeScript CommonJS files',
            input: 'config.cts',
            expect: ConfigFileType.Ts,
        },
        {
            it: 'deduces YAML files',
            input: 'config.yaml',
            expect: ConfigFileType.Yaml,
        },
        {
            it: 'deduces YAML shorthand files',
            input: 'config.yml',
            expect: ConfigFileType.Yaml,
        },
        {
            it: 'deduces JavaScript files',
            input: 'config.js',
            expect: ConfigFileType.Js,
        },
        {
            it: 'deduces JavaScript JSX files',
            input: 'config.jsx',
            expect: ConfigFileType.Js,
        },
        {
            it: 'deduces JavaScript module files',
            input: 'config.mjs',
            expect: ConfigFileType.Js,
        },
        {
            it: 'deduces JavaScript CommonJS files',
            input: 'config.cjs',
            expect: ConfigFileType.Js,
        },
        {
            it: 'deduces ECMAScript files',
            input: 'config.es6',
            expect: ConfigFileType.Js,
        },
        {
            it: 'deduces TOML files',
            input: 'config.toml',
            expect: ConfigFileType.Toml,
        },
        {
            it: 'deduces JSON files',
            input: 'config.json',
            expect: ConfigFileType.Json,
        },
        {
            it: 'deduces JSON with comments files',
            input: 'config.jsonc',
            expect: ConfigFileType.Json,
        },
        {
            it: 'deduces JSON5 files',
            input: 'config.json5',
            expect: ConfigFileType.Json,
        },
        {
            it: 'deduces extensions from paths with query strings',
            input: '/configs/config.yaml?version=1',
            expect: ConfigFileType.Yaml,
        },
        {
            it: 'returns undefined for unsupported extensions',
            input: 'config.txt',
            expect: undefined,
        },
        {
            it: 'returns undefined for paths without extensions',
            input: 'config',
            expect: undefined,
        },
    ]);
});
