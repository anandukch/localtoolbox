/**
 * Helper function to get a sensible default path for file dialogs
 * Tries to get user's home directory first, then falls back to Documents, then undefined
 */
export const getDefaultPath = async (): Promise<string | undefined> => {
  try {
    // Try to get user's home directory
    const { homeDir } = await import('@tauri-apps/api/path');
    return await homeDir();
  } catch (error) {
    // Fallback to common user directories
    try {
      const { documentDir } = await import('@tauri-apps/api/path');
      return await documentDir();
    } catch {
      // Last resort fallback
      return undefined;
    }
  }
};
