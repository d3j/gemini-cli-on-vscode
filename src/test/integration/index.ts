import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 20000
    });

    const testsRoot = path.resolve(__dirname, '.');

    return new Promise((c, e) => {
        glob('**/*.test.js', { cwd: testsRoot })
            .then(files => {
                // eslint-disable-next-line no-console
                console.error('INTEGRATION TEST FILES:', files);
                files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));
                mocha.run(failures => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        c();
                    }
                });
            })
            .catch(err => {
                console.error(err);
                e(err);
            });
    });
}
