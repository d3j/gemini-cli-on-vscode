import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TemplateService } from '../../templates/templateService';

describe('TemplateService list/filter', () => {
    const tmpRoot = path.join(__dirname, '..', '..', '..', '..', '.tmp-tests', `ws-${Date.now()}-list`);
    const sharedDir = path.join(tmpRoot, '.magus-templates', 'shared');
    let sandbox: sinon.SinonSandbox;

    before(() => {
        fs.mkdirSync(sharedDir, { recursive: true });
        fs.writeFileSync(path.join(sharedDir, 'a.md'), `---\nname: Alpha\ntags:\n- red\n---\nA`, 'utf8');
        fs.writeFileSync(path.join(sharedDir, 'b.md'), `---\nname: Beta\ntags:\n- blue\n---\nB`, 'utf8');
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file(tmpRoot), name: 'tmp', index: 0 }] as any);
    });

    afterEach(() => sandbox.restore());

    after(() => {
        try { fs.rmSync(path.join(__dirname, '..', '..', '..', '..', '.tmp-tests'), { recursive: true, force: true }); } catch {}
    });

    it('filters by query and tags, supports paging and sorting', async () => {
        const svc = new TemplateService(undefined, tmpRoot);
        let res = await svc.list({ sources: ['shared'], query: 'Al' });
        assert.strictEqual(res.total >= 1, true);
        assert.ok(res.templates.find(t => t.name === 'Alpha'));

        res = await svc.list({ sources: ['shared'], tags: ['blue'] });
        assert.ok(res.templates.every(t => (t.tags || []).includes('blue')));

        res = await svc.list({ sources: ['shared'], sortBy: 'name', sortOrder: 'desc', limit: 1, offset: 0 });
        assert.strictEqual(res.templates.length, 1);
    });
});

