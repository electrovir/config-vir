import {isTypeOfWithArray, joinWithFinalConjunction} from '@augment-vir/common';
import {appendJson, readJson, writeJson} from '@augment-vir/node-js';
import {existsSync} from 'fs';
import {basename} from 'path';
import {JsonValue} from 'type-fest';
import {ConfigFileDefinition} from './definition';
import {LogCallbacks, TransformValueCallback} from './inputs';
import {ConfigOperationLogEnum, logConfigFileOperation, OperationValueType} from './logging';

export type DefineConfigFileInputs<
    JsonValueGeneric extends JsonValue,
    AllowedKeys extends string,
> = Parameters<typeof defineConfigFile<JsonValueGeneric, AllowedKeys>>[0];

export function defineConfigFile<
    JsonValueGeneric extends JsonValue,
    AllowedKeys extends string,
>(inputs: {
    filePath: string;
    allowedKeys: ReadonlyArray<AllowedKeys>;
    createValueIfNoneCallback: () => JsonValueGeneric;
    logRelativePath?: string | undefined;
    logCallbacks?: LogCallbacks<JsonValueGeneric, AllowedKeys> | undefined;
    transformValueCallback?: TransformValueCallback<JsonValueGeneric, AllowedKeys> | undefined;
    fileInitCallback?: (filePath: string) => Promise<void> | void;
}): ConfigFileDefinition<JsonValueGeneric, AllowedKeys> {
    const logRelativePath = inputs.logRelativePath || process.cwd();

    const keys: Record<AllowedKeys, AllowedKeys> = inputs.allowedKeys.reduce(
        (accum, currentKey) => {
            accum[currentKey] = currentKey;
            return accum;
        },
        {} as Record<AllowedKeys, AllowedKeys>,
    );

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

    function checkKey(key: AllowedKeys) {
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
        keys,
        filePath: inputs.filePath,
        async deleteProperty(propertyKey: AllowedKeys, loggingEnabled?: boolean): Promise<boolean> {
            checkKey(propertyKey);

            if (existsSync(inputs.filePath)) {
                return false;
            }

            const fileContents = await getCurrentJson();

            if (propertyKey in fileContents) {
                logConfigFileOperation({
                    propertyKey,
                    inputs,
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
            loggingEnabled?: boolean,
        ): Promise<JsonValueGeneric> {
            function logOperation<OperationGeneric extends ConfigOperationLogEnum>(
                operation: OperationGeneric,
                value: OperationValueType<OperationGeneric, JsonValueGeneric>,
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
                await initFile();
            }

            const fileContents = await getCurrentJson();

            let value: JsonValueGeneric;

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
