import {homedir} from 'node:os';
import {defineShape} from 'object-shape-tester';
import {findConfigFilesUpward, loadConfig} from '../index.js';

const settingsPaths = await findConfigFilesUpward({
    startDirectory: process.cwd(),
    stopDirectory: homedir(),
    baseName: '.my-app/settings',
});

const settings = await Promise.all(
    settingsPaths.map(async (configPath) => {
        return await loadConfig({
            configPath,
            configShape: defineShape({
                retryCount: 0,
            }),
        });
    }),
);
