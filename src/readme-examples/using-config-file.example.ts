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
     */
    await myConfigFile.getWithUpdate(myConfigFile.keys.a);

    /**
     * Read the current value in the config file under property `myConfigFile.keys.a` without any
     * other operations. This will return undefined if the property has no value in the config
     * file.
     */
    await myConfigFile.readCurrentValue(myConfigFile.keys.a);

    /** Save a new value (`42`) to the config file under property `myConfigFile.keys.a`. */
    await myConfigFile.updateValue(myConfigFile.keys.a, 42);
}

doStuff();
