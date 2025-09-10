import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TemplateService } from '../../templates/templateService';

describe('User files as templates (H1 sections)', () => {
    const tmpRoot = path.join(__dirname, '..', '..', '..', '..', '.tmp-tests', `ws-${Date.now()}-userfiles`);
    const fileA = path.join(tmpRoot, 'prompts.md');
    let sandbox: sinon.SinonSandbox;

    before(() => {
        fs.mkdirSync(tmpRoot, { recursive: true });
        const md = `# Title A\nBody A\n\n# Title B\nBody B`;
        fs.writeFileSync(fileA, md, 'utf8');
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file(tmpRoot), name: 'tmp', index: 0 }] as any);
        const cfgStub: any = { get: (key: string, def?: any) => {
            if (key === 'files') return ['prompts.md'];
            if (key === 'render.engine') return 'mustache';
            return def;
        }};
        sandbox.stub(vscode.workspace, 'getConfiguration').callsFake((section?: string) => {
            if (section === 'gemini-cli-vscode.templates') return cfgStub as any;
            return ({ get: (_k: string, _d?: any) => undefined } as any);
        });
    });

    afterEach(() => sandbox.restore());

    after(() => {
        try { fs.rmSync(path.join(__dirname, '..', '..', '..', '..', '.tmp-tests'), { recursive: true, force: true }); } catch {}
    });

    it('lists H1 sections from configured files', async () => {
        const svc = new TemplateService(undefined, tmpRoot);
        const { templates } = await svc.list({ sources: ['user'] });
        const names = templates.map(t => t.name);
        assert.ok(templates.length >= 2);
        assert.ok(names.some(n => n.includes('Title A')));
        assert.ok(names.some(n => n.includes('Title B')));
    });

    it('renders a section by id', async () => {
        const svc = new TemplateService(undefined, tmpRoot);
        const { templates } = await svc.list({ sources: ['user'] });
        const section = templates.find(t => /Title A/.test(t.name))!;
        const res = await svc.render(section.id, {});
        assert.ok(/Body A/.test(res.content));
    });
});

