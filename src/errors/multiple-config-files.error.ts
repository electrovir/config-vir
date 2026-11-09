/**
 * An error thrown when one location holds more than one config file, so there's no telling which
 * one is meant.
 *
 * @category Error
 */
export class MultipleConfigFilesError extends Error {
    public override readonly name = 'MultipleConfigFilesError';

    constructor(public readonly configPaths: ReadonlyArray<string>) {
        super(
            `Found more than one config file where only one is allowed: ${configPaths
                .map((configPath) => `'${configPath}'`)
                .join(', ')}.`,
        );
    }
}
