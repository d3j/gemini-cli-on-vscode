import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseFrontMatter } from './frontMatter';
import { ParameterInput, Template, TemplateMeta, TemplateSource, ListQuery } from './types';
import { RenderEngine, RenderOptions } from './renderEngine';
// import { SharedWorkspaceService } from './sharedWorkspaceService';

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
    // private sharedService: SharedWorkspaceService | undefined;

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
        void root; // reserved for future use
    }

    async list(query: ListQuery = {}): Promise<{ templates: TemplateMeta[]; total: number; hasMore: boolean }> {
        const sources = query.sources ?? ['user', 'history'];
        let items: TemplateMeta[] = [];
        for (const s of sources) {
            if (s === 'history') {
                items.push(...this.listHistory());
            } else if (s === 'user') {
                items.push(...this.listUserFiles());
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
        // group-aware sort: groupOrder -> groupId -> order -> name
        items.sort((a, b) => {
            const ga = a.groupOrder ?? Number.MAX_SAFE_INTEGER;
            const gb = b.groupOrder ?? Number.MAX_SAFE_INTEGER;
            if (ga !== gb) return ga - gb;
            const gidA = a.groupId || '';
            const gidB = b.groupId || '';
            if (gidA !== gidB) return gidA < gidB ? -1 : 1;
            const oa = a.order ?? Number.MAX_SAFE_INTEGER;
            const ob = b.order ?? Number.MAX_SAFE_INTEGER;
            if (oa !== ob) return oa - ob;
            const na = (a.name || '').toLowerCase();
            const nb = (b.name || '').toLowerCase();
            return na < nb ? -1 : na > nb ? 1 : 0;
        });
        const total = items.length;
        const offset = query.offset ?? 0;
        const limit = query.limit ?? total;
        const paged = items.slice(offset, offset + limit);
        return { templates: paged, total, hasMore: offset + limit < total };
    }

    async get(id: string): Promise<Template | undefined> {
        // Support history and user sources
        if (id.startsWith('history:')) {
            const { filePath, sectionIndex } = this.resolveIdToHistoryTarget(id) || {} as any;
            if (!filePath || !fs.existsSync(filePath)) return undefined;
            if (typeof sectionIndex === 'number') {
                return this.readHistorySectionAsTemplate(filePath, sectionIndex);
            }
            return this.readHistoryAsTemplate(filePath);
        }
        if (id.startsWith('user:')) {
            const target = this.resolveIdToUserTarget(id);
            if (!target || !fs.existsSync(target.filePath)) return undefined;
            if (typeof target.sectionIndex === 'number') {
                return this.readUserSectionAsTemplate(target.filePath, target.sectionIndex);
            }
            return this.readUserFileAsTemplate(target.filePath);
        }
        return undefined;
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
    // private listShared(): TemplateMeta[] { return []; }

    private listHistory(): TemplateMeta[] {
        // History entries as lightweight templates, id prefix history:YYYY-MM-DD
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) return [];
        const dir = path.join(root, '.history-memo');
        if (!fs.existsSync(dir)) return [];
        const entries = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
        if (!entries.length) return [];

        const parsed = entries.map(f => {
            const base = path.basename(f, '.md');
            const m = base.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            const full = path.join(dir, f);
            let key: number | undefined = undefined;
            if (m) {
                key = Number(`${m[1]}${m[2]}${m[3]}`);
            }
            let mtime = 0;
            try { mtime = fs.statSync(full).mtimeMs; } catch {}
            return { file: f, full, base, dateKey: key, mtime };
        });

        // Prefer filename date; fallback to mtime
        let latest = parsed
            .filter(p => typeof p.dateKey === 'number')
            .sort((a, b) => (b.dateKey! - a.dateKey!))[0];
        if (!latest) {
            latest = parsed.sort((a, b) => b.mtime - a.mtime)[0];
        }
        if (!latest) return [];

        const date = latest.base;
        const metas: TemplateMeta[] = [];
        // Whole day meta (group header-like)
        metas.push({
            id: `history:${date}`,
            name: `History ${date}`,
            description: 'History memo (full day)',
            source: 'history' as TemplateSource,
            tags: ['day'],
            parameterized: false,
            groupId: `history:${date}`,
            groupName: `History ${date}`,
            groupOrder: Number.MAX_SAFE_INTEGER - 1,
            order: 0
        });
        // Section metas
        const sections = this.parseHistorySections(safeRead(latest.full));
        sections.forEach(sec => {
            metas.push({
                id: `history:${date}#${sec.index}`,
                name: `History ${date} — ${sec.title}`,
                description: 'History memo section',
                source: 'history' as TemplateSource,
                tags: ['section'],
                parameterized: false,
                groupId: `history:${date}`,
                groupName: `History ${date}`,
                groupOrder: Number.MAX_SAFE_INTEGER - 1,
                order: sec.index
            });
        });
        return metas;
    }

    private listUserFiles(): TemplateMeta[] {
        const cfg = vscode.workspace.getConfiguration('gemini-cli-vscode.templates');
        const files = (cfg.get<string[]>('files', []) || []).filter(Boolean);
        if (!files.length) return [];
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const metas: TemplateMeta[] = [];
        for (let i = 0; i < files.length; i++) {
            const entry = files[i];
            const resolved = this.resolvePath(entry, root);
            if (!resolved || !fs.existsSync(resolved)) continue;
            const base = path.basename(resolved);
            const idBase = this.encodePathForId(resolved);
            const raw = safeRead(resolved);
            const hasFront = raw.trimStart().startsWith('---');
            if (hasFront) {
                const { attributes } = parseFrontMatter<FrontMatterV5>(raw);
                const name = attributes.name || base;
                metas.push({
                    id: `user:${idBase}`,
                    name,
                    description: attributes.description,
                    source: 'user',
                    tags: Array.isArray(attributes.tags) ? attributes.tags as string[] : ['user-file'],
                    parameterized: Array.isArray(attributes.inputs) && attributes.inputs.length > 0,
                    groupId: `userfile:${idBase}`,
                    groupName: base,
                    groupOrder: i,
                    order: 0
                });
            } else {
                const sections = this.parseHistorySections(raw);
                if (sections.length === 0) {
                    metas.push({
                        id: `user:${idBase}`,
                        name: base,
                        description: 'User template file',
                        source: 'user',
                        tags: ['user-file'],
                        parameterized: false,
                        groupId: `userfile:${idBase}`,
                        groupName: base,
                        groupOrder: i,
                        order: 0
                    });
                } else {
                    sections.forEach(sec => metas.push({
                        id: `user:${idBase}#${sec.index}`,
                        name: `${base} — ${sec.title}`,
                        description: 'User template section',
                        source: 'user',
                        tags: ['user-file', 'section'],
                        parameterized: false,
                        groupId: `userfile:${idBase}`,
                        groupName: base,
                        groupOrder: i,
                        order: sec.index
                    }));
                }
            }
        }
        return metas;
    }

    // private resolveIdToSharedPath(id: string): string | undefined { return undefined; }

    private resolveIdToHistoryTarget(id: string): { filePath: string; sectionIndex?: number } | undefined {
        if (!id.startsWith('history:')) return undefined;
        const rest = id.substring('history:'.length);
        const [date, section] = rest.split('#', 2);
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root || !date) return undefined;
        const dir = path.join(root, '.history-memo');
        const filePath = path.join(dir, `${date}.md`);
        if (!fs.existsSync(filePath)) return undefined;
        const sectionIndex = section ? Number(section) : undefined;
        return { filePath, sectionIndex: Number.isFinite(sectionIndex) ? sectionIndex : undefined };
    }

    private resolveIdToUserTarget(id: string): { filePath: string; sectionIndex?: number } | undefined {
        if (!id.startsWith('user:')) return undefined;
        const rest = id.substring('user:'.length);
        const [encoded, section] = rest.split('#', 2);
        if (!encoded) return undefined;
        const filePath = this.decodePathFromId(encoded);
        if (!filePath) return undefined;
        const sectionIndex = section ? Number(section) : undefined;
        return { filePath, sectionIndex: Number.isFinite(sectionIndex) ? sectionIndex : undefined };
    }

    // removed unused readTemplateFromFile

    private readHistoryAsTemplate(filePath: string): Template {
        // History memos are plain Markdown (no front matter expected)
        const raw = safeRead(filePath);
        const stat = fs.statSync(filePath);
        const base = path.basename(filePath, path.extname(filePath));
        const t: Template = {
            id: `history:${base}`,
            name: `History ${base}`,
            description: 'History memo',
            source: 'history',
            tags: [],
            parameterized: false,
            content: raw,
            metadata: {
                createdAt: stat.birthtime,
                updatedAt: stat.mtime
            },
            trust: { signed: false },
            origin: { path: filePath }
        };
        return t;
    }

    private readHistorySectionAsTemplate(filePath: string, sectionIndex: number): Template {
        const raw = safeRead(filePath);
        const stat = fs.statSync(filePath);
        const base = path.basename(filePath, path.extname(filePath));
        const sections = this.parseHistorySections(raw);
        const sec = sections.find(s => s.index === sectionIndex);
        const content = sec ? raw.slice(sec.startOffset, sec.endOffset) : '';
        const title = sec ? sec.title : `Section ${sectionIndex}`;
        const t: Template = {
            id: `history:${base}#${sectionIndex}`,
            name: `History ${base} — ${title}`,
            description: 'History memo section',
            source: 'history',
            tags: ['section'],
            parameterized: false,
            content,
            metadata: {
                createdAt: stat.birthtime,
                updatedAt: stat.mtime
            },
            trust: { signed: false },
            origin: { path: filePath }
        };
        return t;
    }

    private readUserFileAsTemplate(filePath: string): Template {
        const raw = safeRead(filePath);
        const stat = fs.statSync(filePath);
        const idBase = this.encodePathForId(filePath);
        const t: Template = {
            id: `user:${idBase}`,
            name: path.basename(filePath),
            description: 'User template file',
            source: 'user',
            tags: ['user-file'],
            parameterized: false,
            content: raw,
            metadata: { createdAt: stat.birthtime, updatedAt: stat.mtime },
            trust: { signed: false },
            origin: { path: filePath }
        };
        return t;
    }

    private readUserSectionAsTemplate(filePath: string, sectionIndex: number): Template {
        const raw = safeRead(filePath);
        const stat = fs.statSync(filePath);
        const sections = this.parseHistorySections(raw);
        const sec = sections.find(s => s.index === sectionIndex);
        const content = sec ? raw.slice(sec.startOffset, sec.endOffset) : '';
        const title = sec ? sec.title : `Section ${sectionIndex}`;
        const idBase = this.encodePathForId(filePath);
        const t: Template = {
            id: `user:${idBase}#${sectionIndex}`,
            name: `${path.basename(filePath)} — ${title}`,
            description: 'User template section',
            source: 'user',
            tags: ['user-file', 'section'],
            parameterized: false,
            content,
            metadata: { createdAt: stat.birthtime, updatedAt: stat.mtime },
            trust: { signed: false },
            origin: { path: filePath }
        };
        return t;
    }

    private resolvePath(p: string, root?: string): string | undefined {
        const trimmed = (p || '').trim();
        if (!trimmed) return undefined;
        if (path.isAbsolute(trimmed)) return trimmed;
        const base = root || '';
        return path.resolve(base, trimmed.startsWith('./') ? trimmed.substring(2) : trimmed);
    }

    private encodePathForId(p: string): string {
        try { return Buffer.from(p, 'utf8').toString('base64url'); } catch { return encodeURIComponent(p); }
    }
    private decodePathFromId(s: string): string {
        try { return Buffer.from(s, 'base64url').toString('utf8'); } catch { try { return decodeURIComponent(s); } catch { return ''; } }
    }

    private parseHistorySections(raw: string): Array<{ index: number; title: string; startOffset: number; endOffset: number }>{
        const sections: Array<{ index: number; title: string; startOffset: number; endOffset: number }> = [];
        if (!raw) return sections;
        const lines = raw.split(/\r?\n/);
        let offsets: number[] = [];
        let acc = 0;
        for (const line of lines) { offsets.push(acc); acc += line.length + 1; }
        // Find section headers: H1 only ('# ')
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/^#\s+/.test(line)) {
                const title = line.replace(/^#\s+/, '').trim();
                sections.push({ index: sections.length + 1, title, startOffset: offsets[i], endOffset: raw.length });
            }
        }
        // compute end offsets (next section start)
        for (let i = 0; i < sections.length; i++) {
            if (i + 1 < sections.length) {
                sections[i].endOffset = sections[i + 1].startOffset;
            }
        }
        return sections;
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

// normalizeInputs/coerceScalar are no longer needed here (front-matter rendering is handled downstream)
