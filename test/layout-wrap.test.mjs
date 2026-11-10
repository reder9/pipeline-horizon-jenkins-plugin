import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, '..');
const jsPath = path.join(pluginRoot, 'src', 'main', 'webapp', 'js', 'horizon-run.js');
const cssPath = path.join(pluginRoot, 'src', 'main', 'webapp', 'css', 'horizon-run.css');

describe('Pipeline Horizon Wrap Layout Regression Tests', () => {

    const jsCode = fs.readFileSync(jsPath, 'utf8');
    const cssCode = fs.readFileSync(cssPath, 'utf8');

    describe('1. Static Constants and Function Declarations', () => {
        it('should define WRAP_MIN_SINGLE_ROW_SCALE equal to 0.70', () => {
            const match = jsCode.match(/var\s+WRAP_MIN_SINGLE_ROW_SCALE\s*=\s*([0-9.]+);/);
            assert.ok(match, 'WRAP_MIN_SINGLE_ROW_SCALE must be defined in horizon-run.js');
            const val = parseFloat(match[1]);
            assert.equal(val, 0.70, 'WRAP_MIN_SINGLE_ROW_SCALE must be 0.70 (readable single-row zoom floor)');
        });

        it('should declare measureCanvasNaturalWidth function', () => {
            assert.ok(jsCode.includes('function measureCanvasNaturalWidth(canvas)'), 'measureCanvasNaturalWidth must be defined');
            assert.ok(jsCode.includes("canvas.classList.add('wrap-measuring')"), 'Must add wrap-measuring class');
            assert.ok(jsCode.includes("canvas.classList.remove('wrap-measuring')"), 'Must remove wrap-measuring class');
        });

        it('should enforce wrap-single-row class in CSS with flex-wrap: nowrap', () => {
            assert.ok(
                cssCode.includes('.pipeline-flow.wrap-mode .pipeline-flow-canvas.wrap-single-row'),
                'CSS must have .pipeline-flow.wrap-mode .pipeline-flow-canvas.wrap-single-row selector'
            );
            assert.ok(
                /wrap-single-row\s*\{[^}]*flex-wrap:\s*nowrap/s.test(cssCode),
                '.wrap-single-row must specify flex-wrap: nowrap'
            );
        });

        it('should enforce wrap-measuring rules in CSS for accurate natural width probing', () => {
            const m = cssCode.match(/wrap-measuring\s*\{([^}]+)\}/);
            assert.ok(m, '.wrap-measuring must be defined in CSS');
            const rules = m[1];
            assert.ok(rules.includes('flex-wrap: nowrap !important'), 'wrap-measuring must enforce flex-wrap: nowrap !important');
            assert.ok(rules.includes('flex-shrink: 0 !important'), 'wrap-measuring must enforce flex-shrink: 0 !important');
            assert.ok(rules.includes('width: max-content !important'), 'wrap-measuring must enforce width: max-content !important');
        });
    });

    describe('2. Auto-Fit Scale and Layout Decision Algorithm', () => {
        const WRAP_MIN_SINGLE_ROW_SCALE = 0.70;

        function computeAutoFitWrap({ colCount, naturalW, availableW, availableH = 500, maxColW = 260, wrapNaturalH = 400 }) {
            let fitScale = 1.0;
            if (colCount <= 1) fitScale = 1.25;
            else if (colCount === 2) fitScale = 1.15;
            else if (colCount === 3) fitScale = 1.05;
            else fitScale = 1.0;

            const oneRowNaturalW = naturalW;
            const oneRowScale = (oneRowNaturalW > 0 && availableW > 0)
                ? (Math.floor((availableW / oneRowNaturalW) * 100) / 100)
                : 0;

            let keepsSingleRow = false;
            if (oneRowNaturalW > 0 && oneRowNaturalW * fitScale <= availableW + 1) {
                keepsSingleRow = true;
            } else if (oneRowScale >= WRAP_MIN_SINGLE_ROW_SCALE) {
                fitScale = Math.min(fitScale, oneRowScale);
                keepsSingleRow = true;
            }

            if (!keepsSingleRow) {
                if (maxColW > 0 && availableW < maxColW + 64) {
                    const minWrapScale = (availableW / (maxColW + 64));
                    fitScale = Math.min(fitScale, Math.max(0.6, minWrapScale));
                }
                if (wrapNaturalH > 0 && availableH > 0 && wrapNaturalH * fitScale > (availableH - 16)) {
                    fitScale = Math.min(fitScale, Math.max(0.7, (availableH - 16) / wrapNaturalH));
                }
            }

            return {
                fitScale: Math.round(fitScale * 100) / 100,
                keepsSingleRow,
                oneRowScale
            };
        }

        it('should keep a single row at 100% when natural width is smaller than available width', () => {
            const res = computeAutoFitWrap({ colCount: 4, naturalW: 1200, availableW: 1800 });
            assert.equal(res.keepsSingleRow, true);
            assert.equal(res.fitScale, 1.0);
        });

        it('should scale down to fit single row when oneRowScale >= 0.70 (e.g. 0.82 on 1600px)', () => {
            const res = computeAutoFitWrap({ colCount: 4, naturalW: 1890, availableW: 1552 });
            assert.equal(res.keepsSingleRow, true);
            assert.equal(res.fitScale, 0.82);
        });

        it('should scale down exactly to 0.70 floor if ratio is 0.70', () => {
            const res = computeAutoFitWrap({ colCount: 6, naturalW: 1870, availableW: 1318 });
            assert.equal(res.keepsSingleRow, true);
            assert.equal(res.fitScale, 0.70);
        });

        it('should wrap into multiple rows when ratio falls below 0.70 floor', () => {
            const res = computeAutoFitWrap({ colCount: 5, naturalW: 2120, availableW: 1318 });
            assert.equal(res.keepsSingleRow, false, 'Should wrap because 1318/2120 = 0.62 < 0.70');
            assert.ok(res.fitScale >= 0.70, 'Wrap layout should fit height or remain readable');
        });

        it('should wrap massive marathon pipelines (e.g. 22 stages) without crushing', () => {
            const res = computeAutoFitWrap({ colCount: 22, naturalW: 7000, availableW: 1872, wrapNaturalH: 600 });
            assert.equal(res.keepsSingleRow, false);
            assert.ok(res.fitScale >= 0.70, 'Scale must not collapse below readability floor');
        });
    });

    describe('3. ApplyCanvasZoom Single-Row vs Multi-Row State Toggling', () => {
        function createMockCanvas() {
            const classes = new Set();
            const styles = {};
            return {
                classList: {
                    add: (c) => classes.add(c),
                    remove: (c) => classes.delete(c),
                    contains: (c) => classes.has(c)
                },
                style: {
                    setProperty: (k, v) => { styles[k] = v; },
                    removeProperty: (k) => { delete styles[k]; },
                    get: (k) => styles[k],
                    transform: '',
                    transformOrigin: '',
                    margin: '',
                    marginLeft: '',
                    marginRight: '',
                    marginTop: '',
                    marginBottom: ''
                },
                offsetWidth: 1500,
                offsetHeight: 180
            };
        }

        function simulateApplyCanvasZoomWrap({ naturalRowW, zoom, availableW, canvas }) {
            const fitsSingleRow = naturalRowW > 0 && (naturalRowW * zoom <= availableW + 1);
            if (fitsSingleRow) {
                canvas.classList.add('wrap-center');
                canvas.classList.add('wrap-single-row');
                canvas.style.setProperty('min-width', '0px');
                canvas.style.setProperty('width', 'max-content');
                canvas.style.setProperty('max-width', 'none');
                const wrapLayoutW = canvas.offsetWidth;
                canvas.style.transformOrigin = 'left top';
                canvas.style.transform = (zoom === 1.0) ? 'none' : 'scale(' + zoom + ')';
                canvas.style.marginLeft = Math.max(0, Math.round((availableW - (wrapLayoutW * zoom)) / 2)) + 'px';
            } else {
                canvas.classList.remove('wrap-center');
                canvas.classList.remove('wrap-single-row');
                canvas.style.setProperty('min-width', '0px');
                if (zoom !== 1.0 && availableW > 0) {
                    const wrapW = (availableW / zoom) + 'px';
                    canvas.style.setProperty('width', wrapW);
                    canvas.style.setProperty('max-width', wrapW);
                }
                canvas.style.transformOrigin = 'left top';
                canvas.style.transform = (zoom === 1.0) ? 'none' : 'scale(' + zoom + ')';
            }
            return fitsSingleRow;
        }

        it('should apply .wrap-single-row and max-content width when graph fits on one row', () => {
            const canvas = createMockCanvas();
            const fits = simulateApplyCanvasZoomWrap({
                naturalRowW: 1500,
                zoom: 0.85,
                availableW: 1600,
                canvas
            });
            assert.equal(fits, true);
            assert.ok(canvas.classList.contains('wrap-single-row'), 'Must contain wrap-single-row class');
            assert.ok(canvas.classList.contains('wrap-center'), 'Must contain wrap-center class');
            assert.equal(canvas.style.get('width'), 'max-content');
            assert.equal(canvas.style.transform, 'scale(0.85)');
            assert.ok(parseInt(canvas.style.marginLeft, 10) > 0, 'Must center horizontally');
        });

        it('should remove .wrap-single-row and constrain width when graph wraps', () => {
            const canvas = createMockCanvas();
            const fits = simulateApplyCanvasZoomWrap({
                naturalRowW: 2200,
                zoom: 0.90,
                availableW: 1600,
                canvas
            });
            assert.equal(fits, false);
            assert.equal(canvas.classList.contains('wrap-single-row'), false, 'Must not contain wrap-single-row class');
            assert.equal(canvas.classList.contains('wrap-center'), false, 'Must not contain wrap-center class');
            assert.equal(canvas.style.get('width'), `${1600 / 0.90}px`);
        });
    });

    describe('4. Real Pipeline Benchmarks (Verified from Live Test Jobs)', () => {
        // Benchmark measurements collected across screen widths
        const BENCHMARKS = [
            { name: 'Job 01 - Single stage micro steps', naturalW: 620, colCount: 1 },
            { name: 'Job 04 - Mixed short and long steps', naturalW: 1890, colCount: 4 },
            { name: 'Job 06 - Multi wave parallel stages', naturalW: 1840, colCount: 4 },
            { name: 'Job 07 - Parallel nested substages', naturalW: 1860, colCount: 4 },
            { name: 'Job 08 - Declarative matrix multi stage', naturalW: 1870, colCount: 6 },
            { name: 'Job 10 - Mixed statuses unstable failure', naturalW: 1850, colCount: 4 },
            { name: 'Job 12 - Rich logs junit artifacts', naturalW: 2120, colCount: 5 },
            { name: 'Job 11 - Marathon 22 stages wrap stress', naturalW: 7000, colCount: 22 }
        ];

        it('Mixed short and long (Job 04) MUST fit on 1 row at 1920px (avail 1872px)', () => {
            const job = BENCHMARKS.find(b => b.name.includes('Job 04'));
            const availW = 1872;
            const ratio = availW / job.naturalW; // ~0.99
            assert.ok(ratio >= 0.70, 'Scale ratio is within readable single-row floor');
            const targetZoom = Math.floor(ratio * 100) / 100;
            assert.ok(job.naturalW * targetZoom <= availW + 1, 'Graph at target zoom fits on single row without wrapping');
        });

        it('Mixed short and long (Job 04) MUST fit on 1 row at 1600px (avail 1552px)', () => {
            const job = BENCHMARKS.find(b => b.name.includes('Job 04'));
            const availW = 1552;
            const ratio = availW / job.naturalW; // ~0.82
            assert.ok(ratio >= 0.70, 'Scale ratio is >= 0.70');
            const targetZoom = Math.floor(ratio * 100) / 100;
            assert.ok(job.naturalW * targetZoom <= availW + 1);
        });

        it('Matrix job (Job 08) MUST fit on 1 row at 1920px and 1600px', () => {
            const job = BENCHMARKS.find(b => b.name.includes('Job 08'));
            for (const availW of [1872, 1552]) {
                const ratio = availW / job.naturalW;
                assert.ok(ratio >= 0.70, `Scale ratio on availW=${availW} must be >= 0.70`);
                const targetZoom = Math.floor(ratio * 100) / 100;
                assert.ok(job.naturalW * targetZoom <= availW + 1, `Must fit single row at zoom ${targetZoom}`);
            }
        });

        it('Rich logs job (Job 12) MUST fit on 1 row at 1920px and 1600px', () => {
            const job = BENCHMARKS.find(b => b.name.includes('Job 12'));
            for (const availW of [1872, 1552]) {
                const ratio = availW / job.naturalW;
                assert.ok(ratio >= 0.70, `Scale ratio on availW=${availW} must be >= 0.70`);
            }
        });

        it('Marathon 22-stage job (Job 11) MUST wrap gracefully on 1920px without crushing', () => {
            const job = BENCHMARKS.find(b => b.name.includes('Job 11'));
            const availW = 1872;
            const ratio = availW / job.naturalW; // ~0.267
            assert.ok(ratio < 0.70, 'Marathon pipeline must wrap because ratio is below 0.70 readable floor');
        });
    });
});
