import {
    getObjectTypedKeys,
    isTypeOfWithArray,
    joinWithFinalConjunction,
    typedHasProperty,
} from '@augment-vir/common';
import {appendJson, readJson, writeJson} from '@augment-vir/node-js';
import {existsSync} from 'fs';
import {basename} from 'path';
import {JsonValue} from 'type-fest';
import {ConfigFileDefinition} from './definition';
import {FileInitCallback, LogCallbacks, TransformValueCallback} from './inputs';
import {ConfigOperationLogEnum, logConfigFileOperation, OperationValueType} from './logging';

type PredefinedValues<JsonValueGeneric extends JsonValue, AllowedKeys extends string> = Partial<
    Readonly<Record<AllowedKeys, JsonValueGeneric>>
>;

export type DefineConfigFileInputs<
    JsonValueGeneric extends JsonValue,
    AllowedKeys extends string,
> = {
    filePath: string;
    allowedKeys?: ReadonlyArray<AllowedKeys> | undefined;
    logRelativePath?: string | undefined;
    logCallbacks?: LogCallbacks<JsonValueGeneric, AllowedKeys> | undefined;
    transformValueCallback?: TransformValueCallback<JsonValueGeneric, AllowedKeys> | undefined;
    fileInitCallback?: FileInitCallback | undefined;
} & (
    | {
          createValueIfNoneCallback: () => JsonValueGeneric | Promise<JsonValueGeneric>;
          predefinedValues?: PredefinedValues<JsonValueGeneric, AllowedKeys>;
      }
    | {
          createValueIfNoneCallback?:
              | (() => JsonValueGeneric | Promise<JsonValueGeneric>)
              | undefined;
          predefinedValues: NonNullable<PredefinedValues<JsonValueGeneric, AllowedKeys>>;
      }
);

export function defineConfigFile<
    JsonValueGeneric extends JsonValue,
    AllowedKeys extends string = string,
