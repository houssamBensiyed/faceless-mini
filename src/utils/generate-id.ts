export function generateId(): string {
  const timestamp = Date.now().toString();
  const hex = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${timestamp}_${hex}`;
}
