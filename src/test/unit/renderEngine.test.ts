import * as assert from 'assert';
import { RenderEngine } from '../../templates/renderEngine';

describe('RenderEngine', () => {
    it('renders mustache-like variables and escapes HTML when enabled', () => {
        const engine = new RenderEngine({ engine: 'mustache', escapeHtml: true });
        const out = engine.render('Hello {{ name }} <b>{{ tag }}</b>', { name: 'Alice', tag: '<hi>' });
        assert.strictEqual(out.includes('Hello Alice'), true);
        assert.strictEqual(out.includes('&lt;hi&gt;'), true);
    });

    it('throws on timeout and size limit', () => {
        const engine = new RenderEngine({ engine: 'mustache', timeoutMs: 1, sizeLimitKb: 1 });
        // size limit
        const big = 'x'.repeat(2048);
        assert.throws(() => engine.render(big, {}), /exceeds size limit|timeout/i);
    });

    it('validates required and pattern/enum/number ranges', () => {
        const engine = new RenderEngine({ engine: 'mustache' });
        const inputs = [
            { key: 'name', label: 'Name', type: 'string', required: true, pattern: '^[A-Z][a-z]+' },
            { key: 'age', label: 'Age', type: 'number', min: 10, max: 90 },
            { key: 'color', label: 'Color', type: 'enum', enum: ['red','green'] }
        ] as any;
        const ok = engine.validateInputs(inputs, { name: 'Alice', age: 20, color: 'red' });
        assert.strictEqual(ok.ok, true);
        const ng = engine.validateInputs(inputs, { name: 'alice', age: 5, color: 'blue' });
        assert.strictEqual(ng.ok, false);
        assert.ok(ng.errors.join(' ').includes('Invalid'));
    });
});

