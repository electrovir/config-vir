import {combineErrorMessages} from '@augment-vir/common';

/**
 * An error thrown when a config file failed to parse in any format.
 *
 * @category Error
 */
export class FailedToLoadConfigError extends Error {
    public override readonly name = 'FailedToLoadConfigError';

    constructor(
        public readonly configPath: string,
        cause: unknown,
    ) {
        super(
            combineErrorMessages(`Failed to load config file contents: '${configPath}'.`, cause),
            {
                cause,
            },
        );
    }
}
