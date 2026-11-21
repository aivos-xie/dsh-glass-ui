import { readFile } from 'node:fs/promises';

const layers = ['glass.css', 'chat-glass.css', 'controls-glass.css', 'rightbar-glass.css', 'segments-glass.css', 'glass-components.css', 'conversation-details.css'];

export async function readGlassStyles() {
  const styles = await Promise.all(layers.map(name => readFile(new URL(name, import.meta.url), 'utf8')));
  return styles.join('\n');
}
