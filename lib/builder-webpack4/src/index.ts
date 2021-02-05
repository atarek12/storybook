import webpack, { Stats, Configuration } from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import { logger } from '@storybook/node-logger';
import { PreviewResult, StorybookConfigOptions } from './types';

let previewProcess: ReturnType<typeof webpackDevMiddleware>;
let previewReject: (reason?: any) => void;

export async function getConfig(options: StorybookConfigOptions): Promise<Configuration> {
  const { presets } = options;
  const typescriptOptions = await presets.apply('typescript', {}, options);
  const babelOptions = await presets.apply('babel', {}, { ...options, typescriptOptions });
  const entries = await presets.apply('entries', [], options);
  const stories = await presets.apply('stories', [], options);
  const frameworkOptions = await presets.apply(`${options.framework}Options`, {}, options);

  return presets.apply(
    'webpack',
    {},
    {
      ...options,
      babelOptions,
      entries,
      stories,
      typescriptOptions,
      [`${options.framework}Options`]: frameworkOptions,
    }
  );
}

export const start = async ({
  startTime,
  options,
  useProgressReporting,
  router,
}: any): Promise<PreviewResult> => {
  const previewConfig = await getConfig(options);

  console.log({ previewConfig });

  const compiler = webpack(previewConfig);

  await useProgressReporting(compiler, options, startTime);

  const middlewareOptions: Parameters<typeof webpackDevMiddleware>[1] = {
    publicPath: previewConfig.output?.publicPath as string,
    writeToDisk: true,
  };
  previewProcess = webpackDevMiddleware(compiler, middlewareOptions);

  router.use(previewProcess as any);
  router.use(webpackHotMiddleware(compiler));

  const previewStats: Stats = await new Promise((resolve, reject) => {
    previewProcess.waitUntilValid(resolve);
    previewReject = reject;
  });
  if (!previewStats) {
    throw new Error('no stats after building preview');
  }
  if (previewStats.hasErrors()) {
    throw previewStats;
  }

  return {
    bail,
    previewStats,
    previewTotalTime: process.hrtime(startTime),
  };
};

export const bail = (e: Error) => {
  if (previewReject) previewReject();
  if (previewProcess) {
    try {
      previewProcess.close();
      logger.warn('Force closed preview build');
    } catch (err) {
      logger.warn('Unable to close preview build!');
    }
  }
  throw e;
};

export const build = async () => {
  console.log('TODO');
};

export const corePresets = [require.resolve('./presets/preview-preset.js')];
export const overridePresets = [require.resolve('./presets/custom-webpack-preset.js')];
