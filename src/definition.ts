import {ArrayElement} from '@augment-vir/common';
import {JsonValue} from 'type-fest';
import {DefineConfigFileInputs} from './inputs';

export type ConfigFileDefinition<
    JsonValueGeneric extends JsonValue | unknown,
    AllowedKeys extends string,
    DefinitionGeneric extends DefineConfigFileInputs<JsonValue, AllowedKeys>,
> = {
    keys: Record<AllowedKeys, AllowedKeys>;
    /**
     * Gets the saved value.
     *
     * Creates the file if it does not exist. Creates a new value for the requested key if it does
     * not exist AND if the config file was setup with automatic value generation. If not, this
     * possibly returns undefined.
     */
    getWithUpdate: (
        propertyKey: AllowedKeys,
        loggingEnabled?: boolean,
    ) => Promise<
        DefinitionGeneric['createValueIfNoneCallback'] extends undefined
            ? JsonValueGeneric | undefined
            : 'createValueIfNoneCallback' extends keyof DefinitionGeneric
            ? JsonValueGeneric
            : JsonValueGeneric | undefined
    >;
    updateValue(propertyKey: AllowedKeys, value: JsonValueGeneric): Promise<JsonValueGeneric>;
    /** For reading the current value. May return undefined. */
    readCurrentValue(
        propertyKey: AllowedKeys,
        loggingEnabled?: boolean,
    ): Promise<JsonValueGeneric | undefined>;
    deleteProperty(propertyKey: AllowedKeys, loggingEnabled?: boolean): Promise<boolean>;
};

export type JsonValueFromDefinitionInputs<
    DefinitionGeneric extends DefineConfigFileInputs<
        JsonValue,
        // this value type doesn't care what the type of AllowedKeys is
        any
    >,
> = ReturnType<DefinitionGeneric['createValueIfNoneCallback']>;

export type AllowedKeysFromDefinitionInputs<
    DefinitionInputGeneric extends DefineConfigFileInputs<JsonValue, string>,
> = ArrayElement<DefinitionInputGeneric['allowedKeys']>;
