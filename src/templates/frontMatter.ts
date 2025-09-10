// Minimal YAML front matter parser (no external deps)
// Supports simple key: value, arrays with '- ', and basic nesting for known keys

export interface FrontMatterResult<T = any> {
    attributes: T;
    body: string;
}

export function parseFrontMatter<T = any>(raw: string): FrontMatterResult<T> {
    const trimmed = raw.replace(/^\uFEFF/, ''); // strip BOM
    if (!trimmed.startsWith('---')) {
        return { attributes: {} as T, body: raw };
    }
    const end = trimmed.indexOf('\n---', 3);
    if (end === -1) {
        return { attributes: {} as T, body: raw };
    }
    const header = trimmed.slice(3, end).trim();
    const body = trimmed.slice(end + 4).replace(/^\s*\n/, '');
    const attrs = parseYamlLike(header) as T;
    return { attributes: attrs, body };
}

function parseYamlLike(yaml: string): any {
    const lines = yaml.split(/\r?\n/);
    const result: any = {};
    let currentArrayKey: string | null = null;
    let lastArrayItem: any | undefined = undefined;
    for (let rawLine of lines) {
        if (!rawLine.trim()) continue;
        const indent = (rawLine.match(/^\s*/)?.[0]?.length) || 0;
        const line = rawLine.trim();
        if (line.startsWith('- ')) {
            if (!currentArrayKey) continue;
            const rest = line.substring(2).trim();
            const kv = rest.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
            if (kv) {
                const obj: any = {};
                obj[kv[1]] = parseScalar(kv[2]);
                (result[currentArrayKey] = result[currentArrayKey] || []).push(obj);
                lastArrayItem = obj;
            } else {
                const val = parseScalar(rest);
                (result[currentArrayKey] = result[currentArrayKey] || []).push(val);
                lastArrayItem = undefined;
            }
            continue;
        }
        const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (m) {
            const key = m[1];
            const value = m[2];
            if (indent > 0 && currentArrayKey && lastArrayItem && typeof lastArrayItem === 'object') {
                lastArrayItem[key] = parseScalar(value);
                continue;
            }
            if (value === '' || value === null) {
                // Start array block
                currentArrayKey = key;
                lastArrayItem = undefined;
                if (!Array.isArray(result[key])) result[key] = [];
            } else {
                currentArrayKey = null;
                lastArrayItem = undefined;
                result[key] = parseScalar(value);
            }
        }
    }
    return result;
}

function parseScalar(val: string): any {
    // Strip quotes
    const unquoted = val.replace(/^['"](.*)['"]$/s, '$1');
    if (/^(true|false)$/i.test(unquoted)) return /^true$/i.test(unquoted);
    if (/^-?\d+(\.\d+)?$/.test(unquoted)) return Number(unquoted);
    return unquoted;
}
