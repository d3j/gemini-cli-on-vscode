import { ParameterInput } from './types';

export type RenderEngineType = 'mustache' | 'liquid';

export interface RenderOptions {
    engine: RenderEngineType;
    escapeHtml?: boolean;
    timeoutMs?: number;
    sizeLimitKb?: number;
}

export class RenderEngine {
    constructor(private readonly options: RenderOptions) {}

    validateInputs(inputs: ParameterInput[] | undefined, values: Record<string, any> = {}): { ok: boolean; errors: string[] } {
        if (!inputs || inputs.length === 0) return { ok: true, errors: [] };
        const errors: string[] = [];
        for (const inp of inputs) {
            const val = values[inp.key];
            if (inp.required && (val === undefined || val === null || val === '')) {
                errors.push(`Missing required input: ${inp.key}`);
                continue;
            }
            if (val !== undefined && inp.type === 'string' && inp.pattern) {
                try {
                    const re = new RegExp(inp.pattern);
                    if (!re.test(String(val))) errors.push(`Invalid format for ${inp.key}`);
                } catch {
                    // ignore invalid pattern
                }
            }
            if (val !== undefined && inp.type === 'number') {
                if (typeof val !== 'number') errors.push(`Expected number for ${inp.key}`);
                if (typeof val === 'number') {
                    if (inp.min !== undefined && val < inp.min) errors.push(`Value too small for ${inp.key}`);
                    if (inp.max !== undefined && val > inp.max) errors.push(`Value too large for ${inp.key}`);
                }
            }
            if (val !== undefined && inp.type === 'enum' && inp.enum && !inp.enum.includes(val)) {
                errors.push(`Invalid value for ${inp.key}`);
            }
        }
        return { ok: errors.length === 0, errors };
    }

    render(template: string, values: Record<string, any> = {}): string {
        const start = Date.now();
        const out = this.options.engine === 'liquid'
            ? this.renderLiquidLite(template, values)
            : this.renderMustacheLite(template, values);
        const elapsed = Date.now() - start;
        if (this.options.timeoutMs && elapsed > this.options.timeoutMs) {
            throw new Error('Render timeout');
        }
        if (this.options.sizeLimitKb && Buffer.byteLength(out, 'utf8') > this.options.sizeLimitKb * 1024) {
            throw new Error('Rendered content exceeds size limit');
        }
        return out;
    }

    private renderMustacheLite(tpl: string, values: Record<string, any>): string {
        return tpl.replace(/\{\{\s*([a-zA-Z0-9_\.-]+)\s*\}\}/g, (_m, key) => {
            const val = getByPath(values, key);
            const str = val === undefined || val === null ? '' : String(val);
            return this.options.escapeHtml ? escapeHtml(str) : str;
        });
    }

    private renderLiquidLite(tpl: string, values: Record<string, any>): string {
        // Minimal compatibility: {{ key }} only, same as mustache-lite
        return this.renderMustacheLite(tpl, values);
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

