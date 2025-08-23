import os from 'node:os';

/**
 * Get a friendly name for the current device
 */
export async function getDeviceName(): Promise<string> {
  const hostname = os.hostname();
  const platform = os.platform();
  
  let deviceType = 'Device';
  switch (platform) {
    case 'darwin':
      deviceType = 'Mac';
      break;
    case 'win32':
      deviceType = 'Windows PC';
      break;
    case 'linux':
      deviceType = 'Linux';
      break;
  }
  
  return `CLI on ${hostname} (${deviceType})`;
}
