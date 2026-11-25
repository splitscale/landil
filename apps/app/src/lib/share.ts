import { Platform, Share } from 'react-native';

/**
 * Phone: the system share sheet. Web: the browser's share sheet where there is one (most phones),
 * else the link is copied. Returns 'copied' so the button can say so.
 */
export async function shareLink(title: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Platform.OS !== 'web') {
      await Share.share({ title, message: `${title}: ${url}`, url });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (e) {
    // The user closed the share sheet: not a failure.
    return (e as Error)?.name === 'AbortError' ? 'shared' : 'failed';
  }
}
