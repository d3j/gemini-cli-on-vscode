import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateService } from '../../templates/templateService';
import { RenderEngine } from '../../templates/renderEngine';

describe('MAGUS Templates - TemplateService/RenderEngine', () => {
    const tmpRoot = path.join(__dirname, '..', '..', '..', '..', '.tmp-tests', `ws-${Date.now()}`);
    const sharedDir = path.join(tmpRoot, '.magus-templates', 'shared');
    let sandbox: sinon.SinonSandbox;

    before(() => {
        fs.mkdirSync(sharedDir, { recursive: true });
        const sample = `---\nname: Greeting\ndescription: Simple greeting template\ntags:\n- demo\n- sample\ninputs:\n- key: name\n  label: Name\n  type: string\n  required: true\n---\nHello, {{ name }}!`;
        fs.writeFileSync(path.join(sharedDir, 'greeting.md'), sample, 'utf8');
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file(tmpRoot), name: 'tmp', index: 0 }] as any);
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(() => {
        try { fs.rmSync(path.join(__dirname, '..', '..', '..', '..', '.tmp-tests'), { recursive: true, force: true }); } catch {}
    });

    it('lists shared templates', async () => {
        const svc = new TemplateService(undefined, tmpRoot);
        const { templates, total } = await svc.list({ sources: ['shared'] });
        assert.strictEqual(total, 1);
        assert.strictEqual(templates[0].name, 'Greeting');
        assert.strictEqual(templates[0].source, 'shared');
        assert.strictEqual(templates[0].parameterized, true);
    });

    it('gets a template by id and renders', async () => {
        const svc = new TemplateService(undefined, tmpRoot);
        const t = await svc.get('shared:greeting');
        assert.ok(t);
        const rendered = await svc.render('shared:greeting', { name: 'World' });
        assert.strictEqual(rendered.content.trim(), 'Hello, World!');
    });

    it('validates required inputs', async () => {
        const svc = new TemplateService(undefined, tmpRoot);
        await assert.rejects(() => svc.render('shared:greeting', {} as any), /Missing required input/);
    });

    it('render engine mustache-lite replaces variables', () => {
        const engine = new RenderEngine({ engine: 'mustache', escapeHtml: true });
        const out = engine.render('A: {{ a }}, B: {{ b.c }}', { a: 'x', b: { c: 42 } });
        assert.ok(out.includes('A: x'));
        assert.ok(out.includes('B: 42'));
    });
});

