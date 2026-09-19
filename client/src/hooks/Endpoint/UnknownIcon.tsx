import { memo } from 'react';
import { EModelEndpoint, KnownEndpoints } from 'nashm-data-provider';
import { CustomMinimalIcon, XAIcon, MoonshotIcon } from '@nashm/client';
import { IconContext } from '~/common';
import { cn } from '~/utils';

const knownEndpointAssets: Record<string, string> = {
  [KnownEndpoints.anyscale]: '/assets/anyscale.png',
  [KnownEndpoints.apipie]: '/assets/apipie.png',
  [KnownEndpoints.cohere]: '/assets/cohere.png',
  [KnownEndpoints.deepseek]: '/assets/deepseek.svg',
  [KnownEndpoints.fireworks]: '/assets/fireworks.png',
  google: '/assets/google.svg',
  [KnownEndpoints.groq]: '/assets/groq.png',
  [KnownEndpoints.helicone]: '/assets/helicone.svg',
  [KnownEndpoints.huggingface]: '/assets/huggingface.svg',
  [KnownEndpoints.mistral]: '/assets/mistral.png',
  [KnownEndpoints.mlx]: '/assets/mlx.png',
  [KnownEndpoints.ollama]: '/assets/ollama.png',
  openai: '/assets/openai.svg',
  [KnownEndpoints.openrouter]: '/assets/openrouter.png',
  [KnownEndpoints.perplexity]: '/assets/perplexity.png',
  qwen: '/assets/qwen.svg',
  [KnownEndpoints.shuttleai]: '/assets/shuttleai.png',
  [KnownEndpoints['together.ai']]: '/assets/together.png',
  [KnownEndpoints.unify]: '/assets/unify.webp',
  humain: '/assets/humain.svg',
  kimi: '/assets/kimi.svg',
};

const knownEndpointComponents = new Set<string>([KnownEndpoints.moonshot, KnownEndpoints.xai]);

export function getKnownEndpointAsset(endpoint?: string | null): string {
  if (!endpoint) {
    return '';
  }

  const asset = knownEndpointAssets[endpoint.toLowerCase()] ?? '';
  if (asset && !asset.startsWith('/') && !asset.startsWith('http')) {
    return `/${asset}`;
  }
  return asset;
}

export function hasKnownEndpointIcon(endpoint?: string | null): boolean {
  if (!endpoint) {
    return false;
  }

  const currentEndpoint = endpoint.toLowerCase();
  return (
    getKnownEndpointAsset(currentEndpoint) !== '' || knownEndpointComponents.has(currentEndpoint)
  );
}

const knownEndpointClasses = {
  [KnownEndpoints.cohere]: {
    [IconContext.landing]: 'p-2',
  },
};

const getKnownClass = ({
  currentEndpoint,
  context = '',
  className,
}: {
  currentEndpoint: string;
  context?: string;
  className: string;
}) => {
  if (currentEndpoint === KnownEndpoints.openrouter) {
    return className;
  }

  const match = knownEndpointClasses[currentEndpoint]?.[context] ?? '';
  const defaultClass = context === IconContext.landing ? '' : className;

  return cn(match, defaultClass);
};

function UnknownIcon({
  className = '',
  endpoint: _endpoint,
  iconURL = '',
  context,
}: {
  iconURL?: string;
  className?: string;
  endpoint?: EModelEndpoint | string | null;
  context?: 'landing' | 'menu-item' | 'nav' | 'message';
}) {
  const endpoint = _endpoint ?? '';
  if (!endpoint) {
    return <CustomMinimalIcon className={className} />;
  }

  const currentEndpoint = endpoint.toLowerCase();

  if (currentEndpoint === KnownEndpoints.xai) {
    return <XAIcon className={cn(className, 'text-black dark:text-white')} />;
  }

  if (currentEndpoint === KnownEndpoints.moonshot) {
    return <MoonshotIcon className={cn(className, 'text-black dark:text-white')} />;
  }

  if (iconURL) {
    let resolvedURL = iconURL;
    if (iconURL.toLowerCase() === 'humain') {
      resolvedURL = '/assets/humain.svg';
    } else if (iconURL.toLowerCase() === 'kimi') {
      resolvedURL = '/assets/kimi.svg';
    } else if (
      !iconURL.startsWith('http') &&
      !iconURL.startsWith('data:') &&
      !iconURL.startsWith('/')
    ) {
      resolvedURL = `/${iconURL}`;
    }
    return <img className={className} src={resolvedURL} alt={`${endpoint} Icon`} />;
  }

  const assetPath = getKnownEndpointAsset(currentEndpoint);

  if (!assetPath) {
    return <CustomMinimalIcon className={className} />;
  }

  return (
    <img
      className={getKnownClass({
        currentEndpoint,
        context: context,
        className,
      })}
      src={assetPath}
      alt={`${currentEndpoint} Icon`}
    />
  );
}

export default memo(UnknownIcon);
