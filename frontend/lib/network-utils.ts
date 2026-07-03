/**
 * Network connectivity utility functions
 */

/**
 * Test if a URL is reachable (for connectivity validation)
 */
export const testUrlReachability = async (url: string, timeout: number = 5000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD request for efficiency
      signal: controller.signal,
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    // URL reachability test failed
    return false;
  }
};

/**
 * Test multiple endpoints to determine connectivity
 */
export const testConnectivity = async (): Promise<{
  isConnected: boolean;
  testedUrls: string[];
  failedUrls: string[];
  responseTime: number;
}> => {
  const testUrls = [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'http://localhost:4001',
  ];

  const startTime = Date.now();
  const results = await Promise.allSettled(
    testUrls.map(url => testUrlReachability(url, 3000))
  );

  const responseTime = Date.now() - startTime;
  const testedUrls: string[] = [];
  const failedUrls: string[] = [];

  results.forEach((result, index) => {
    const url = testUrls[index];
    testedUrls.push(url);
    
    if (result.status === 'fulfilled' && result.value) {
      // URL is reachable
    } else {
      failedUrls.push(url);
    }
  });

  // Consider connected if at least one URL is reachable
  const isConnected = failedUrls.length < testUrls.length;

  return {
    isConnected,
    testedUrls,
    failedUrls,
    responseTime,
  };
};

/**
 * Get network quality indicator based on response time
 */
export const getNetworkQuality = (responseTime: number): 'excellent' | 'good' | 'fair' | 'poor' => {
  if (responseTime < 500) return 'excellent';
  if (responseTime < 1000) return 'good';
  if (responseTime < 2000) return 'fair';
  return 'poor';
};

/**
 * Format connection type for display
 */
export const formatConnectionType = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'wifi':
      return 'Wi-Fi';
    case 'cellular':
      return 'Mobile Data';
    case 'none':
      return 'No Connection';
    case 'unknown':
      return 'Unknown';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};








