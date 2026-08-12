import {join, resolve} from 'node:path';

export const testFilesDirPath = resolve(import.meta.dirname, '..', '..', 'test-files');
export const testConfigPaths = {
    json: join(testFilesDirPath, 'local-config.json'),
    ts: join(testFilesDirPath, 'local-config.ts'),
    yaml: join(testFilesDirPath, 'local-config.yaml'),
};
