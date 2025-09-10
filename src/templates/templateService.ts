import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseFrontMatter } from './frontMatter';
import { ParameterInput, Template, TemplateMeta, TemplateSource, ListQuery } from './types';
import { RenderEngine, RenderOptions } from './renderEngine';
import { SharedWorkspaceService } from './sharedWorkspaceService';

interface FrontMatterV5 {
    name?: string;
    description?: string;
    tags?: string[];
    inputs?: ParameterInput[]; // v5
    render?: { engine?: 'mustache' | 'liquid' }; // v5
    pack?: { id?: string };
    trust?: { signed?: boolean; verifiedBy?: string };
}

export class TemplateService {
    private renderOptions: RenderOptions;
    private sharedService: SharedWorkspaceService | undefined;

    constructor(renderOptions?: Partial<RenderOptions>, workspaceRoot?: string) {
        const cfg = vscode.workspace.getConfiguration('gemini-cli-vscode.templates');
        const engine = (cfg.get<'mustache'|'liquid'>('render.engine', 'mustache'));
        const escapeHtml = true;
        this.renderOptions = {
            engine,
            escapeHtml,
            timeoutMs: 1500,
            sizeLimitKb: 512,
            ...renderOptions
        };
        const root = workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (root) {
            this.sharedService = new SharedWorkspaceService(root);
        }
    }

    async list(query: ListQuery = {}): Promise<{ templates: TemplateMeta[]; total: number; hasMore: boolean }> {
        const sources = query.sources ?? ['shared', 'history'];
        let items: TemplateMeta[] = [];
        for (const s of sources) {
            if (s === 'shared') {
                items.push(...this.listShared());
            } else if (s === 'history') {
                items.push(...this.listHistory());
            }
        }
        // filter
        if (query.query) {
            const q = query.query.toLowerCase();
            items = items.filter(t => t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
        }
        if (query.tags && query.tags.length) {
            items = items.filter(t => (t.tags || []).some(tag => query.tags!.includes(tag)));
        }
        // sort
        const sortBy = query.sortBy ?? 'name';
        const sortOrder = query.sortOrder ?? 'asc';
        items.sort((a, b) => {
            let va: any; let vb: any;
            switch (sortBy) {
                case 'used': va = a.useCount || 0; vb = b.useCount || 0; break;
                case 'updated': va = 0; vb = 0; break;
                case 'created': va = 0; vb = 0; break;
                case 'name':
                default:
                    va = a.name.toLowerCase(); vb = b.name.toLowerCase();
            }
            const cmp = va < vb ? -1 : va > vb ? 1 : 0;
            return sortOrder === 'asc' ? cmp : -cmp;
        });
        const total = items.length;
        const offset = query.offset ?? 0;
        const limit = query.limit ?? total;
        const paged = items.slice(offset, offset + limit);
        return { templates: paged, total, hasMore: offset + limit < total };
    }

    async get(id: string): Promise<Template | undefined> {
        // Only from shared for now
        const filePath = this.resolveIdToSharedPath(id);
        if (!filePath || !fs.existsSync(filePath)) return undefined;
        return this.readTemplateFromFile(filePath, 'shared');
    }

    async preview(id: string, values?: Record<string, any>): Promise<{ preview: string; html: string }> {
        const t = await this.get(id);
        if (!t) throw new Error('Template not found');
        const engine = new RenderEngine(this.renderOptions);
        engine.validateInputs(t.inputs, values || {}); // ignore errors here for preview
        const content = engine.render(t.content, values || {});
        const html = this.toSafeHtml(content);
        return { preview: content, html };
    }

    async render(id: string, values?: Record<string, any>): Promise<{ content: string }> {
        const t = await this.get(id);
        if (!t) throw new Error('Template not found');
        const engine = new RenderEngine(this.renderOptions);
        const validation = engine.validateInputs(t.inputs, values || {});
        if (!validation.ok) throw new Error(validation.errors.join('; '));
        const content = engine.render(t.content, values || {});
        return { content };
    }

    // Helpers
    private listShared(): TemplateMeta[] {
        if (!this.sharedService) return [];
        const files = this.sharedService.listMarkdownFiles();
        return files.map(fp => {
            const base = path.basename(fp, path.extname(fp));
            const raw = safeRead(fp);
            const { attributes } = parseFrontMatter<FrontMatterV5>(raw);
            const name = attributes.name || base;
            return {
                id: `shared:${base}`,
                name,
                description: attributes.description,
                source: 'shared' as TemplateSource,
                tags: Array.isArray(attributes.tags) ? attributes.tags as string[] : [],
                parameterized: Array.isArray(attributes.inputs) && attributes.inputs.length > 0,
                author: undefined,
                license: undefined,
                trust: attributes.trust?.signed ? { signed: true, verifiedBy: attributes.trust?.verifiedBy } : { signed: false },
            } satisfies TemplateMeta;
        });
    }

    private listHistory(): TemplateMeta[] {
        // History entries as lightweight templates, id prefix history:YYYY-MM-DD
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) return [];
        const dir = path.join(root, '.history-memo');
        if (!fs.existsSync(dir)) return [];
        const entries = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
        return entries.map(f => ({
            id: `history:${path.basename(f, '.md')}`,
            name: `History ${path.basename(f, '.md')}`,
            description: 'History memo',
            source: 'history' as TemplateSource,
            tags: [],
            parameterized: false
        }));
    }

