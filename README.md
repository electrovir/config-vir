# config-vir

Small package for creating typed json files in backend servers.

# Install

```
npm i config-vir
```

# Usage

## Defining a config file

Use `defineConfigFile` to define a config file:

<!-- example-link: src/readme-examples/define-config-file.example.ts -->

```TypeScript
import {defineConfigFile} from 'config-vir';

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

    /** Extra, optional, options listed below. See TS types for how to use. */
    // logCallbacks,
    // logRelativePath,
    // transformValueCallback,
    // fileInitCallback,
});
```

## Using a config file

The created config file (from above) then exposes the pre-defined keys and several methods:

<!-- example-link: src/readme-examples/using-config-file.example.ts -->

```TypeScript
import {myConfigFile} from './define-config-file.example';

// wrap the operations in an async function so we can use `await`
async function doStuff() {
    /** Use .keys to access the predefined allowed keys. */
    myConfigFile.keys.a;
    myConfigFile.keys.b;
    myConfigFile.keys.c;

    /** Delete the value saved at the given property in the config file. */
    await myConfigFile.deleteProperty(myConfigFile.keys.a);

    /**
     * Get the value stored in the config file under property `myConfigFile.keys.a` OR create a new
     * value using the pre-defined `createValueIfNoneCallback`. Because of this, `getWithUpdate`
     * always returns the given config value type, it's never possibly undefined.
     *
     * This method also applies `transformValueCallback` if it has been defined.
     *
     * This will also create the file if it does not exist.
     */
    await myConfigFile.getWithUpdate(myConfigFile.keys.a);

    /**
     * Read the current value in the config file under property `myConfigFile.keys.a` without any
     * other operations. This will return undefined if the property has no value in the config file
     * or if the config file does not exist on the file system.
     */
    await myConfigFile.readCurrentValue(myConfigFile.keys.a);

    /** Save a new value (`42`) to the config file under property `myConfigFile.keys.a`. */
    await myConfigFile.updateValue(myConfigFile.keys.a, 42);
}

doStuff();
```
