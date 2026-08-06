/**
 * Shared utility functions
 */

export function isEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - for production, use DOMPurify or similar
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function paginate(total: number, page: number = 1, pageSize: number = 20) {
  const pageNum = Math.max(1, page);
  const limit = Math.min(Math.max(1, pageSize), 100);
  const offset = (pageNum - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  return {
    page: pageNum,
    limit,
    offset,
    total,
    totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  };
}

export function formatDate(date: Date, format: string = 'ISO'): string {
  if (format === 'ISO') {
    return date.toISOString();
  }
  if (format === 'short') {
    return date.toLocaleDateString();
  }
  return date.toString();
}

export function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value || defaultValue || '';
}
