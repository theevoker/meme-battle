import { TextPositionConfig } from '../types';

export function parseTextPositionsJSON(raw: any): Record<string, TextPositionConfig[]> {
  if (!raw || typeof raw !== 'object') return {};

  const result: Record<string, TextPositionConfig[]> = {};

  for (const [imageName, posData] of Object.entries(raw)) {
    if (!posData) continue;

    const parsedConfigs: TextPositionConfig[] = [];

    if (Array.isArray(posData)) {
      posData.forEach((item, index) => {
        if (!item) return;
        parsedConfigs.push(normalizePositionConfig(item, index));
      });
    } else if (typeof posData === 'object') {
      const keys = Object.keys(posData).sort();
      keys.forEach((key, index) => {
        const item = (posData as any)[key];
        if (!item || typeof item !== 'object') return;
        parsedConfigs.push(normalizePositionConfig(item, index));
      });
    }

    if (parsedConfigs.length > 0) {
      result[imageName] = parsedConfigs;
      const cleanName = imageName.replace(/\.[^/.]+$/, '');
      result[cleanName] = parsedConfigs;
    }
  }

  return result;
}

function normalizePositionConfig(item: any, index: number): TextPositionConfig {
  const parsePercent = (val: any, fallback: number) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val.replace('%', ''));
      return !isNaN(num) ? num : fallback;
    }
    return fallback;
  };

  const x = parsePercent(item.x ?? item.X ?? item.x_pos ?? item.X_pos, 50);
  const y = parsePercent(item.y ?? item.Y ?? item.y_pos ?? item.Y_pos, index === 0 ? 15 : 85);

  const rawFontSize = Number(item.fontSize ?? item.font_size ?? item.fontSizeEm ?? 36);
  const fontSize = rawFontSize < 10 ? rawFontSize * 18 : rawFontSize;

  return {
    id: item.id || `text-${index + 1}`,
    text: item.text || (index === 0 ? 'TOP TEXT HERE' : 'BOTTOM TEXT HERE'),
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    fontSize: fontSize > 0 ? fontSize : 36,
    color: item.color || item.font_color || '#FFFFFF',
    strokeColor: item.strokeColor || item.stroke_color || '#000000',
    strokeWidth: Number(item.strokeWidth ?? item.stroke_width ?? 5),
    fontFamily: item.fontFamily || item.font_family || 'Impact, sans-serif',
    isUppercase: item.isUppercase !== undefined ? Boolean(item.isUppercase) : true,
    align: item.align || 'center'
  };
}
