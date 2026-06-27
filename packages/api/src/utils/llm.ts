import { Nashm } from 'nashm-data-provider';
import type { DynamicSettingProps } from 'nashm-data-provider';

type NashmKeys = keyof typeof Nashm;

type NashmParams = {
  modelOptions: Omit<NonNullable<DynamicSettingProps['conversation']>, NashmKeys>;
  resendFiles: boolean;
  promptPrefix?: string | null;
  maxContextTokens?: number;
  fileTokenLimit?: number;
  modelLabel?: string | null;
};

/**
 * Separates Nashm-specific parameters from model options
 * @param options - The combined options object
 */
export function extractNashmParams(
  options?: DynamicSettingProps['conversation'],
): NashmParams {
  if (!options) {
    return {
      modelOptions: {} as Omit<NonNullable<DynamicSettingProps['conversation']>, NashmKeys>,
      resendFiles: Nashm.resendFiles.default as boolean,
    };
  }

  const modelOptions = { ...options };

  const resendFiles =
    (delete modelOptions.resendFiles, options.resendFiles) ??
    (Nashm.resendFiles.default as boolean);
  const promptPrefix = (delete modelOptions.promptPrefix, options.promptPrefix);
  const maxContextTokens = (delete modelOptions.maxContextTokens, options.maxContextTokens);
  const fileTokenLimit = (delete modelOptions.fileTokenLimit, options.fileTokenLimit);
  const modelLabel = (delete modelOptions.modelLabel, options.modelLabel);

  return {
    modelOptions: modelOptions as Omit<
      NonNullable<DynamicSettingProps['conversation']>,
      NashmKeys
    >,
    maxContextTokens,
    fileTokenLimit,
    promptPrefix,
    resendFiles,
    modelLabel,
  };
}
