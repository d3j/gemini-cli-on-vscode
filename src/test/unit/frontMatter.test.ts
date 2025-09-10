import * as assert from 'assert';
import { parseFrontMatter } from '../../templates/frontMatter';

describe('FrontMatter parser', () => {
    it('returns empty attributes when no front matter', () => {
        const raw = 'Hello world';
        const res = parseFrontMatter(raw);
        assert.deepStrictEqual(res.attributes, {});
        assert.strictEqual(res.body, raw);
    });

    it('parses simple scalars and arrays', () => {
        const raw = `---\nname: Greeting\ndescription: \"Desc\"\ntags:\n- a\n- b\n---\nBody`;
        const res = parseFrontMatter(raw);
        assert.strictEqual((res.attributes as any).name, 'Greeting');
        assert.strictEqual((res.attributes as any).description, 'Desc');
        assert.deepStrictEqual((res.attributes as any).tags, ['a','b']);
        assert.strictEqual(res.body.trim(), 'Body');
    });

    it('parses booleans and numbers', () => {
        const raw = `---\nflag: true\ncount: 42\n---\nX`;
        const res = parseFrontMatter(raw);
        assert.strictEqual((res.attributes as any).flag, true);
        assert.strictEqual((res.attributes as any).count, 42);
    });
});

