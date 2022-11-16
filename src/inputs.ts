import {JsonValue} from 'type-fest';
import {ConfigOperationLogCallback, ConfigOperationLogEnum} from './logging';

export type LogCallbacks<
    JsonValueGeneric extends JsonValue | unknown,
    AllowedKeys extends string,
> = Partial<{
    [ConfigOperationLogEnum.onFileCreation]: ConfigOperationLogCallback<
        JsonValueGeneric,
        AllowedKeys,
        false
    >;
    [ConfigOperationLogEnum.onPropertyUpdate]: ConfigOperationLogCallback<
        JsonValueGeneric,
        AllowedKeys
    >;
    [ConfigOperationLogEnum.onPropertyAccess]: ConfigOperationLogCallback<
        JsonValueGeneric,
        AllowedKeys
    >;
    [ConfigOperationLogEnum.onPropertyDelete]: ConfigOperationLogCallback<
        JsonValueGeneric,
        AllowedKeys,
        false
    >;
}>;

export type DefineConfigFileInputs<
    JsonValueGeneric extends JsonValue | unknown,
    AllowedKeys extends string,
> = {
    filePath: string;
    allowedKeys: ReadonlyArray<AllowedKeys>;
    logRelativePath?: string;
    logCallbacks?: LogCallbacks<JsonValueGeneric, AllowedKeys> | undefined;
    createValueIfNoneCallback: () => JsonValueGeneric;
};