>(
    inputs: DefineConfigFileInputs<JsonValueGeneric, AllowedKeys>,
): ConfigFileDefinition<JsonValueGeneric, AllowedKeys> {
    const logRelativePath = inputs.logRelativePath || process.cwd();

    const shouldHaveKeys = inputs.allowedKeys || inputs.predefinedValues;
    const maybeKeys = [
        ...(inputs.allowedKeys || []),
        ...getObjectTypedKeys(inputs.predefinedValues ?? {}),
    ].reduce((accum, currentKey) => {
        accum[currentKey] = currentKey;
        return accum;
    }, {} as Record<AllowedKeys, AllowedKeys>);

    const keys: Record<AllowedKeys, AllowedKeys> | undefined = shouldHaveKeys
        ? maybeKeys
        : undefined;

    async function transformValue(
        key: AllowedKeys,
        value: JsonValueGeneric,
    ): Promise<JsonValueGeneric> {
        if (inputs.transformValueCallback) {
            return await inputs.transformValueCallback({key, value});
        } else {
            return value;
        }
    }

    function checkKey(key: AllowedKeys): void {
        if (!inputs.allowedKeys) {
            return;
        }
        if (!inputs.allowedKeys.includes(key)) {
            throw new Error(
                `Key "${key}" is not allowed for config file "${basename(
                    inputs.filePath,
                )}". Expected one of the following: ${joinWithFinalConjunction(
                    inputs.allowedKeys as ReadonlyArray<string> as string[],
                    'or',
                )}`,
            );
        }
    }

    async function getCurrentJson(): Promise<Record<string, any>> {
        const rawContents = await readJson<any>(inputs.filePath);

        if (!isTypeOfWithArray(rawContents, 'object')) {
            throw new Error(
                `Cannot use file "${inputs.filePath}" as a JSON config file: it does not contain a JSON object.`,
            );
        }

        return rawContents;
    }

    async function initFile() {
        if (inputs.fileInitCallback) {
            await inputs.fileInitCallback(inputs.filePath);
        }

        // ensure the file is created even after the init callback
        if (!existsSync(inputs.filePath)) {
            await writeJson(inputs.filePath, {});
        }
    }

    async function updateValue(
        propertyKey: AllowedKeys,
        value: JsonValueGeneric,
    ): Promise<JsonValueGeneric> {
        checkKey(propertyKey);
        await appendJson(inputs.filePath, {[propertyKey]: value});
        return value;
    }

    const definition: ConfigFileDefinition<JsonValueGeneric, AllowedKeys> = {
        /**
         * As cast here because the type for the keys property is too advanced for TypeScript to
         * figure it out during this assignment.
         */
        keys: keys as any,
        filePath: inputs.filePath,
        async deleteProperty(
            propertyKey: AllowedKeys,
            loggingEnabled?: boolean | undefined,
        ): Promise<boolean> {
            checkKey(propertyKey);

            if (!existsSync(inputs.filePath)) {
                return false;
            }

            const fileContents = await getCurrentJson();

            if (propertyKey in fileContents) {
                logConfigFileOperation({
                    propertyKey,
                    filePath: inputs.filePath,
                    logCallbacks: inputs.logCallbacks,
                    loggingEnabled,
                    operation: ConfigOperationLogEnum.onPropertyDelete,
                    value: undefined,
                    relativePathRoot: logRelativePath,
                });
                delete fileContents[propertyKey];
                await writeJson(inputs.filePath, fileContents);
                return true;
            } else {
                return false;
            }
        },
        async getWithUpdate(
            propertyKey: AllowedKeys,
            loggingEnabled?: boolean | undefined,
        ): Promise<JsonValueGeneric> {
            function logOperation<OperationGeneric extends ConfigOperationLogEnum>(
                operation: OperationGeneric,
                value: OperationValueType<OperationGeneric, JsonValueGeneric>,
            ) {
                logConfigFileOperation({
                    propertyKey,
                    filePath: inputs.filePath,
                    logCallbacks: inputs.logCallbacks,
                    loggingEnabled,
                    operation,
                    value,
                    relativePathRoot: logRelativePath,
                });
            }

            checkKey(propertyKey);

            if (!existsSync(inputs.filePath)) {
                logOperation(ConfigOperationLogEnum.onFileCreation, undefined);
                await initFile();
            }

            const fileContents = await getCurrentJson();

            let value: JsonValueGeneric;

            if (propertyKey in fileContents) {
                value = fileContents[propertyKey];
                logOperation(ConfigOperationLogEnum.onPropertyAccess, value);
            } else {
                if (
                    inputs.predefinedValues &&
                    typedHasProperty(inputs.predefinedValues, propertyKey)
                ) {
                    value = inputs.predefinedValues[propertyKey] as JsonValueGeneric;
                } else if (inputs.createValueIfNoneCallback) {
                    value = await inputs.createValueIfNoneCallback();
                } else {
                    throw new Error(
                        `Could not find or create any value for key '${propertyKey}' in config file '${inputs.filePath}'`,
                    );
                }

                logOperation(ConfigOperationLogEnum.onPropertyUpdate, value);
                await appendJson(inputs.filePath, {
                    [propertyKey]: value,
                });
            }

            const returnValue = await transformValue(propertyKey, value);

            await updateValue(propertyKey, returnValue);

            return returnValue;
        },
        async readCurrentValue(
            propertyKey: AllowedKeys,
            loggingEnabled?: boolean,
        ): Promise<JsonValueGeneric | undefined> {
            checkKey(propertyKey);

            if (!existsSync(inputs.filePath)) {
                return undefined;
            }

            const value = (await getCurrentJson())[propertyKey];

            logConfigFileOperation({
                propertyKey,
                filePath: inputs.filePath,
                logCallbacks: inputs.logCallbacks,
                loggingEnabled,
                operation: ConfigOperationLogEnum.onPropertyAccess,
                value,
                relativePathRoot: logRelativePath,
            });
            return value;
        },
        updateValue,
        async readWholeFile(): Promise<Partial<Record<AllowedKeys, JsonValueGeneric>>> {
            return await readJson<any>(inputs.filePath);
        },
        initFile,
    };

    return definition;
}
