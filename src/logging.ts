import {relative} from 'path';
import {JsonValue} from 'type-fest';
import {DefineConfigFileInputs} from './inputs';

export enum ConfigOperationLogEnum {
    onFileCreation = 'onFileCreation',
    onPropertyUpdate = 'onPropertyUpdate',
    onPropertyAccess = 'onPropertyLoad',
    onPropertyDelete = 'onPropertyDelete',
}

export type ConfigOperationLogCallback<
    JsonValueGeneric extends JsonValue | unknown,
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
    JsonValueGeneric extends JsonValue | unknown,
> = Parameters<
    NonNullable<
        NonNullable<
            DefineConfigFileInputs<JsonValueGeneric, string>['logCallbacks']
        >[OperationGeneric]
    >
>[0]['value'];

export function logConfigFileOperation<
    OperationGeneric extends ConfigOperationLogEnum,
    JsonValueGeneric extends JsonValue | unknown,
    AllowedKeys extends string,
>({
    propertyKey,
    inputs,
    loggingEnabled,
    operation,
    value,
    relativePathRoot,
}: {
    propertyKey: AllowedKeys;
    inputs: DefineConfigFileInputs<
        JsonValueGeneric,
        // we don't care what the type of AllowedKeys is here
        any
    >;
    loggingEnabled?: boolean | undefined;
    operation: OperationGeneric;
    value: OperationValueType<OperationGeneric, JsonValueGeneric>;
    relativePathRoot: string;
}) {
    if (!loggingEnabled) {
        return;
    }
    const logCallback = inputs.logCallbacks?.[operation] as NonNullable<
        DefineConfigFileInputs<JsonValueGeneric, string>['logCallbacks']
    >[OperationGeneric];
    if (!logCallback) {
        return;
    }
    logCallback({
        propertyKey,
        filePath: relative(relativePathRoot, inputs.filePath),
        // this as cast is weird, but the value type is type guarded very well already in the input parameters
        value: value as undefined & JsonValueGeneric,
    });
}
