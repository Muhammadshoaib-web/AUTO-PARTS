export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function maskSensitive(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars) return '****';
  return '****' + value.slice(-visibleChars);
}
