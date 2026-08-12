import {defineShape} from 'object-shape-tester';
import {loadConfig} from '../index.js';

const config = await loadConfig({
    configPath: './config.yaml',
    configShape: defineShape({
        apiUrl: '',
        retryCount: 0,
    }),
});
