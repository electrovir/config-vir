import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {ConfigFileType} from './file-type.js';
import {rawFileContentParsers} from './parse-config.js';

describe('file type parsers', () => {
    it('parses YAML contents', async () => {
        assert.deepEquals(
            await rawFileContentParsers[ConfigFileType.Yaml]({
                rawContents: 'enabled: true\nname: config\n',
            }),
            {
                enabled: true,
                name: 'config',
            },
        );
    });

    it('parses TOML contents', () => {
        assert.deepEquals(
            rawFileContentParsers[ConfigFileType.Toml]({
                rawContents: '[config]\nenabled = true\nname = "config"\n',
            }),
            {
                config: {
                    enabled: true,
                    name: 'config',
                },
            },
        );
    });
});
