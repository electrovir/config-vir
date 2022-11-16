import {dirname, join} from 'path';

const repoRootDirPath = dirname(dirname(__filename));
const testFilesDirPath = join(repoRootDirPath, 'test-files');

export const testConfigs = {
    basic: join(testFilesDirPath, 'basic-config.json'),
};
