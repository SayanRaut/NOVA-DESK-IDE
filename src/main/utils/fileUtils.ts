export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getBasename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}

export function getDirname(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  parts.pop();
  return parts.join('/');
}

export function getExtension(filePath: string): string {
  const base = getBasename(filePath);
  const dotIndex = base.lastIndexOf('.');
  return dotIndex >= 0 ? base.substring(dotIndex).toLowerCase() : '';
}

export function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}
