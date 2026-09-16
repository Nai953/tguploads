export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

export function getFileCategory(mimeType: string, filename: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'code' | 'other' {
  const mime = (mimeType || '').toLowerCase();
  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('officedocument') ||
    mime.includes('text/') ||
    ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'csv', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)
  ) {
    return 'document';
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed') ||
    mime.includes('rar') ||
    mime.includes('7z') ||
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)
  ) {
    return 'archive';
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'sql', 'sh', 'c', 'cpp', 'rs', 'go'].includes(ext)) {
    return 'code';
  }
  return 'other';
}
