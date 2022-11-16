import {JsonValue} from 'type-fest';
import {ConfigOperationLogCallback, ConfigOperationLogEnum} from './logging';

export type LogCallbacks<JsonValueGeneric extends JsonValue, AllowedKeys extends string> = Partial<{
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

export type TransformValueCallback<
    JsonValueGeneric extends JsonValue,
    AllowedKeys extends string,
> = (params: {
    key: AllowedKeys;
    value: JsonValueGeneric;
}) => JsonValueGeneric | Promise<JsonValueGeneric>;
