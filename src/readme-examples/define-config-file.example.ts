import {defineConfigFile} from '..';

export const myConfigFile = defineConfigFile({
    /** Use `as const` here to require one of these exact keys. Leave it out to allow any string. */
    allowedKeys: [
        'a',
        'b',
        'c',
    ] as const,
    /**
     * This callback is called whenever `getWithUpdate` is called and the given propertyKey has no
     * defined value yet.
     *
     * The return value of this callback determines the value type of this config file.
     */
    createValueIfNoneCallback: () => {
        return Math.random();
    },
    /**
     * The given `filePath` is not restricted to `.json` files but the data will be saved in JSON
     * format regardless of the file extension.
     */
    filePath: './path/to/file.json',
});
