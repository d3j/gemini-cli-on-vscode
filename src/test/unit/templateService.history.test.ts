import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TemplateService } from '../../templates/templateService';

describe('TemplateService - history memos as templates', () => {
    const tmpRoot = path.join(__dirname, '..', '..', '..', '..', '.tmp-tests', `ws-${Date.now()}-history`);
    const historyDir = path.join(tmpRoot, '.history-memo');
    let sandbox: sinon.SinonSandbox;

    before(() => {
        fs.mkdirSync(historyDir, { recursive: true });
        const date = '2099-01-02';
        const content = `# [10:00] - Test A\nHello history A!\n\n# [11:00] - Test B\nHello history B!`;
        fs.writeFileSync(path.join(historyDir, `${date}.md`), content, 'utf8');
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{ uri: vscode.Uri.file(tmpRoot), name: 'tmp', index: 0 }] as any);
    });

    afterEach(() => sandbox.restore());

    after(() => {
        try { fs.rmSync(path.join(__dirname, '..', '..', '..', '..', '.tmp-tests'), { recursive: true, force: true }); } catch {}
    });

    it('lists history entries', async () => {
        const svc = new TemplateService(undefined, tmpRoot);
        const { templates, total } = await svc.list({ sources: ['history'] });
        assert.ok(total >= 1);
        assert.ok(templates.some(t => t.id.startsWith('history:')));
    });

    it('gets and renders a history day entry', async () => {
        const svc = new TemplateService(undefined, tmpRoot);
        const { templates } = await svc.list({ sources: ['history'] });
        const day = templates.find(t => t.tags.includes('day'))!;
        const tpl = await svc.get(day.id);
        assert.ok(tpl);
        const rendered = await svc.render(day.id, {});
        assert.ok(rendered.content.includes('Hello history A!'));
        assert.ok(rendered.content.includes('Hello history B!'));
    });

    it('lists and renders a history section', async () => {
        const svc = new TemplateService(undefined, tmpRoot);
        const { templates } = await svc.list({ sources: ['history'] });
        const section = templates.find(t => t.tags.includes('section'))!;
        assert.ok(section);
        const prev = await svc.preview(section.id, {});
        assert.ok(prev.preview.includes('Hello history'));
        const rendered = await svc.render(section.id, {});
        assert.ok(rendered.content.includes('Hello history'));
    });
});
