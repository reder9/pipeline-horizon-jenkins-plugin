/* Pipeline Horizon Floating Card & Summary Progressive Hydration */
(function () {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';

    function createSvgIcon(width, height, strokeWidth, styleMarginRight, builder) {
        var svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', String(strokeWidth));
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        if (styleMarginRight) {
            svg.style.marginRight = styleMarginRight;
        }
        builder(svg);
        return svg;
    }

    function createTestsIcon() {
        return createSvgIcon(11, 11, 2, '3px', function (svg) {
            var p = document.createElementNS(SVG_NS, 'path');
            p.setAttribute('d', 'M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2');
            svg.appendChild(p);
            var l1 = document.createElementNS(SVG_NS, 'line');
            l1.setAttribute('x1', '8');
            l1.setAttribute('y1', '2');
            l1.setAttribute('x2', '16');
            l1.setAttribute('y2', '2');
            svg.appendChild(l1);
            var l2 = document.createElementNS(SVG_NS, 'line');
            l2.setAttribute('x1', '7');
            l2.setAttribute('y1', '16');
            l2.setAttribute('x2', '17');
            l2.setAttribute('y2', '16');
            svg.appendChild(l2);
        });
    }

    function createBoxIcon(size, marginRight) {
        return createSvgIcon(size, size, size < 10 ? 2.2 : 2, marginRight, function (svg) {
            var p = document.createElementNS(SVG_NS, 'path');
            p.setAttribute('d', 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z');
            svg.appendChild(p);
            var poly = document.createElementNS(SVG_NS, 'polyline');
            poly.setAttribute('points', '3.27 6.96 12 12.01 20.73 6.96');
            svg.appendChild(poly);
            var l = document.createElementNS(SVG_NS, 'line');
            l.setAttribute('x1', '12');
            l.setAttribute('y1', '22.08');
            l.setAttribute('x2', '12');
            l.setAttribute('y2', '12');
            svg.appendChild(l);
        });
    }

    function createSep() {
        var sep = document.createElement('span');
        sep.className = 'horizon-float-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '\u2022';
        return sep;
    }

    function getStatusClass(result, building) {
        if (result) {
            return String(result).toLowerCase();
        }
        return building ? 'in_progress' : 'unknown';
    }

    function getStatusLabel(result, building) {
        if (building) {
            return 'BUILDING';
        }
        return result ? String(result) : 'COMPLETED';
    }

    function getRailSummaryStatus(data) {
        if (data.failedStageCount > 0) {
            return data.failedStageCount + ' failed';
        }
        if (data.building) {
            return 'in progress';
        }
        if (data.result === 'SUCCESS') {
            return 'all passed';
        }
        return data.result ? String(data.result).toLowerCase() : 'completed';
    }

    function buildStageTitle(st) {
        var title = st.name + ' (' + st.status + ') - ' + (st.formattedDuration || '0s');
        if (st.hasArtifacts) {
            title += ' - ' + st.artifactCount + ' artifacts';
        }
        return title;
    }

    function renderStageContent(stages, data, runHorizonUrl) {
        var frag = document.createDocumentFragment();
        if (!stages || !stages.length) {
            return frag;
        }

        if (stages.length > 8) {
            var railWrapper = document.createElement('div');
            railWrapper.className = 'horizon-float-rail-wrapper';

            var track = document.createElement('div');
            track.className = 'horizon-float-rail-track';

            for (var i = 0; i < stages.length; i++) {
                var st = stages[i];
                var seg = document.createElement('a');
                seg.href = runHorizonUrl + '#stage=' + encodeURIComponent(st.id || '');
                seg.className = 'horizon-float-rail-seg status-' + (st.status ? String(st.status).toLowerCase() : 'unknown');
                seg.title = buildStageTitle(st);
                track.appendChild(seg);
            }
            railWrapper.appendChild(track);

            var meta = document.createElement('div');
            meta.className = 'horizon-float-rail-meta';

            var firstSpan = document.createElement('span');
            firstSpan.className = 'horizon-float-rail-first';
            firstSpan.textContent = 'Stage 1: ' + (stages[0].name || '');
            meta.appendChild(firstSpan);

            var sumSpan = document.createElement('span');
            sumSpan.className = 'horizon-float-rail-summary';
            sumSpan.textContent = stages.length + ' stages total (' + getRailSummaryStatus(data) + ')';
            meta.appendChild(sumSpan);

            var lastSpan = document.createElement('span');
            lastSpan.className = 'horizon-float-rail-last';
            lastSpan.textContent = 'Stage ' + stages.length + ': ' + (stages[stages.length - 1].name || '');
            meta.appendChild(lastSpan);

            railWrapper.appendChild(meta);
            frag.appendChild(railWrapper);
            return frag;
        }

        var trackRow = document.createElement('div');
        trackRow.className = 'horizon-float-stage-track';

        for (var j = 0; j < stages.length; j++) {
            var stage = stages[j];
            var wrap = document.createElement('div');
            wrap.className = 'horizon-float-stage-wrapper';

            var pill = document.createElement('a');
            pill.href = runHorizonUrl + '#stage=' + encodeURIComponent(stage.id || '');
            pill.className = 'horizon-float-stage-pill status-' + (stage.status ? String(stage.status).toLowerCase() : 'unknown');
            pill.title = buildStageTitle(stage);

            var dot = document.createElement('span');
            dot.className = 'horizon-float-stage-status-dot';
            pill.appendChild(dot);

            var nameSpan = document.createElement('span');
            nameSpan.className = 'horizon-float-stage-name';
            nameSpan.textContent = stage.name || '';
            pill.appendChild(nameSpan);

            if (stage.hasArtifacts) {
                var artIconWrap = document.createElement('span');
                artIconWrap.className = 'horizon-float-stage-artifact-icon';
                artIconWrap.title = stage.artifactCount + ' artifacts in this stage';
                artIconWrap.setAttribute('aria-hidden', 'true');
                artIconWrap.appendChild(createBoxIcon(9, ''));
                pill.appendChild(artIconWrap);
            }

            var durSpan = document.createElement('span');
            durSpan.className = 'horizon-float-stage-duration';
            durSpan.textContent = stage.formattedDuration || '0s';
            pill.appendChild(durSpan);

            wrap.appendChild(pill);

            if (j < stages.length - 1) {
                var arrow = document.createElement('span');
                arrow.className = 'horizon-float-stage-arrow';
                arrow.setAttribute('aria-hidden', 'true');
                arrow.textContent = '\u2192';
                wrap.appendChild(arrow);
            }

            trackRow.appendChild(wrap);
        }

        frag.appendChild(trackRow);
        return frag;
    }

    function hydrateCard(card) {
        if (!card || card.getAttribute('data-horizon-preview-state') !== 'pending') {
            return;
        }
        var previewUrl = card.getAttribute('data-preview-url');
        if (!previewUrl) {
            return;
        }
        card.setAttribute('data-horizon-preview-state', 'loading');

        fetch(previewUrl, { credentials: 'same-origin' })
            .then(function (resp) {
                if (!resp.ok) {
                    throw new Error('HTTP ' + resp.status);
                }
                return resp.json();
            })
            .then(function (data) {
                var stageHost = card.querySelector('[data-horizon-stage-host]');
                if (!data || !data.hasBuild) {
                    if (stageHost) {
                        stageHost.innerHTML = '';
                    }
                    card.setAttribute('data-horizon-preview-state', 'ready');
                    return;
                }

                var jobBaseUrl = card.getAttribute('data-job-url') || '';
                var runHorizonUrl = card.getAttribute('data-run-url') || 'lastBuild/horizon/';
                var artifactUrl = card.getAttribute('data-artifact-url') || '';
                if (jobBaseUrl && data.number) {
                    runHorizonUrl = jobBaseUrl + data.number + '/horizon/';
                    artifactUrl = jobBaseUrl + data.number + '/artifact/';
                }

                var runNumEl = card.querySelector('.horizon-floating-run-number');
                if (runNumEl && data.number) {
                    runNumEl.textContent = '#' + data.number;
                }

                var ctaEl = card.querySelector('.horizon-cta-btn');
                if (ctaEl && runHorizonUrl) {
                    ctaEl.setAttribute('href', runHorizonUrl);
                }

                var statusBadge = card.querySelector('[data-horizon-status-badge]');
                if (statusBadge) {
                    statusBadge.className = 'horizon-float-badge status-' + getStatusClass(data.result, data.building);
                    statusBadge.textContent = getStatusLabel(data.result, data.building);
                }

                var durEl = card.querySelector('[data-horizon-duration]');
                if (durEl) {
                    durEl.textContent = data.formattedDuration || '0s';
                }

                var dynamicBadges = card.querySelector('[data-horizon-dynamic-badges]');
                if (dynamicBadges) {
                    dynamicBadges.innerHTML = '';

                    var showStageSep = card.getAttribute('data-compact-summary') !== 'true';
                    if (showStageSep) {
                        dynamicBadges.appendChild(createSep());
                        var stageCountEl = document.createElement('span');
                        stageCountEl.className = 'horizon-floating-stages-count';
                        stageCountEl.textContent = data.stageCount + ' stages';
                        dynamicBadges.appendChild(stageCountEl);
                    } else {
                        var sumMeta = document.createElement('span');
                        sumMeta.className = 'horizon-summary-meta';
                        sumMeta.textContent = data.stageCount + ' stages \u2022 ' + (data.formattedDuration || '0s');
                        dynamicBadges.appendChild(sumMeta);
                    }

                    if (data.totalTests > 0) {
                        dynamicBadges.appendChild(createSep());
                        var testBadge = document.createElement('span');
                        testBadge.className = 'horizon-float-badge status-tests ' + (data.failedTests > 0 ? 'tests-failed' : 'tests-passed');
                        testBadge.title = data.totalTests + ' tests (' + (data.failedTests || 0) + ' failed, ' + (data.skippedTests || 0) + ' skipped)';
                        testBadge.appendChild(createTestsIcon());
                        testBadge.appendChild(document.createTextNode(' ' + data.totalTests + ' Tests'));
                        dynamicBadges.appendChild(testBadge);
                    }

                    if (card.getAttribute('data-show-artifacts') !== 'false' && data.artifactCount > 0 && artifactUrl) {
                        dynamicBadges.appendChild(createSep());
                        var artLink = document.createElement('a');
                        artLink.href = artifactUrl;
                        artLink.className = 'horizon-float-badge status-artifacts';
                        artLink.title = data.artifactCount + ' artifacts' + (data.formattedTotalArtifactSize ? ' (' + data.formattedTotalArtifactSize + ')' : '');
                        artLink.appendChild(createBoxIcon(11, '3px'));
                        artLink.appendChild(document.createTextNode(' ' + data.artifactCount + ' Artifacts'));
                        if (data.formattedTotalArtifactSize) {
                            var sizeSpan = document.createElement('span');
                            sizeSpan.className = 'horizon-float-artifact-size';
                            sizeSpan.textContent = '(' + data.formattedTotalArtifactSize + ')';
                            artLink.appendChild(sizeSpan);
                        }
                        dynamicBadges.appendChild(artLink);
                    }
                }

                if (stageHost) {
                    stageHost.innerHTML = '';
                    var stageNodes = renderStageContent(data.stages || [], data, runHorizonUrl);
                    stageHost.appendChild(stageNodes);
                }

                card.setAttribute('data-horizon-preview-state', 'ready');
            })
            .catch(function () {
                var stageHost = card.querySelector('[data-horizon-stage-host]');
                if (stageHost) {
                    stageHost.innerHTML = '';
                }
                card.setAttribute('data-horizon-preview-state', 'error');
            });
    }

    function initPendingHorizonCards() {
        var cards = document.querySelectorAll('[data-horizon-preview-state="pending"]');
        for (var i = 0; i < cards.length; i++) {
            hydrateCard(cards[i]);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPendingHorizonCards);
    } else {
        initPendingHorizonCards();
    }
})();
