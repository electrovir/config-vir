import {JsonValue} from 'type-fest';

export type ConfigFileDefinition<JsonValueGeneric extends JsonValue, AllowedKeys extends string> = {
    filePath: string;
    /**
     * Gets the saved value.
     *
     * Creates the file if it does not exist. Creates a new value for the requested key if it does
     * not exist AND if the config file was setup with automatic value generation. If not, this
     * possibly returns undefined.
     */
    getWithUpdate: (
        propertyKey: AllowedKeys,
        loggingEnabled?: boolean | undefined,
    ) => Promise<JsonValueGeneric>;
    updateValue(propertyKey: AllowedKeys, value: JsonValueGeneric): Promise<JsonValueGeneric>;
    /** For reading the current value. May return undefined. */
    readCurrentValue(
        propertyKey: AllowedKeys,
        loggingEnabled?: boolean | undefined,
    ): Promise<JsonValueGeneric | undefined>;
    deleteProperty(
        propertyKey: AllowedKeys,
        loggingEnabled?: boolean | undefined,
    ): Promise<boolean>;
    readWholeFile(): Promise<Partial<Record<AllowedKeys, JsonValueGeneric>>>;
    initFile(): Promise<void>;
} & (string extends AllowedKeys
    ? {}
    : {
          keys: Readonly<{[Prop in AllowedKeys]: Prop}>;
      });
