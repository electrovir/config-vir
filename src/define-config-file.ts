import {joinWithFinalConjunction} from '@augment-vir/common';
import {appendJson, readJson, writeJson} from '@augment-vir/node-js';
import {existsSync} from 'fs';
import {basename} from 'path';
import {JsonValue} from 'type-fest';
import {
    AllowedKeysFromDefinitionInputs,
    ConfigFileDefinition,
    JsonValueFromDefinitionInputs,
} from './definition';
import {DefineConfigFileInputs} from './inputs';
import {ConfigOperationLogEnum, logConfigFileOperation, OperationValueType} from './logging';

export function defineConfigFile<
    DefinitionInputGeneric extends DefineConfigFileInputs<JsonValue, string>,
>(
    rawInputs: DefinitionInputGeneric,
): ConfigFileDefinition<
    JsonValueFromDefinitionInputs<DefinitionInputGeneric>,
    AllowedKeysFromDefinitionInputs<DefinitionInputGeneric>,
    DefinitionInputGeneric
> {
    const logRelativePath = rawInputs.logRelativePath || process.cwd();

    type JsonValueType = JsonValueFromDefinitionInputs<DefinitionInputGeneric>;
    type AllowedKeys = AllowedKeysFromDefinitionInputs<DefinitionInputGeneric>;
    /**
     * This as cast gives better typing later on. Because JsonValueType is actually derived from the
     * type for rawInputs itself, this cast is safe.
     */
    const inputs = rawInputs as unknown as DefineConfigFileInputs<JsonValueType, AllowedKeys>;

    const keys: Record<AllowedKeys, AllowedKeys> = inputs.allowedKeys.reduce(
        (accum, currentKey) => {
            accum[currentKey] = currentKey;
            return accum;
        },
        {} as Record<AllowedKeys, AllowedKeys>,
    );

    function transformValue(key: AllowedKeys, value: JsonValueType): JsonValueType {
        if (inputs.transformValueCallback) {
            return inputs.transformValueCallback({key, value});
        } else {
            return value;
        }
    }

    function checkKey(key: AllowedKeys) {
        if (!inputs.allowedKeys.includes(key)) {
            throw new Error(
                `Key "${key}" is not allowed for config file "${basename(
                    inputs.filePath,
                )}". Expected one of the following: ${joinWithFinalConjunction(
                    inputs.allowedKeys as string[],
                    'or',
                )}`,
            );
        }
    }

    async function updateValue(
        propertyKey: AllowedKeys,
        value: JsonValueType,
    ): Promise<JsonValueType> {
        checkKey(propertyKey);
        await appendJson(inputs.filePath, {[propertyKey]: value});
        return value;
    }

    const definition: ConfigFileDefinition<JsonValueType, AllowedKeys, DefinitionInputGeneric> = {
        keys,
        async deleteProperty(propertyKey: AllowedKeys, loggingEnabled?: boolean): Promise<boolean> {
            checkKey(propertyKey);

            const currentJson = await readJson(inputs.filePath);

            if (propertyKey in currentJson) {
                logConfigFileOperation({
                    propertyKey,
                    inputs,
                    loggingEnabled,
                    operation: ConfigOperationLogEnum.onPropertyDelete,
                    value: undefined,
                    relativePathRoot: logRelativePath,
                });
                delete currentJson[propertyKey];
                await writeJson(inputs.filePath, currentJson);
                return true;
            } else {
                return false;
            }
        },
        async getWithUpdate(
            propertyKey: AllowedKeys,
            loggingEnabled?: boolean,
        ): Promise<JsonValueType> {
            function logOperation<OperationGeneric extends ConfigOperationLogEnum>(
                operation: OperationGeneric,
                value: OperationValueType<OperationGeneric, JsonValueType>,
            ) {
                logConfigFileOperation({
                    propertyKey,
                    inputs,
                    loggingEnabled,
                    operation,
                    value,
                    relativePathRoot: logRelativePath,
                });
            }

            checkKey(propertyKey);

            if (!existsSync(inputs.filePath)) {
                logOperation(ConfigOperationLogEnum.onFileCreation, undefined);
                await writeJson(inputs.filePath, {});
            }

            const fileContents = await readJson(inputs.filePath);

            let value: JsonValueType;

            if (propertyKey in fileContents) {
                value = fileContents[propertyKey];
                logOperation(ConfigOperationLogEnum.onPropertyAccess, value);
            } else {
                value = inputs.createValueIfNoneCallback();
                logOperation(ConfigOperationLogEnum.onPropertyUpdate, value);
                await appendJson(inputs.filePath, {
                    [propertyKey]: value,
                });
            }

            const returnValue = transformValue(propertyKey, value);

            await updateValue(propertyKey, returnValue);

            return returnValue;
        },
        async readCurrentValue(
            propertyKey: AllowedKeys,
            loggingEnabled?: boolean,
        ): Promise<JsonValueType | undefined> {
            checkKey(propertyKey);

            const value = (await readJson(inputs.filePath))[propertyKey];
            logConfigFileOperation({
                propertyKey,
                inputs,
                loggingEnabled,
                operation: ConfigOperationLogEnum.onPropertyAccess,
                value,
                relativePathRoot: logRelativePath,
            });
            return value;
        },
        updateValue,
    };

    return definition;
}
