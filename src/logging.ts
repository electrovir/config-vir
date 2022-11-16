import {relative} from 'path';
import {JsonValue} from 'type-fest';
import {LogCallbacks} from './inputs';

export enum ConfigOperationLogEnum {
    onFileCreation = 'onFileCreation',
    onPropertyUpdate = 'onPropertyUpdate',
    onPropertyAccess = 'onPropertyLoad',
    onPropertyDelete = 'onPropertyDelete',
}

export type ConfigOperationLogCallback<
    JsonValueGeneric extends JsonValue,
    AllowedKeys extends string,
    IncludeValue extends boolean = true,
> =
    | ((params: {
          filePath: string;
          propertyKey: AllowedKeys;
          value: IncludeValue extends true ? JsonValueGeneric : undefined;
      }) => void)
    | undefined;

export type OperationValueType<
    OperationGeneric extends ConfigOperationLogEnum,
    JsonValueGeneric extends JsonValue,
> = Parameters<NonNullable<LogCallbacks<JsonValueGeneric, string>[OperationGeneric]>>[0]['value'];

export function logConfigFileOperation<
    OperationGeneric extends ConfigOperationLogEnum,
    JsonValueGeneric extends JsonValue,
    AllowedKeys extends string,
>({
    propertyKey,
    filePath,
    logCallbacks,
    loggingEnabled,
    operation,
    value,
    relativePathRoot,
}: {
    propertyKey: AllowedKeys;
    filePath: string;
    logCallbacks?: LogCallbacks<JsonValueGeneric, AllowedKeys> | undefined;
    loggingEnabled?: boolean | undefined;
    operation: OperationGeneric;
    value: OperationValueType<OperationGeneric, JsonValueGeneric>;
    relativePathRoot: string;
}) {
    if (!loggingEnabled) {
        return;
    }
    const logCallback = logCallbacks?.[operation];
    if (!logCallback) {
        return;
    }
    logCallback({
        propertyKey,
        filePath: relative(relativePathRoot, filePath),
        // this as cast is weird, but the value type is type guarded very well already in the input parameters
        value: value as undefined & JsonValueGeneric,
    });
}
