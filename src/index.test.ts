import {mapObjectValues} from '@augment-vir/common';
import {randomString} from '@augment-vir/node-js';
import chai, {assert} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {remove} from 'fs-extra';
import {writeFile} from 'fs/promises';
import {describe} from 'mocha';
import {join} from 'path';
import {testConfigs} from './file-paths.test-helper';
import {ConfigOperationLogEnum, defineConfigFile, LogCallbacks} from './index';
import {FileInitCallback, TransformValueCallback} from './inputs';

chai.use(chaiAsPromised);

describe(defineConfigFile.name, () => {
    const defaultTestValue: string = 'test-value';

    function testWithBasicConfigFile({
        ignoreCallbacks,
        transformValueCallback,
        fileInitCallback,
    }: {
        ignoreCallbacks?: boolean;
        transformValueCallback?: TransformValueCallback<any, string>;
        fileInitCallback?: FileInitCallback;
    } = {}) {
        const logCallbacks: LogCallbacks<any, any> = {};

        const basicConfigFile = defineConfigFile({
            allowedKeys: [
                'test-key',
                'test-key2',
            ] as const,
            filePath: testConfigs.basic,
            createValueIfNoneCallback: () => {
                return defaultTestValue;
            },
            transformValueCallback,
            fileInitCallback,
            ...(ignoreCallbacks
                ? {}
                : {
                      logCallbacks: mapObjectValues(
                          ConfigOperationLogEnum,
                          (enumKey, enumValue) => {
                              return (inputs: any) => {
                                  const callback = logCallbacks[enumValue];
                                  if (callback) {
                                      callback(inputs);
                                  }
                              };
                          },
                      ),
                  }),
        });

        return (
            callback: (
                configFile: typeof basicConfigFile,
                setLogCallback: (
                    operation: ConfigOperationLogEnum,
                    callback: (inputs: any) => void,
                ) => void,
            ) => Promise<void>,
        ) => {
            return async () => {
                await remove(testConfigs.basic);
                await callback(basicConfigFile, (operation, logCallback) => {
                    logCallbacks[operation] = logCallback;
                });
                await remove(testConfigs.basic);
            };
        };
    }

    it(
        'should have correct types',
        testWithBasicConfigFile()(async (basicConfigFile) => {
            const invalidKey = 'invalid-key' as const;
            const expectedError = new RegExp(`Key "${invalidKey}" is not allowed for config file`);

            // @ts-expect-error
            basicConfigFile.keys.shouldNotExistKey;

            await assert.isRejected(
                // @ts-expect-error
                basicConfigFile.deleteProperty(invalidKey),
                expectedError,
            );
            await assert.becomes(
                basicConfigFile.deleteProperty(basicConfigFile.keys['test-key']),
                false,
            );

            await assert.isRejected(
                // @ts-expect-error
                basicConfigFile.readCurrentValue(invalidKey),
                expectedError,
            );
            await assert.becomes(
                basicConfigFile.readCurrentValue(basicConfigFile.keys['test-key']),
                undefined,
            );

            await assert.isRejected(
                // @ts-expect-error
                basicConfigFile.getWithUpdate(invalidKey),
                expectedError,
            );
            await assert.becomes(
                basicConfigFile.getWithUpdate(basicConfigFile.keys['test-key']),
                defaultTestValue,
            );

            await assert.isRejected(
                // @ts-expect-error
                basicConfigFile.updateValue(invalidKey, ''),
                expectedError,
            );
            const testUpdateValue = 'derp';
            await assert.becomes(
                basicConfigFile.updateValue(basicConfigFile.keys['test-key'], testUpdateValue),
                testUpdateValue,
            );

            const testDefinition = defineConfigFile({
                allowedKeys: [
                    'test-key',
                    'test-key2',
                ] as const,
                filePath: testConfigs.basic,
                createValueIfNoneCallback: () => {
                    return defaultTestValue;
                },
                transformValueCallback: ({key, value}) => {
                    const thing: string = value;
                    return thing;
                },
            });
        }),
    );

    it(
        'should properly perform all operations',
        testWithBasicConfigFile()(async (basicConfigFile) => {
            const value = await basicConfigFile.getWithUpdate(basicConfigFile.keys['test-key']);
            assert.strictEqual(value, defaultTestValue);

            const textToSave = randomString();
            const updateReturnValue = await basicConfigFile.updateValue(
                basicConfigFile.keys['test-key'],
                textToSave,
            );
            const readValue = await basicConfigFile.readCurrentValue(
                basicConfigFile.keys['test-key'],
            );
            assert.strictEqual(updateReturnValue, textToSave);
            assert.strictEqual(readValue, textToSave);

            const wasDeleted = await basicConfigFile.deleteProperty(
                basicConfigFile.keys['test-key2'],
            );
            assert.isFalse(wasDeleted);

            const secondTextToSave = randomString();
            const secondUpdateReturnValue = await basicConfigFile.updateValue(
                basicConfigFile.keys['test-key2'],
                secondTextToSave,
            );
            const secondReadValue = await basicConfigFile.getWithUpdate(
                basicConfigFile.keys['test-key2'],
            );
            assert.strictEqual(secondUpdateReturnValue, secondTextToSave);
            assert.strictEqual(secondReadValue, secondTextToSave);

            const wasDeletedAgain = await basicConfigFile.deleteProperty(
                basicConfigFile.keys['test-key2'],
            );
            const afterDeleteSecondValue = await basicConfigFile.readCurrentValue(
                basicConfigFile.keys['test-key2'],
            );
            const afterDeleteFirstValue = await basicConfigFile.readCurrentValue(
                basicConfigFile.keys['test-key'],
            );
            const afterDeleteAndUpdateSecondValue = await basicConfigFile.getWithUpdate(
                basicConfigFile.keys['test-key2'],
            );
            assert.isTrue(wasDeletedAgain);
            assert.isUndefined(afterDeleteSecondValue);
            assert.strictEqual(afterDeleteFirstValue, textToSave);
            assert.strictEqual(afterDeleteAndUpdateSecondValue, defaultTestValue);
        }),
    );

    it(
        'should call log callbacks',
        testWithBasicConfigFile()(async (basicConfigFile, addCallback) => {
            let calledInputs: any = undefined;
            addCallback(ConfigOperationLogEnum.onPropertyUpdate, (inputs) => {
                calledInputs = inputs;
            });
            await basicConfigFile.getWithUpdate(basicConfigFile.keys['test-key'], true);
            assert.deepStrictEqual(calledInputs, {
                filePath: join('test-files', 'basic-config.json'),
                propertyKey: basicConfigFile.keys['test-key'],
                value: defaultTestValue,
            });
            const savedCalledInputsRef = calledInputs;
            // should not affect the called inputs
            await basicConfigFile.deleteProperty(basicConfigFile.keys['test-key'], true);
            assert.strictEqual(calledInputs, savedCalledInputsRef);
        }),
    );

    it(
        'should not error if no log callbacks are provided',
        testWithBasicConfigFile({ignoreCallbacks: true})(async (basicConfigFile) => {
            await basicConfigFile.getWithUpdate(basicConfigFile.keys['test-key'], true);
        }),
    );

    it(
        'should fail if the json file has incorrect types',
        testWithBasicConfigFile({ignoreCallbacks: true})(async (basicConfigFile) => {
            await writeFile(basicConfigFile.filePath, JSON.stringify(['hello']));
            await assert.isRejected(
                basicConfigFile.getWithUpdate(basicConfigFile.keys['test-key'], true),
                /^Cannot use file/,
            );
        }),
    );

    it(
        'should use transform callback',
        testWithBasicConfigFile({
            ignoreCallbacks: true,
            transformValueCallback: ({value}) => {
                return `${value}-42`;
            },
        })(async (basicConfigFile) => {
            assert.strictEqual(
                await basicConfigFile.getWithUpdate(basicConfigFile.keys['test-key'], true),
                `${defaultTestValue}-42`,
            );
        }),
    );

    it(
        'should use file init callback',
        testWithBasicConfigFile({
            ignoreCallbacks: true,
            fileInitCallback: async (filePath) => {
                await writeFile(filePath, JSON.stringify({derp: 'derp'}));
            },
        })(async (basicConfigFile) => {
            await basicConfigFile.getWithUpdate(basicConfigFile.keys['test-key'], true);
            const fullJson = await basicConfigFile.readWholeFile();
            assert.deepStrictEqual(fullJson, {
                [basicConfigFile.keys['test-key']]: defaultTestValue,
                derp: 'derp',
            } as any);
        }),
    );

    it('should not have keys if there are none defined', async () => {
        await remove(testConfigs.basic);
        const basicConfigFile = defineConfigFile({
            filePath: testConfigs.basic,
            createValueIfNoneCallback: () => {
                return defaultTestValue;
            },
        });

        assert.strictEqual(basicConfigFile.filePath, testConfigs.basic);
        assert.isUndefined(
            // @ts-expect-error
            basicConfigFile.keys,
        );
        assert.strictEqual(await basicConfigFile.getWithUpdate('anything'), defaultTestValue);
        await remove(testConfigs.basic);
    });
});