    private resolveIdToSharedPath(id: string): string | undefined {
        if (!this.sharedService) return undefined;
        if (!id.startsWith('shared:')) return undefined;
        const base = id.substring('shared:'.length);
        const dir = this.sharedService.getSharedDirectory();
        const candidate = path.join(dir, `${base}.md`);
        if (fs.existsSync(candidate)) return candidate;
        return undefined;
    }

    private readTemplateFromFile(filePath: string, source: TemplateSource): Template {
        const raw = safeRead(filePath);
        const { attributes, body } = parseFrontMatter<FrontMatterV5>(raw);
        const stat = fs.statSync(filePath);
        const name = attributes.name || path.basename(filePath, path.extname(filePath));
        const inputs = normalizeInputs(attributes.inputs);
        const t: Template = {
            id: `${source}:${path.basename(filePath, path.extname(filePath))}`,
            name,
            description: attributes.description,
            source,
            tags: Array.isArray(attributes.tags) ? attributes.tags as string[] : [],
            parameterized: Array.isArray(inputs) && inputs.length > 0,
            inputs,
            content: body,
            metadata: {
                createdAt: stat.birthtime,
                updatedAt: stat.mtime
            },
            trust: attributes.trust?.signed ? { signed: true, verifiedBy: attributes.trust?.verifiedBy } : { signed: false },
            origin: { path: filePath }
        };
        return t;
    }

    private toSafeHtml(markdown: string): string {
        // Basic escaping; WebView側でDOMPurify/CSPも適用前提
        const escaped = markdown
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<pre>${escaped}</pre>`;
    }
}

function safeRead(p: string): string {
    try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function normalizeInputs(value: any): ParameterInput[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value) && value.length === 0) return [];
    // Already objects
    if (Array.isArray(value) && typeof value[0] === 'object') {
        return value as ParameterInput[];
    }
    // Our minimal frontMatter parser returns an array of strings like
    // ["key: name", "label: Name", "type: string", "required: true", "key: age", ...]
    if (Array.isArray(value) && typeof value[0] === 'string') {
        const out: ParameterInput[] = [] as any;
        let cur: any = undefined;
        for (const item of value as string[]) {
            const m = item.match(/^([^:]+):\s*(.*)$/);
            if (!m) continue;
            const k = m[1].trim();
            const vraw = m[2].trim();
            const v = coerceScalar(vraw);
            if (k === 'key') {
                if (cur && cur.key) out.push(cur as ParameterInput);
                cur = { key: String(v) };
            } else if (cur) {
                cur[k] = v;
            }
        }
        if (cur && cur.key) out.push(cur as ParameterInput);
        return out.length ? (out as ParameterInput[]) : undefined;
    }
    return undefined;
}

function coerceScalar(s: string): any {
    const unq = s.replace(/^['"](.*)['"]$/s, '$1');
    if (/^(true|false)$/i.test(unq)) return /^true$/i.test(unq);
    if (/^-?\d+(\.\d+)?$/.test(unq)) return Number(unq);
    return unq;
}
