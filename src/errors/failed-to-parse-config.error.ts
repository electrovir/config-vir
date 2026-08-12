import {combineErrorMessages} from '@augment-vir/common';

/**
 * An error thrown when a config file failed to parse in any format.
 *
 * @category Error
 */
export class FailedToParseConfigError extends Error {
    public override readonly name = 'FailedToParseErrorConfig';

    constructor(
        public readonly configPath: string,
        cause: unknown,
    ) {
        super(combineErrorMessages(`Failed to parse config file: '${configPath}'.`, cause), {
            cause,
        });
    }
}
