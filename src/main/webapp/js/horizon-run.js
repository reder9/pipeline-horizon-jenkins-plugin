                var _hCfg = window.HORIZON_CONFIG || {};
var runBaseUrl = _hCfg.runBaseUrl || '';
if (!runBaseUrl.endsWith("/")) runBaseUrl += "/";
var jobBaseUrl = _hCfg.jobBaseUrl || '';
if (!jobBaseUrl.endsWith("/")) jobBaseUrl += "/";
var appRootUrl = _hCfg.appRootUrl || '/';
if (!appRootUrl.endsWith("/")) appRootUrl += "/";
var horizonBaseUrl = runBaseUrl + "horizon/";

                var graphData = null;
                var selectedStageId = null;
                var selectedStepId = null;
                var selectedLineStart = null;
                var selectedLineEnd = null;
                var pendingLineRange = null;
                var fullLogText = "";
                var pollTimer = null;
                var stepLogPollTimer = null;
                var totalPipelineDuration = 0;
                var totalActiveStageTimeMs = 0;
                var totalOverheadDurationMs = 0;
                var totalStartupDelayMs = 0;
                var longestStageId = null;
                var maxStageDuration = 0;
                var currentActiveInputIndex = 0;
                var currentTestsFilter = 'ALL';

                var ICON_SERVER = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px; flex-shrink:0;"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>';
                var ICON_SLIDERS = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px; flex-shrink:0;"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';
                var ICON_HOURGLASS = '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px; flex-shrink:0;"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>';
                var ICON_BOLT = '<svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px; margin-right:3px; flex-shrink:0;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
                var ICON_SUCCESS = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
                var ICON_FAILED = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                var ICON_UNSTABLE = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
                var ICON_ABORTED = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="7" y1="12" x2="17" y2="12"/></svg>';
                var ICON_IN_PROGRESS = '<svg aria-hidden="true" class="horizon-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
                var ICON_PAUSED_INPUT = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>';
                var ICON_SKIPPED = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
                var ICON_WARNING = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
                var ICON_CHEVRON_RIGHT = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
                var ICON_STEP_SUCCESS = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
                var ICON_STEP_FAILED = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                var ICON_STEP_UNSTABLE = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
                var ICON_STEP_ABORTED = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="7" y1="12" x2="17" y2="12"/></svg>';
                var ICON_STEP_IN_PROGRESS = '<svg class="horizon-spin" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
                var ICON_STEP_PAUSED_INPUT = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>';
                var ICON_STEP_SKIPPED = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';

                /* Accordion Step Status Icons (Matches Pipeline Graph View Screenshot) */
                var ICON_ACCORDION_SUCCESS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#059669" fill="rgba(5, 150, 105, 0.18)"/><polyline points="8 12 11 15 16 9" stroke="#10b981"/></svg>';
                var ICON_ACCORDION_FAILED = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#dc2626" fill="rgba(220, 38, 38, 0.18)"/><line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444"/><line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444"/></svg>';
                var ICON_ACCORDION_UNSTABLE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#d97706" fill="rgba(217, 119, 6, 0.18)"/><line x1="12" y1="8" x2="12" y2="12" stroke="#f59e0b"/><circle cx="12" cy="16" r="1" fill="#f59e0b" stroke="none"/></svg>';
                var ICON_ACCORDION_IN_PROGRESS = '<svg class="horizon-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="rgba(56, 189, 248, 0.25)"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#38bdf8"/></svg>';
                var ICON_ACCORDION_PAUSED_INPUT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#7c3aed" fill="rgba(124, 58, 237, 0.22)"/><line x1="10" y1="15" x2="10" y2="9" stroke="#a78bfa"/><line x1="14" y1="15" x2="14" y2="9" stroke="#a78bfa"/></svg>';
                var ICON_ACCORDION_SKIPPED = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#64748b" fill="rgba(100, 116, 139, 0.18)"/><line x1="8" y1="12" x2="16" y2="12" stroke="#94a3b8"/></svg>';
                var ICON_ACCORDION_ABORTED = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke="#64748b" fill="rgba(100, 116, 139, 0.18)"/><circle cx="12" cy="12" r="3" fill="#94a3b8" stroke="none"/></svg>';

                /* Pipeline Trend Icons */
                var ICON_TREND_UP = '<svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:2px;"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';
                var ICON_TREND_DOWN = '<svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:2px;"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>';

                /* Step Glyph Icons (Echo, Shell, Tests, Sleep, Artifacts, Git) */
                var GLYPH_ECHO = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
                var GLYPH_SHELL = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>';
                var GLYPH_TEST = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><line x1="8" y1="2" x2="16" y2="2"/><line x1="7" y1="16" x2="17" y2="16"/></svg>';
                var GLYPH_SLEEP = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="10" y1="2" x2="14" y2="2"/></svg>';
                var GLYPH_ARCHIVE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
                var GLYPH_GIT = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>';

                function getStepGlyph(step) {
                    var fn = (step.name || '').toLowerCase();
                    var disp = (step.displayName || '').toLowerCase();
                    if (fn === 'echo' || disp.indexOf('echo') !== -1 || disp.indexOf('running') !== -1 || disp.indexOf('suite') !== -1 || disp.indexOf('print') !== -1) {
                        return GLYPH_ECHO;
                    }
                    if (fn === 'sh' || fn === 'bat' || fn === 'powershell' || fn === 'cmd' || disp.indexOf('sh') !== -1 || disp.indexOf('mkdir') !== -1 || disp.indexOf('cat ') !== -1 || (disp.indexOf('git') === -1 && disp.indexOf('curl') !== -1)) {
                        return GLYPH_SHELL;
                    }
                    if (fn === 'sleep' || disp.indexOf('sleep') !== -1 || disp.indexOf('delay') !== -1 || disp.indexOf('pause') !== -1) {
                        return GLYPH_SLEEP;
                    }
                    if (fn === 'junit' || fn === 'xunit' || disp.indexOf('junit') !== -1 || disp.indexOf('test') !== -1) {
                        return GLYPH_TEST;
                    }
                    if (fn === 'archiveartifacts' || fn === 'archive' || disp.indexOf('archive') !== -1 || disp.indexOf('artifact') !== -1 || disp.indexOf('stash') !== -1) {
                        return GLYPH_ARCHIVE;
                    }
                    if (fn === 'git' || fn === 'checkout' || disp.indexOf('git') !== -1 || disp.indexOf('checkout') !== -1) {
                        return GLYPH_GIT;
                    }
                    return '';
                }

                var appEl = document.getElementById('horizon-run-app');
                var prefTheme = (appEl ? appEl.getAttribute('data-pref-theme') : null) || 'auto';
                var prefLayout = (appEl ? appEl.getAttribute('data-pref-layout') : null) || 'scroll';
                var prefDensity = (appEl ? appEl.getAttribute('data-pref-density') : null) || 'comfort';
                var prefHideSkipped = appEl ? (appEl.getAttribute('data-pref-hide-skipped') === 'true') : false;

                var currentLayoutMode = localStorage.getItem('horizon_layout_mode') || prefLayout;
                var currentDensity = localStorage.getItem('horizon_density') || prefDensity;
                var hideSkipped = localStorage.getItem('horizon_hide_skipped') !== null
                    ? (localStorage.getItem('horizon_hide_skipped') === 'true')
                    : prefHideSkipped;
                var currentScreenMode = localStorage.getItem('horizon_screen_mode') || 'embedded';
                var currentHorizonTheme = prefTheme;

                var currentZoom = parseFloat(localStorage.getItem('horizon_canvas_zoom') || '1.0');
                if (isNaN(currentZoom) || currentZoom < 0.35 || currentZoom > 1.8) {
                    currentZoom = 1.0;
                }
                var userManualZoomApplied = false;
                var isPanning = false;
                var dragStartX = 0;
                var dragStartY = 0;
                var scrollStartX = 0;
                var scrollStartY = 0;
                var dragDistance = 0;
                window._isGraphDragging = false;

                function isJenkinsDarkTheme() {
                    var html = document.documentElement;
                    var body = document.body;
                    var themeAttr = (html ? html.getAttribute('data-theme') : '') || (body ? body.getAttribute('data-theme') : '') || '';
                    if (themeAttr.indexOf('dark') !== -1) return true;
                    if (themeAttr === 'light') return false;

                    var themeTag = document.getElementById('theme-manager-theme');
                    if (themeTag && themeTag.textContent) {
                        try {
                            var parsed = JSON.parse(themeTag.textContent);
                            if (parsed.id === 'dark') return true;
                            if (parsed.id === 'light') return false;
                        } catch(e) {}
                    }

                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        return true;
                    }
                    return false;
                }

                function updateThemeState() {
                    var isDark = false;
                    if (currentHorizonTheme === 'dark') {
                        isDark = true;
                    } else if (currentHorizonTheme === 'light') {
                        isDark = false;
                    } else { // 'auto'
                        isDark = isJenkinsDarkTheme();
                    }

                    var app = document.getElementById('horizon-run-app');
                    if (app) {
                        if (isDark) {
                            app.classList.add('theme-dark');
                            app.classList.remove('theme-light');
                        } else {
                            app.classList.remove('theme-dark');
                            app.classList.add('theme-light');
                        }
                    }
                }

                if (window.MutationObserver) {
                    var horizonThemeObserver = new MutationObserver(function() {
                        if (currentHorizonTheme === 'auto') {
                            updateThemeState();
                        }
                    });
                    horizonThemeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
                    if (document.body) {
                        horizonThemeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
                    }
                }

                if (window.matchMedia) {
                    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
                        if (currentHorizonTheme === 'auto') {
                            updateThemeState();
                        }
                    });
                }

                function applyScreenMode() {
                    var app = document.getElementById('horizon-run-app');
                    var btn = document.getElementById('btn-screen-mode');
                    var hint = document.getElementById('screen-mode-hint');
                    var toolBtn = document.getElementById('canvas-tool-screen-btn');
                    if (!app || !btn) return;

                    if (currentScreenMode === 'fullscreen') {
                        var jHeader = document.getElementById('header') || document.querySelector('.page-header, .jenkins-header');
                        if (jHeader) {
                            var hRect = jHeader.getBoundingClientRect();
                            var hBottom = Math.max(0, Math.ceil(hRect.bottom || hRect.height || 58));
                            app.style.setProperty('--horizon-fullscreen-top', hBottom + 'px');
                        }
                        app.classList.add('mode-fullscreen');
                        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16"/><path d="M15 4v16"/></svg> Embedded View';
                        btn.title = "Switch to Embedded Jenkins View";
                        if (hint) hint.innerText = "Standalone Canvas (Esc to exit)";
                        if (toolBtn) {
                            toolBtn.title = "Exit Fullscreen Canvas (Esc)";
                            toolBtn.setAttribute('aria-label', "Exit Fullscreen Canvas");
                            toolBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                        }
                    } else {
                        app.classList.remove('mode-fullscreen');
                        app.style.removeProperty('--horizon-fullscreen-top');
                        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Full Screen';
                        btn.title = "Switch to Full-Screen Standalone Canvas";
                        if (hint) hint.innerText = "Embedded in Jenkins";
                        if (toolBtn) {
                            toolBtn.title = "Fullscreen Canvas Mode";
                            toolBtn.setAttribute('aria-label', "Fullscreen Canvas Mode");
                            toolBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>';
                        }
                    }
                    updateThemeState();
                }

                function toggleScreenMode() {
                    currentScreenMode = (currentScreenMode === 'fullscreen') ? 'embedded' : 'fullscreen';
                    localStorage.setItem('horizon_screen_mode', currentScreenMode);
                    applyScreenMode();
                    if (typeof drawFlowConnectors === 'function') {
                        setTimeout(scheduleDrawFlowConnectors, 40);
                    }
                }

                function isAnyHorizonModalOpen() {
                    var ids = ['artifact-preview-modal', 'artifacts-modal', 'agent-modal', 'replay-modal', 'tests-modal', 'shortcuts-modal', 'parameters-modal'];
                    for (var i = 0; i < ids.length; i++) {
                        var el = document.getElementById(ids[i]);
                        if (el && el.classList.contains('active')) {
                            return true;
                        }
                    }
                    return false;
                }

                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && currentScreenMode === 'fullscreen' && !isAnyHorizonModalOpen()) {
                        toggleScreenMode();
                    }
                });

                function toggleCanvasGrid() {
                    var hideGrid = localStorage.getItem('horizon_hide_grid') === 'true';
                    hideGrid = !hideGrid;
                    localStorage.setItem('horizon_hide_grid', hideGrid ? 'true' : 'false');
                    applyCanvasGridPreference();
                }

                function applyCanvasGridPreference() {
                    var hideGrid = localStorage.getItem('horizon_hide_grid') === 'true';
                    var containers = document.querySelectorAll('.graph-canvas-container');
                    for (var i = 0; i < containers.length; i++) {
                        if (hideGrid) {
                            containers[i].classList.add('no-grid');
                        } else {
                            containers[i].classList.remove('no-grid');
                        }
                    }
                    var btn = document.getElementById('canvas-tool-grid-btn');
                    if (btn) {
                        if (hideGrid) {
                            btn.classList.add('active');
                            btn.title = "Show canvas background dots";
                            btn.setAttribute('aria-label', "Show canvas background dots");
                        } else {
                            btn.classList.remove('active');
                            btn.title = "Hide canvas background dots";
                            btn.setAttribute('aria-label', "Hide canvas background dots");
                        }
                    }
                }

                function applyViewPreferences() {
                    applyScreenMode();
                    applyCanvasGridPreference();
                    var flow = document.getElementById('pipeline-flow');
                    if (flow) {
                        if (currentLayoutMode === 'wrap') {
                            flow.classList.add('wrap-mode');
                        } else {
                            flow.classList.remove('wrap-mode');
                        }

                        if (currentDensity === 'compact') {
                            flow.classList.add('compact-density');
                        } else {
                            flow.classList.remove('compact-density');
                        }

                        if (!flow.getAttribute('data-wheel-bound')) {
                            flow.setAttribute('data-wheel-bound', 'true');
                            flow.addEventListener('wheel', function(e) {
                                if (e.ctrlKey || e.metaKey || e.altKey) {
                                    e.preventDefault();
                                    userManualZoomApplied = true;
                                    if (e.deltaY < 0) {
                                        zoomIn();
                                    } else {
                                        zoomOut();
                                    }
                                } else if (currentLayoutMode === 'scroll') {
                                    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                                        e.preventDefault();
                                        flow.scrollLeft += (e.shiftKey ? e.deltaY : e.deltaX);
                                    } else if (flow.scrollHeight > flow.clientHeight + 8) {
                                        // Allow normal vertical wheel scroll for stacked parallel branches
                                    } else {
                                        e.preventDefault();
                                        flow.scrollLeft += e.deltaY;
                                    }
                                } else if (currentLayoutMode === 'wrap') {
                                    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                                        e.preventDefault();
                                        flow.scrollLeft += (e.shiftKey ? e.deltaY : e.deltaX);
                                    }
                                }
                            }, { passive: false });
                        }

                        var zoomDisplay = document.getElementById('canvas-zoom-display');
                        if (zoomDisplay && !zoomDisplay.getAttribute('data-wheel-bound')) {
                            zoomDisplay.setAttribute('data-wheel-bound', 'true');
                            zoomDisplay.addEventListener('wheel', function(e) {
                                e.preventDefault();
                                userManualZoomApplied = true;
                                if (e.deltaY < 0) {
                                    zoomIn();
                                } else {
                                    zoomOut();
                                }
                            }, { passive: false });
                        }
                    }

                    var btnScroll = document.getElementById('ctrl-layout-scroll');
                    var btnWrap = document.getElementById('ctrl-layout-wrap');
                    if (btnScroll && btnWrap) {
                        if (currentLayoutMode === 'wrap') {
                            btnWrap.classList.add('active');
                            btnScroll.classList.remove('active');
                            btnWrap.setAttribute('aria-pressed', 'true');
                            btnScroll.setAttribute('aria-pressed', 'false');
                        } else {
                            btnScroll.classList.add('active');
                            btnWrap.classList.remove('active');
                            btnScroll.setAttribute('aria-pressed', 'true');
                            btnWrap.setAttribute('aria-pressed', 'false');
                        }
                    }

                    var tbLayoutBtn = document.getElementById('canvas-tool-layout-btn');
                    if (tbLayoutBtn) {
                        if (currentLayoutMode === 'wrap') {
                            tbLayoutBtn.title = "Switch to Canvas Flow Layout";
                            tbLayoutBtn.setAttribute('aria-label', "Switch to Canvas Flow Layout");
                            tbLayoutBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="12" x2="6" y2="12"/><polyline points="10 8 6 12 10 16"/><polyline points="14 8 18 12 14 16"/></svg>';
                        } else {
                            tbLayoutBtn.title = "Switch to Wrap Layout";
                            tbLayoutBtn.setAttribute('aria-label', "Switch to Wrap Layout");
                            tbLayoutBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>';
                        }
                    }

                    var btnComfort = document.getElementById('ctrl-density-comfort');
                    var btnCompact = document.getElementById('ctrl-density-compact');
                    if (btnComfort && btnCompact) {
                        if (currentDensity === 'compact') {
                            btnCompact.classList.add('active');
                            btnComfort.classList.remove('active');
                            btnCompact.setAttribute('aria-pressed', 'true');
                            btnComfort.setAttribute('aria-pressed', 'false');
                        } else {
                            btnComfort.classList.add('active');
                            btnCompact.classList.remove('active');
                            btnComfort.setAttribute('aria-pressed', 'true');
                            btnCompact.setAttribute('aria-pressed', 'false');
                        }
                    }

                    var chkHideSkipped = document.getElementById('ctrl-hide-skipped');
                    if (chkHideSkipped) {
                        chkHideSkipped.checked = hideSkipped;
                    }

                    if (typeof drawFlowConnectors === 'function') {
                        setTimeout(scheduleDrawFlowConnectors, 40);
                    }
                }

                function resetFlowSvgDimensions() {
                    var svg = document.getElementById('pipeline-flow-svg');
                    if (svg) {
                        svg.setAttribute('width', '0');
                        svg.setAttribute('height', '0');
                        svg.style.width = '0px';
                        svg.style.height = '0px';
                    }
                }

                function toggleLayoutMode() {
                    setLayoutMode(currentLayoutMode === 'scroll' ? 'wrap' : 'scroll');
                }

                function setLayoutMode(mode) {
                    currentLayoutMode = mode;
                    localStorage.setItem('horizon_layout_mode', mode);
                    var flow = document.getElementById('pipeline-flow');
                    var canvas = document.getElementById('pipeline-flow-canvas');
                    resetFlowSvgDimensions();
                    if (canvas) {
                        canvas.style.transform = 'none';
                        canvas.style.marginLeft = '0px';
                        canvas.style.marginRight = '0px';
                        canvas.style.marginBottom = '0px';
                    }
                    if (flow) {
                        flow.scrollLeft = 0;
                        flow.scrollTop = 0;
                    }
                    applyViewPreferences();
                    autoFitPipelineGraph(false);
                    setTimeout(function() {
                        if (selectedStageId) {
                            scrollStageIntoPipelineView(selectedStageId, false);
                        }
                        scheduleDrawFlowConnectors();
                    }, 40);
                }

                function setDensity(density) {
                    currentDensity = density;
                    localStorage.setItem('horizon_density', density);
                    resetFlowSvgDimensions();
                    applyViewPreferences();
                    setTimeout(function() {
                        applyCanvasZoom();
                        scheduleDrawFlowConnectors();
                    }, 30);
                }

                function toggleHideSkipped(checked) {
                    hideSkipped = checked;
                    localStorage.setItem('horizon_hide_skipped', checked ? 'true' : 'false');
                    if (graphData) {
                        renderGraph(graphData);
                    }
                }

                function updateZoomDisplay() {
                    var el = document.getElementById('canvas-zoom-display');
                    if (el) {
                        el.textContent = Math.round(currentZoom * 100) + '%';
                    }
                }

                function applyCanvasZoom() {
                    var canvas = document.getElementById('pipeline-flow-canvas');
                    var flow = document.getElementById('pipeline-flow');
                    if (!canvas || !flow) return;

                    resetFlowSvgDimensions();
                    resetCanvasLayoutOverrides(canvas);

                    // Centre against the real content box: the flow container has horizontal padding that
                    // clientWidth includes, which used to push the graph off-centre by that padding.
                    var cs = window.getComputedStyle(flow);
                    var padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
                    var padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
                    var availableW = Math.max(0, flow.clientWidth - padX);
                    var availableH = Math.max(0, flow.clientHeight - padY);
                    var zoom = currentZoom;

                    var startNode = document.getElementById('terminal-node-start');
                    var endNode = document.getElementById('terminal-node-end');
                    var contentSpanW = 0;
                    if (startNode && endNode) {
                        var sR = startNode.getBoundingClientRect();
                        var eR = endNode.getBoundingClientRect();
                        contentSpanW = (eR.right - sR.left);
                    }

                    if (currentLayoutMode === 'wrap') {
                        // A single row of stages is centred as a block; multi-row graphs keep the
                        // left-to-right serpentine reading order.
                        var cols = canvas.querySelectorAll('.stage-column');
                        var firstTop = null;
                        var singleRow = true;
                        for (var i = 0; i < cols.length; i++) {
                            var t = cols[i].offsetTop;
                            if (firstTop === null) {
                                firstTop = t;
                            } else if (Math.abs(t - firstTop) > 6) {
                                singleRow = false;
                                break;
                            }
                        }

                        var fitsSingleRow = singleRow && (contentSpanW * zoom <= availableW + 4);

                        if (fitsSingleRow) {
                            canvas.classList.add('wrap-center');
                            canvas.style.setProperty('min-width', '0px', 'important');
                            canvas.style.setProperty('width', 'max-content', 'important');
                            canvas.style.setProperty('max-width', 'none', 'important');
                            var wrapLayoutW = canvas.offsetWidth;
                            var wrapLayoutH = canvas.offsetHeight;
                            var wrapVisualH = wrapLayoutH * zoom;
                            var wrapBaseBottom = (zoom !== 1.0) ? Math.round(wrapLayoutH * (zoom - 1)) : 0;
                            canvas.style.transformOrigin = 'left top';
                            canvas.style.transform = (zoom === 1.0) ? 'none' : 'scale(' + zoom + ')';
                            canvas.style.margin = '0';
                            canvas.style.marginLeft = Math.max(0, Math.round((availableW - (wrapLayoutW * zoom)) / 2)) + 'px';
                            canvas.style.marginRight = (zoom !== 1.0) ? Math.round(wrapLayoutW * (zoom - 1)) + 'px' : '0px';
                            canvas.style.marginTop = '0px';
                            canvas.style.marginBottom = wrapBaseBottom + 'px';
                            var settledWrapH = Math.max(0, flow.clientHeight - padY);
                            var wrapTopOffset = (wrapVisualH + 4 <= settledWrapH) ? Math.max(0, Math.round((settledWrapH - wrapVisualH) / 2)) : 0;
                            canvas.style.marginTop = wrapTopOffset + 'px';
                            canvas.style.marginBottom = (wrapBaseBottom - wrapTopOffset) + 'px';
                        } else {
                            canvas.classList.remove('wrap-center');
                            canvas.style.setProperty('min-width', '0px', 'important');
                            if (zoom !== 1.0 && availableW > 0) {
                                var wrapW = (availableW / zoom) + 'px';
                                canvas.style.setProperty('width', wrapW, 'important');
                                canvas.style.setProperty('max-width', wrapW, 'important');
                            }
                            var multiLayoutH = canvas.offsetHeight;
                            var multiVisualH = multiLayoutH * zoom;
                            var multiBaseBottom = (zoom !== 1.0) ? Math.round(multiLayoutH * (zoom - 1)) : 0;
                            canvas.style.transformOrigin = 'left top';
                            canvas.style.transform = (zoom === 1.0) ? 'none' : 'scale(' + zoom + ')';
                            canvas.style.margin = '0';
                            canvas.style.marginTop = '0px';
                            canvas.style.marginBottom = multiBaseBottom + 'px';
                            var settledMultiH = Math.max(0, flow.clientHeight - padY);
                            var multiTopOffset = (multiVisualH + 4 <= settledMultiH) ? Math.max(0, Math.round((settledMultiH - multiVisualH) / 2)) : 0;
                            canvas.style.marginTop = multiTopOffset + 'px';
                            canvas.style.marginBottom = (multiBaseBottom - multiTopOffset) + 'px';
                        }
                    } else {
                        // Canvas Flow (scroll) mode
                        canvas.style.setProperty('min-width', '0px', 'important');
                        canvas.style.setProperty('width', 'max-content', 'important');
                        canvas.style.setProperty('max-width', 'none', 'important');

                        var layoutW = canvas.offsetWidth;
                        var layoutH = canvas.offsetHeight;
                        var visualW = (contentSpanW || layoutW) * zoom;
                        var visualH = layoutH * zoom;
                        var baseBottom = (zoom !== 1.0) ? Math.round(layoutH * (zoom - 1)) : 0;
                        canvas.style.transformOrigin = 'left top';
                        canvas.style.transform = (zoom === 1.0) ? 'none' : 'scale(' + zoom + ')';
                        canvas.style.margin = '0';
                        canvas.style.marginRight = (zoom !== 1.0) ? Math.round(layoutW * (zoom - 1)) + 'px' : '0px';
                        canvas.style.marginTop = '0px';
                        canvas.style.marginBottom = baseBottom + 'px';

                        if (visualW + (16 * zoom) <= availableW) {
                            canvas.style.marginLeft = Math.max(0, Math.round((availableW - (layoutW * zoom)) / 2)) + 'px';
                        } else {
                            canvas.style.marginLeft = '0px';
                        }

                        var settledFlowH = Math.max(0, flow.clientHeight - padY);
                        var flowTopOffset = (visualH + 4 <= settledFlowH) ? Math.max(0, Math.round((settledFlowH - visualH) / 2)) : 0;
                        canvas.style.marginTop = flowTopOffset + 'px';
                        canvas.style.marginBottom = (baseBottom - flowTopOffset) + 'px';
                    }

                    updateZoomDisplay();
                    scheduleDrawFlowConnectors();
                }

                function setZoom(scale, isUserManual) {
                    currentZoom = Math.max(0.20, Math.min(1.8, Math.round(scale * 100) / 100));
                    if (isUserManual) {
                        userManualZoomApplied = true;
                        localStorage.setItem('horizon_canvas_zoom', currentZoom.toString());
                    }
                    applyCanvasZoom();
                }

                function zoomIn() {
                    setZoom(currentZoom + 0.15, true);
                }

                function zoomOut() {
                    setZoom(currentZoom - 0.15, true);
                }

                function resetZoom() {
                    setZoom(1.0, true);
                }

                function resetCanvasLayoutOverrides(canvas) {
                    canvas.style.transform = 'none';
                    canvas.style.transformOrigin = '';
                    canvas.style.marginLeft = '0px';
                    canvas.style.marginRight = '0px';
                    canvas.style.marginBottom = '0px';
                    canvas.style.marginTop = '';
                    canvas.style.margin = '';
                    canvas.style.minWidth = '';
                    canvas.style.removeProperty('width');
                    canvas.style.removeProperty('max-width');
                    canvas.classList.remove('wrap-center');
                }

                var settledRefitTimers = [];
                // Fonts, scrollbars and the drawer settle a moment after first paint; re-fit once they have,
                // so the very first view is centered against the final layout rather than a transient one.
                function scheduleSettledRefit() {
                    for (var i = 0; i < settledRefitTimers.length; i++) clearTimeout(settledRefitTimers[i]);
                    settledRefitTimers = [];
                    var delays = [250, 900];
                    for (var d = 0; d < delays.length; d++) {
                        settledRefitTimers.push(setTimeout(function() {
                            if (!userManualZoomApplied) autoFitPipelineGraph(false);
                        }, delays[d]));
                    }
                    if (document.fonts && document.fonts.ready && !window._horizonFontsRefitBound) {
                        window._horizonFontsRefitBound = true;
                        document.fonts.ready.then(function() {
                            if (!userManualZoomApplied) autoFitPipelineGraph(false);
                        });
                    }
                }

                function attachFlowResizeWatch(flow) {
                    if (!flow || flow._roBound || !window.ResizeObserver) return;
                    flow._roBound = true;
                    var lastW = flow.clientWidth;
                    var timer = null;
                    new ResizeObserver(function() {
                        var w = flow.clientWidth;
                        // Ignore the few pixels a scrollbar appearing/disappearing would cause.
                        if (Math.abs(w - lastW) <= 12) return;
                        lastW = w;
                        if (timer) clearTimeout(timer);
                        timer = setTimeout(function() {
                            if (!userManualZoomApplied) {
                                autoFitPipelineGraph(false);
                            } else {
                                applyCanvasZoom();
                            }
                        }, 120);
                    }).observe(flow);
                }

                function autoFitPipelineGraph(force) {
                    var flow = document.getElementById('pipeline-flow');
                    var canvas = document.getElementById('pipeline-flow-canvas');
                    if (!flow || !canvas) return;

                    resetFlowSvgDimensions();
                    resetCanvasLayoutOverrides(canvas);

                    var cs = window.getComputedStyle(flow);
                    var padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
                    var padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
                    var availableW = flow.clientWidth - padX;
                    var availableH = flow.clientHeight - padY;
                    if (availableW <= 0) availableW = flow.parentElement ? (flow.parentElement.clientWidth - padX) : 900;
                    if (availableH <= 0) availableH = 450;

                    var startNode = document.getElementById('terminal-node-start');
                    var endNode = document.getElementById('terminal-node-end');
                    var columns = canvas.querySelectorAll('.stage-column');
                    var colCount = columns.length;

                    var fitScale = 1.0;

                    if (currentLayoutMode === 'wrap') {
                        // In Wrap view: stages wrap into multiple visual rows across the full width.
                        // It is natural and intended for multi-row pipelines to scroll vertically.
                        // Never crush multi-stage pipelines vertically in wrap mode!
                        if (colCount <= 1) {
                            fitScale = 1.25;
                        } else if (colCount === 2) {
                            fitScale = 1.15;
                        } else if (colCount === 3) {
                            fitScale = 1.05;
                        } else {
                            fitScale = 1.0;
                        }

                        // On very narrow viewports where a single card or stage column exceeds available width,
                        // scale down gracefully so it doesn't clip
                        var maxColW = 0;
                        for (var i = 0; i < columns.length; i++) {
                            var cw = columns[i].offsetWidth;
                            if (cw > maxColW) maxColW = cw;
                        }
                        if (maxColW > 0 && availableW < maxColW + 64) {
                            var minWrapScale = (availableW / (maxColW + 64));
                            fitScale = Math.min(fitScale, Math.max(0.6, minWrapScale));
                        }
                        // Fit the whole wrapped graph into the visible height when possible without
                        // becoming unreadable (floor 0.7), leaving 16px vertical breathing room so
                        // bottom pointers never clip or cramp against scrollbars.
                        var wrapNaturalH = canvas.scrollHeight;
                        if (wrapNaturalH > 0 && availableH > 0 && wrapNaturalH * fitScale > (availableH - 16)) {
                            fitScale = Math.min(fitScale, Math.max(0.7, (availableH - 16) / wrapNaturalH));
                        }
                    } else {
                        // In Canvas Flow (horizontal scroll) view:
                        // Scale so the entire pipeline fits comfortably from Start to End
                        var naturalW = canvas.scrollWidth;
                        var naturalH = canvas.scrollHeight;

                        if (startNode && endNode) {
                            var startR = startNode.getBoundingClientRect();
                            var endR = endNode.getBoundingClientRect();
                            var spanW = (endR.right - startR.left) + 40;
                            if (spanW > 60) {
                                naturalW = spanW;
                            }
                        }

                        var scaleW = (naturalW > 0 && availableW > 0) ? (availableW / naturalW) : 1.0;
                        var scaleH = (naturalH > 0 && availableH > 0) ? ((availableH - 16) / naturalH) : 1.0;
                        fitScale = Math.min(scaleW, scaleH);

                        if (colCount <= 1) {
                            fitScale = Math.min(1.25, Math.max(1.10, scaleW));
                        } else if (colCount === 2) {
                            fitScale = Math.min(1.15, Math.max(1.00, fitScale));
                        } else if (colCount === 3) {
                            fitScale = Math.min(1.05, Math.max(0.95, fitScale));
                        } else {
                            // Multi-stage pipeline: scale down to fit Start-to-End comfortably on screen
                            // with a readable 50% minimum floor for initial load; wider pipelines scroll horizontally.
                            fitScale = Math.min(1.0, Math.max(0.50, fitScale));
                        }
                    }

                    fitScale = Math.max(0.20, Math.min(1.80, Math.round(fitScale * 100) / 100));

                    setZoom(fitScale, force);
                    attachFlowResizeWatch(flow);
                    requestAnimationFrame(function() {
                        if (flow) {
                            flow.scrollLeft = 0;
                            flow.scrollTop = 0;
                        }
                    });
                }

                function fitFlowToScreen() {
                    userManualZoomApplied = true;
                    autoFitPipelineGraph(true);
                }

                function initFlowPanAndDrag() {
                    var flow = document.getElementById('pipeline-flow');
                    if (!flow || flow._panBound) return;
                    flow._panBound = true;

                    var isPanning = false;
                    var hasMoved = false;
                    var startX = 0;
                    var startY = 0;
                    var startScrollLeft = 0;
                    var startScrollTop = 0;
                    var targetScrollLeft = 0;
                    var targetScrollTop = 0;
                    var rafPending = false;

                    function applyPan() {
                        if (!flow) return;
                        flow.scrollLeft = targetScrollLeft;
                        flow.scrollTop = targetScrollTop;
                        rafPending = false;
                    }

                    flow.addEventListener('mousedown', function(e) {
                        if (e.button !== 0) return;

                        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a') ||
                            e.target.closest('.stage-artifacts-badge') || e.target.closest('.stage-card-link-btn') ||
                            e.target.closest('.stage-card-restart-btn') || e.target.closest('.stage-agent-badge') ||
                            e.target.closest('.canvas-tool-btn') || e.target.closest('.stage-restart-btn')) {
                            return;
                        }

                        // Prevent browser native text selection and HTML5 ghost drag
                        e.preventDefault();

                        isPanning = true;
                        hasMoved = false;
                        startX = e.clientX;
                        startY = e.clientY;
                        startScrollLeft = flow.scrollLeft;
                        startScrollTop = flow.scrollTop;
                        targetScrollLeft = startScrollLeft;
                        targetScrollTop = startScrollTop;
                        flow.classList.add('is-panning');
                    });

                    window.addEventListener('mousemove', function(e) {
                        if (!isPanning) return;
                        var dx = e.clientX - startX;
                        var dy = e.clientY - startY;

                        if (!hasMoved && Math.hypot(dx, dy) > 3) {
                            hasMoved = true;
                            window._isGraphDragging = true;
                        }

                        if (hasMoved) {
                            targetScrollLeft = startScrollLeft - dx;
                            targetScrollTop = startScrollTop - dy;
                            if (!rafPending) {
                                rafPending = true;
                                requestAnimationFrame(applyPan);
                            }
                        }
                    });

                    window.addEventListener('mouseup', function(e) {
                        if (!isPanning) return;
                        isPanning = false;
                        flow.classList.remove('is-panning');

                        if (hasMoved) {
                            flow.scrollLeft = targetScrollLeft;
                            flow.scrollTop = targetScrollTop;
                            setTimeout(function() {
                                window._isGraphDragging = false;
                            }, 80);
                        } else {
                            window._isGraphDragging = false;
                        }
                    });

                    flow.addEventListener('touchstart', function(e) {
                        if (e.touches.length === 1) {
                            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a') ||
                                e.target.closest('.stage-artifacts-badge') || e.target.closest('.stage-card-link-btn') ||
                                e.target.closest('.stage-card-restart-btn') || e.target.closest('.stage-agent-badge') ||
                                e.target.closest('.canvas-tool-btn')) {
                                return;
                            }
                            isPanning = true;
                            hasMoved = false;
                            startX = e.touches[0].clientX;
                            startY = e.touches[0].clientY;
                            startScrollLeft = flow.scrollLeft;
                            startScrollTop = flow.scrollTop;
                            targetScrollLeft = startScrollLeft;
                            targetScrollTop = startScrollTop;
                        }
                    }, { passive: true });

                    flow.addEventListener('touchmove', function(e) {
                        if (!isPanning || e.touches.length !== 1) return;
                        var dx = e.touches[0].clientX - startX;
                        var dy = e.touches[0].clientY - startY;
                        if (!hasMoved && Math.hypot(dx, dy) > 3) {
                            hasMoved = true;
                            window._isGraphDragging = true;
                        }
                        if (hasMoved) {
                            targetScrollLeft = startScrollLeft - dx;
                            targetScrollTop = startScrollTop - dy;
                            if (!rafPending) {
                                rafPending = true;
                                requestAnimationFrame(applyPan);
                            }
                        }
                    }, { passive: true });

                    flow.addEventListener('touchend', function() {
                        if (!isPanning) return;
                        isPanning = false;
                        flow.classList.remove('is-panning');
                        if (hasMoved) {
                            flow.scrollLeft = targetScrollLeft;
                            flow.scrollTop = targetScrollTop;
                            setTimeout(function() {
                                window._isGraphDragging = false;
                            }, 80);
                        } else {
                            window._isGraphDragging = false;
                        }
                    });
                }

                function formatDuration(ms) {
                    if (!ms || ms <= 0) return "0s";
                    if (ms < 100) return ms + "ms";
                    if (ms < 1000) return (ms / 1000).toFixed(1) + "s";
                    var sec = Math.floor(ms / 1000);
                    if (sec < 60) return sec + "s";
                    var min = Math.floor(sec / 60);
                    sec = sec % 60;
                    if (min < 60) return min + "m " + sec + "s";
                    var hr = Math.floor(min / 60);
                    min = min % 60;
                    return hr + "h " + min + "m";
                }

                function formatStepDuration(ms) {
                    if (!ms || ms <= 0) return "0ms";
                    if (ms < 200) return ms + "ms";
                    if (ms < 1000) {
                        var s = (ms / 1000).toFixed(2);
                        if (s.endsWith('0')) s = (ms / 1000).toFixed(1);
                        return s + "s";
                    }
                    var totalSec = ms / 1000;
                    if (totalSec < 10) {
                        var s = totalSec.toFixed(2);
                        if (s.endsWith('.00')) return Math.round(totalSec) + "s";
                        if (s.endsWith('0')) return totalSec.toFixed(1) + "s";
                        if (totalSec.toFixed(1).endsWith('.0')) return Math.round(totalSec) + "s";
                        return s + "s";
                    }
                    var sec = Math.floor(ms / 1000);
                    if (sec < 60) return sec + "s";
                    var min = Math.floor(sec / 60);
                    sec = sec % 60;
                    if (min < 60) return min + "m" + (sec > 0 ? " " + sec + "s" : "");
                    var hr = Math.floor(min / 60);
                    min = min % 60;
                    return hr + "h" + (min > 0 ? " " + min + "m" : "");
                }

                function formatRelativeTime(startTimeMillis) {
                    if (!startTimeMillis || startTimeMillis <= 0) return "";
                    var now = Date.now();
                    var diffMs = Math.max(0, now - startTimeMillis);
                    var diffSec = Math.floor(diffMs / 1000);
                    if (diffSec < 60) return "Started just now";
                    var diffMin = Math.floor(diffSec / 60);
                    if (diffMin < 60) return "Started " + diffMin + "m ago";
                    var diffHr = Math.floor(diffMin / 60);
                    if (diffHr < 24) return "Started " + diffHr + "h ago";
                    var diffDays = Math.floor(diffHr / 24);
                    return "Started " + diffDays + "d ago";
                }

                function computeRunTimingBreakdown(data) {
                    totalPipelineDuration = data.duration || 0;
                    totalActiveStageTimeMs = 0;
                    totalOverheadDurationMs = 0;
                    totalStartupDelayMs = 0;

                    var firstStageStartTime = 0;
                    if (data.stages && data.stages.length > 0) {
                        for (var i = 0; i < data.stages.length; i++) {
                            var stg = data.stages[i];
                            if (!firstStageStartTime && stg.startTimeMillis > 0) {
                                firstStageStartTime = stg.startTimeMillis;
                            }
                            var isSkipped = (stg.status && stg.status.indexOf('SKIPPED') !== -1) || stg.status === 'NOT_EXECUTED' || stg.pauseDurationMillis === -1;
                            if (isSkipped) {
                                continue;
                            }
                            if (stg.children && stg.children.length > 0) {
                                var maxChild = 0;
                                for (var c = 0; c < stg.children.length; c++) {
                                    var childSkipped = (stg.children[c].status && stg.children[c].status.indexOf('SKIPPED') !== -1) || stg.children[c].status === 'NOT_EXECUTED' || stg.children[c].pauseDurationMillis === -1;
                                    if (childSkipped) continue;
                                    if (stg.children[c].durationMillis > maxChild) {
                                        maxChild = stg.children[c].durationMillis;
                                    }
                                }
                                totalActiveStageTimeMs += Math.max(stg.durationMillis || 0, maxChild);
                            } else {
                                totalActiveStageTimeMs += (stg.durationMillis || 0);
                            }
                        }
                    }

                    if (totalPipelineDuration === 0 && totalActiveStageTimeMs > 0) {
                        totalPipelineDuration = totalActiveStageTimeMs;
                    }

                    if (totalPipelineDuration > totalActiveStageTimeMs) {
                        totalOverheadDurationMs = totalPipelineDuration - totalActiveStageTimeMs;
                    }

                    if (data.timestamp > 0 && firstStageStartTime > data.timestamp) {
                        totalStartupDelayMs = firstStageStartTime - data.timestamp;
                    }
                }

                function invalidateRunningStepLogCache(data) {
                    if (!data || !data.stages) return;
                    for (var i = 0; i < data.stages.length; i++) {
                        var stg = data.stages[i];
                        var list = (stg.children && stg.children.length > 0) ? stg.children : [stg];
                        for (var c = 0; c < list.length; c++) {
                            var s = list[c];
                            if (s.steps) {
                                for (var k = 0; k < s.steps.length; k++) {
                                    var step = s.steps[k];
                                    var el = document.getElementById('step-item-' + step.id);
                                    var isExpanded = el && el.classList.contains('expanded');
                                    if (!isExpanded && (step.status === 'IN_PROGRESS' || step.status === 'PAUSED_INPUT')) {
                                        delete stepLogsCache[step.id];
                                        delete stepLogsOffset[step.id];
                                    }
                                }
                            }
                        }
                    }
                }

                var deferredTrendsPending = false;
                var deferredArtifactsPending = false;
                var deferredTestsPending = false;
                var deferredReplayPending = false;

                function applyStageTrendsToStages(stages, trendsInput) {
                    if (!stages || !trendsInput) return;
                    var byId = {};
                    var byName = {};
                    if (Array.isArray(trendsInput)) {
                        for (var t = 0; t < trendsInput.length; t++) {
                            var item = trendsInput[t];
                            if (item && item.stageId) byId[item.stageId] = item;
                            if (item && item.stageName) byName[item.stageName] = item;
                        }
                    } else {
                        byName = trendsInput;
                    }
                    function walk(list) {
                        for (var i = 0; i < list.length; i++) {
                            var st = list[i];
                            var trend = byId[st.id] || byName[st.name];
                            if (trend) {
                                st.avgDurationMillis = trend.avgDurationMillis;
                                st.variancePercent = trend.variancePercent;
                                st.formattedVariance = trend.formattedVariance;
                                st.isSpike = !!(trend.isSpike || trend.spike);
                                st.isFaster = !!(trend.isFaster || trend.faster);
                            }
                            if (st.children && st.children.length > 0) {
                                walk(st.children);
                            }
                        }
                    }
                    walk(stages);
                }

                function updateStageVarianceDomInPlace(stages) {
                    if (!stages) return;
                    for (var i = 0; i < stages.length; i++) {
                        var st = stages[i];
                        if (st.formattedVariance) {
                            var isSpike = !!(st.isSpike || st.spike);
                            var isFaster = !!(st.isFaster || st.faster);
                            var vClass = isSpike ? "spike" : (isFaster ? "faster" : "neutral");
                            var vIcon = isSpike ? ICON_TREND_UP : (isFaster ? ICON_TREND_DOWN : "");
                            var vTitle = isSpike
                                ? ("Duration Spike: " + st.formattedVariance + " vs avg " + formatDuration(st.avgDurationMillis))
                                : (isFaster
                                    ? ("Faster: " + st.formattedVariance.replace('-', '') + " vs avg " + formatDuration(st.avgDurationMillis))
                                    : ("Historical avg: " + formatDuration(st.avgDurationMillis)));
                            var pillHtml = '<span class="stage-variance-pill ' + vClass + '" title="' + vTitle.replace(/"/g, '&quot;') + '">' + vIcon + st.formattedVariance + '</span>';
                            var cardEl = document.getElementById('stage-card-' + st.id);
                            if (cardEl) {
                                var durVal = cardEl.querySelector('.stage-duration-val');
                                if (durVal && durVal.parentElement) {
                                    var existingPill = durVal.parentElement.querySelector('.stage-variance-pill');
                                    if (existingPill) existingPill.remove();
                                    durVal.insertAdjacentHTML('afterend', ' ' + pillHtml);
                                }
                                var compactRow = cardEl.querySelector('.stage-compact-metric-row');
                                if (compactRow) {
                                    var existingCompactPill = compactRow.querySelector('.stage-variance-pill');
                                    if (existingCompactPill) existingCompactPill.remove();
                                    compactRow.insertAdjacentHTML('beforeend', pillHtml);
                                }
                            }
                        }
                        if (st.children && st.children.length > 0) {
                            updateStageVarianceDomInPlace(st.children);
                        }
                    }
                    if (selectedStageId && graphData && graphData.stages) {
                        var selSt = findStage(graphData.stages, selectedStageId);
                        var varBadge = document.getElementById('stage-banner-variance-badge');
                        if (selSt && varBadge && selSt.formattedVariance) {
                            var bSpike = !!(selSt.isSpike || selSt.spike);
                            var bFaster = !!(selSt.isFaster || selSt.faster);
                            var avgFmt = formatDuration(selSt.avgDurationMillis);
                            var trendIcon = bSpike ? ICON_TREND_UP : (bFaster ? ICON_TREND_DOWN : '');
                            var title = bSpike
                                ? ('Duration Spiked by ' + selSt.formattedVariance + ' vs historical average (' + avgFmt + ')')
                                : (bFaster ? ('Finished ' + selSt.formattedVariance.replace('-', '') + ' faster than historical avg (' + avgFmt + ')') : ('Historical avg: ' + avgFmt));
                            varBadge.className = 'stage-banner-badge ' + (bSpike ? 'stage-badge-variance-spike' : (bFaster ? 'stage-badge-variance-faster' : 'stage-badge-variance-neutral'));
                            varBadge.innerHTML = trendIcon + (bSpike ? ('SPIKE ' + selSt.formattedVariance) : (bFaster ? (selSt.formattedVariance + ' FASTER') : ('VARIANCE ' + selSt.formattedVariance)));
                            varBadge.title = title;
                            varBadge.style.display = 'inline-flex';
                        }
                    }
                }

                function applyArtifactsToStages(stages, artifacts) {
                    if (!stages) return;
                    var countByStage = {};
                    if (artifacts && Array.isArray(artifacts)) {
                        for (var a = 0; a < artifacts.length; a++) {
                            var sid = artifacts[a].stageId;
                            if (sid) {
                                countByStage[sid] = (countByStage[sid] || 0) + 1;
                            }
                        }
                    }
                    function walk(list) {
                        for (var i = 0; i < list.length; i++) {
                            var s = list[i];
                            var c = countByStage[s.id] || 0;
                            if (c > 0) {
                                s.hasArtifacts = true;
                                s.artifactCount = c;
                            }
                            if (s.children && s.children.length > 0) {
                                walk(s.children);
                            }
                        }
                    }
                    walk(stages);
                }

                function loadDeferredTrends() {
                    if (deferredTrendsPending || !graphData || graphData.stageTrendsLoaded) return;
                    deferredTrendsPending = true;
                    fetch(horizonBaseUrl + 'apiDetails?section=trends')
                        .then(function(r) { return r.ok ? r.json() : null; })
                        .then(function(sec) {
                            deferredTrendsPending = false;
                            if (!sec || !graphData) return;
                            graphData.stageTrends = sec.stageTrends || {};
                            graphData.stageTrendsLoaded = true;
                            applyStageTrendsToStages(graphData.stages, graphData.stageTrends);
                            updateStageVarianceDomInPlace(graphData.stages);
                        })
                        .catch(function() {
                            deferredTrendsPending = false;
                        });
                }

                function loadDeferredArtifacts(forceRenderModal) {
                    if (!graphData) return Promise.resolve();
                    if (graphData.artifactsLoaded) {
                        if (forceRenderModal) {
                            renderArtifactStagePills();
                            filterArtifacts();
                        }
                        return Promise.resolve();
                    }
                    if (deferredArtifactsPending && window._horizonArtifactsPromise) {
                        return window._horizonArtifactsPromise;
                    }
                    deferredArtifactsPending = true;
                    window._horizonArtifactsPromise = fetch(horizonBaseUrl + 'apiDetails?section=artifacts')
                        .then(function(r) { return r.ok ? r.json() : null; })
                        .then(function(sec) {
                            deferredArtifactsPending = false;
                            if (!sec || !graphData) return;
                            graphData.artifacts = sec.artifacts || [];
                            graphData.artifactCount = sec.artifactCount || graphData.artifacts.length;
                            graphData.totalArtifactSize = sec.totalArtifactSize || sec.totalArtifactSizeBytes || 0;
                            graphData.formattedTotalArtifactSize = sec.formattedTotalArtifactSize || "0 B";
                            graphData.artifactsLoaded = true;
                            applyArtifactsToStages(graphData.stages, graphData.artifacts);

                            var artCount = graphData.artifactCount;
                            var artSize = graphData.formattedTotalArtifactSize;
                            var metaArt = document.getElementById('meta-artifacts');
                            if (metaArt) {
                                metaArt.innerText = artCount > 0 ? (artCount + " (" + artSize + ")") : "0 recorded";
                            }
                            var headerArtBadge = document.getElementById('header-artifacts-badge');
                            if (headerArtBadge) {
                                headerArtBadge.innerText = artCount;
                                headerArtBadge.style.display = artCount > 0 ? "inline-block" : "none";
                            }
                            var tabArtBadge = document.getElementById('tab-artifacts-badge');
                            if (tabArtBadge) {
                                tabArtBadge.innerText = artCount;
                            }
                            var statsText = document.getElementById('artifacts-stats-text');
                            if (statsText) {
                                statsText.innerText = artCount + " files (" + artSize + ")";
                            }
                            var zipBtn = document.getElementById('btn-download-all-zip');
                            if (zipBtn) {
                                zipBtn.style.display = artCount > 0 ? "inline-flex" : "none";
                            }
                            renderArtifactsList(graphData.artifacts);
                            var modal = document.getElementById('artifacts-modal');
                            if (forceRenderModal || (modal && modal.classList.contains('active'))) {
                                renderArtifactStagePills();
                                filterArtifacts();
                            }
                        })
                        .catch(function() {
                            deferredArtifactsPending = false;
                        });
                    return window._horizonArtifactsPromise;
                }

                function scheduleDeferredSectionsLoad(data) {
                    if (!data) return;
                    setTimeout(function() {
                        if (!data.stageTrendsLoaded) {
                            loadDeferredTrends();
                        }
                        if (!data.artifactsLoaded) {
                            loadDeferredArtifacts(false);
                        }
                    }, 20);
                }

                function fetchGraph() {
                    var initialPromise = window._horizonInitialCanvasPromise;
                    window._horizonInitialCanvasPromise = null;
                    var requestPromise = initialPromise
                        ? initialPromise.then(function(preloaded) {
                            if (preloaded) return preloaded;
                            return fetch(horizonBaseUrl + 'apiGraph?view=canvas').then(function(res) { return res.json(); });
                        })
                        : fetch(horizonBaseUrl + 'apiGraph?view=canvas').then(function(res) { return res.json(); });

                    requestPromise
                        .then(function(data) {
                            if (data.building) {
                                window._horizonWasBuilding = true;
                                invalidateRunningStepLogCache(data);
                            }
                            if (graphData && !data.building) {
                                if (!data.stageTrendsLoaded && graphData.stageTrendsLoaded && graphData.stageTrends) {
                                    data.stageTrends = graphData.stageTrends;
                                    data.stageTrendsLoaded = true;
                                    applyStageTrendsToStages(data.stages, data.stageTrends);
                                }
                                if (!data.artifactsLoaded && graphData.artifactsLoaded) {
                                    data.artifacts = graphData.artifacts || [];
                                    data.artifactCount = graphData.artifactCount || 0;
                                    data.totalArtifactSizeBytes = graphData.totalArtifactSizeBytes || 0;
                                    data.formattedTotalArtifactSize = graphData.formattedTotalArtifactSize || "0 B";
                                    data.artifactsLoaded = true;
                                    applyArtifactsToStages(data.stages, data.artifacts);
                                }
                                if (!data.testCasesLoaded && graphData.testCasesLoaded) {
                                    data.testCases = graphData.testCases || [];
                                    data.testCasesLoaded = true;
                                }
                                if (!data.replayScriptLoaded && graphData.replayScriptLoaded) {
                                    data.originalScript = graphData.originalScript;
                                    data.replayScriptLoaded = true;
                                }
                            }
                            graphData = data;
                            computeRunTimingBreakdown(data);
                            renderHeader(data);
                            renderGraph(data);
                            scheduleDeferredSectionsLoad(data);
                            if (data.building) {
                                var isHidden = (typeof document.hidden !== 'undefined' && document.hidden);
                                document.getElementById('refresh-indicator').innerText = isHidden
                                    ? "Paused (Tab Inactive)"
                                    : (data.pausedForInput ? "Paused (Awaiting Input)" : "Live (Refreshing)");
                                if (!isHidden) {
                                    if (!pollTimer) {
                                        pollTimer = setInterval(fetchGraph, 3000);
                                    }
                                    if (!stepLogPollTimer) {
                                        stepLogPollTimer = setInterval(pollActiveStepLogs, 1200);
                                    }
                                    pollActiveStepLogs();
                                } else {
                                    if (pollTimer) {
                                        clearInterval(pollTimer);
                                        pollTimer = null;
                                    }
                                    if (stepLogPollTimer) {
                                        clearInterval(stepLogPollTimer);
                                        stepLogPollTimer = null;
                                    }
                                }
                            } else {
                                document.getElementById('refresh-indicator').innerText = "Finished";
                                if (pollTimer) {
                                    clearInterval(pollTimer);
                                    pollTimer = null;
                                }
                                if (stepLogPollTimer) {
                                    clearInterval(stepLogPollTimer);
                                    stepLogPollTimer = null;
                                }
                                if (window._horizonWasBuilding) {
                                    // The build just finished: pull the tail end of any open step log.
                                    window._horizonWasBuilding = false;
                                    graphData.building = true;
                                    pollActiveStepLogs();
                                    graphData.building = false;
                                }
                            }
                        })
                        .catch(function(err) {
                            console.error("Failed to load graph:", err);
                        });
                }

                document.addEventListener('visibilitychange', function() {
                    if (document.hidden) {
                        if (pollTimer) {
                            clearInterval(pollTimer);
                            pollTimer = null;
                        }
                        if (stepLogPollTimer) {
                            clearInterval(stepLogPollTimer);
                            stepLogPollTimer = null;
                        }
                        var ind = document.getElementById('refresh-indicator');
                        if (ind && graphData && graphData.building) {
                            ind.innerText = "Paused (Tab Inactive)";
                        }
                    } else {
                        if (graphData && graphData.building) {
                            var ind = document.getElementById('refresh-indicator');
                            if (ind) {
                                ind.innerText = graphData.pausedForInput ? "Paused (Awaiting Input)" : "Live (Refreshing)";
                            }
                            fetchGraph();
                        }
                    }
                });

                function renderHeader(data) {
                    var resultStr = data.result || "IN_PROGRESS";
                    var isPausedInput = !!data.pausedForInput;
                    var isFailed = (resultStr === "FAILED" || resultStr === "FAILURE");
                    var isUnstable = (resultStr === "UNSTABLE");
                    var isAborted = (resultStr === "ABORTED");
                    var isInProgress = (resultStr === "IN_PROGRESS" || data.building);
                    var resultTheme = isPausedInput ? "paused_input" : (isFailed ? "failed" : (isUnstable ? "unstable" : (isAborted ? "aborted" : (isInProgress ? "in_progress" : "success"))));

                    // Apply dynamic theme gradient to horizon-header
                    var headerElem = document.querySelector('.horizon-header');
                    if (headerElem) {
                        headerElem.classList.remove('theme-success', 'theme-failed', 'theme-failure', 'theme-unstable', 'theme-in_progress', 'theme-aborted', 'theme-paused_input');
                        headerElem.classList.add('theme-' + resultTheme);
                    }

                    // Render run status circle icon (graph-view style)
                    var circleElem = document.getElementById('run-status-circle');
                    if (circleElem) {
                        circleElem.className = "run-status-circle circle-" + resultTheme;
                        var circleIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
                        if (isPausedInput) {
                            circleIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>';
                        } else if (isFailed) {
                            circleIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                        } else if (isUnstable) {
                            circleIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
                        } else if (isInProgress) {
                            circleIcon = '<svg class="horizon-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
                        } else if (isAborted) {
                            circleIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="7" y1="12" x2="17" y2="12"/></svg>';
                        }
                        circleElem.innerHTML = circleIcon;
                        circleElem.title = "Build Status: " + (isPausedInput ? "AWAITING INPUT" : resultStr);
                    }

                    document.getElementById('run-title').innerText = "Build #" + data.number;
                    var badge = document.getElementById('run-badge');
                    badge.innerText = isPausedInput ? "AWAITING INPUT" : resultStr;
                    badge.className = "horizon-badge badge-" + resultTheme;

                    var durEl = document.getElementById('meta-duration');
                    if (durEl) {
                        durEl.innerText = formatDuration(data.duration);
                    }
                    var breakdownEl = document.getElementById('meta-duration-breakdown');
                    if (breakdownEl) {
                        if (data.duration > 0 && totalActiveStageTimeMs > 0 && totalOverheadDurationMs >= 200) {
                            var stagesPct = Math.round((totalActiveStageTimeMs / data.duration) * 100);
                            var overheadPct = Math.max(0, 100 - stagesPct);
                            var startupPct = totalStartupDelayMs > 0 ? Math.round((totalStartupDelayMs / data.duration) * 100) : 0;

                            var stagesTip = "Active Stage Execution Time: " + formatDuration(totalActiveStageTimeMs) + " (" + stagesPct + "% of total build)";
                            var overheadTip = "Pipeline Setup & Orchestration Overhead: " + formatDuration(totalOverheadDurationMs) + " (" + overheadPct + "% of total build)";
                            if (totalStartupDelayMs >= 500) {
                                overheadTip += " \u2014 Startup & Agent Provisioning: " + formatDuration(totalStartupDelayMs) + " (" + startupPct + "%)";
                            }

                            if (durEl) {
                                durEl.title = "Total Build Duration: " + formatDuration(data.duration) + " \u2014 Stages: " + formatDuration(totalActiveStageTimeMs) + " (" + stagesPct + "%), Setup & Overhead: " + formatDuration(totalOverheadDurationMs) + " (" + overheadPct + "%)";
                            }

                            var bHtml = '<span class="meta-breakdown-chip active" title="' + stagesTip.replace(/"/g, '&quot;') + '">';
                            bHtml += '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; margin-right:3px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
                            bHtml += 'Stages: ' + formatDuration(totalActiveStageTimeMs) + ' (' + stagesPct + '%)</span>';

                            bHtml += '<span class="meta-breakdown-chip overhead" title="' + overheadTip.replace(/"/g, '&quot;') + '">';
                            bHtml += '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; margin-right:3px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
                            bHtml += 'Overhead: ' + formatDuration(totalOverheadDurationMs) + ' (' + overheadPct + '%)</span>';

                            breakdownEl.innerHTML = bHtml;
                            breakdownEl.style.display = 'flex';
                        } else {
                            breakdownEl.style.display = 'none';
                        }
                    }

                    var queueItem = document.getElementById('meta-queue-wrap');
                    var queueEl = document.getElementById('meta-queue-wait');
                    if (queueItem && queueEl) {
                        if (data.isWaitingForAgent) {
                            queueItem.style.display = 'flex';
                            var waitDesc = data.agentQueueReason || "Waiting for available agent executor...";
                            queueEl.innerHTML = '<span class="queue-waiting-text">' + (data.formattedQueueWait || 'In Queue') + '</span>';
                            queueItem.title = "Awaiting Agent Executor: " + waitDesc + " (Controller: " + (data.formattedControllerQueueWait || '0s') + ", Agent Wait: " + (data.formattedAgentAllocation || '0s') + ")";
                        } else if (data.queueWaitMillis && data.queueWaitMillis > 0) {
                            queueItem.style.display = 'flex';
                            var breakdown = "Total Scheduling Delay: " + (data.formattedQueueWait || '0s');
                            if (data.controllerQueueWaitMillis > 0) {
                                breakdown += " (Controller Queue: " + (data.formattedControllerQueueWait || '0s');
                                if (data.agentAllocationMillis > 0) {
                                    breakdown += " \u2022 Agent Provisioning: " + (data.formattedAgentAllocation || '0s');
                                }
                                breakdown += ")";
                            } else if (data.agentAllocationMillis > 0) {
                                breakdown += " (Agent Provisioning: " + (data.formattedAgentAllocation || '0s') + ")";
                            }
                            queueEl.innerText = data.formattedQueueWait;
                            queueItem.title = breakdown;
                        } else if (data.formattedQueueWait) {
                            queueItem.style.display = 'flex';
                            queueEl.innerText = data.formattedQueueWait;
                            queueItem.title = "Total Scheduling Delay: " + (data.formattedQueueWait || '0s');
                        } else {
                            queueItem.style.display = 'none';
                        }
                    }

                    var commitInline = document.getElementById('meta-commit-inline');
                    var commitItem = document.getElementById('meta-commit-item');
                    var commitEl = document.getElementById('meta-commit');
                    if (data.commitSha || data.branch) {
                        var commitHtml = '';
                        if (data.branch) {
                            var bSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; margin-right:4px;"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>';
                            var bTitle = 'Branch: ' + escapeHtml(data.branch);
                            if (data.branchUrl) {
                                commitHtml += '<a href="' + escapeHtml(data.branchUrl) + '" target="_blank" rel="noopener noreferrer" class="commit-branch-tag commit-branch-link" title="' + bTitle + ' (Open branch in SCM)">' + bSvg + escapeHtml(data.branch) + ' <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:0px; opacity:0.75; margin-left:3px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a> ';
                            } else {
                                commitHtml += '<span class="commit-branch-tag" title="' + bTitle + '">' + bSvg + escapeHtml(data.branch) + '</span> ';
                            }
                        }
                        if (data.commitSha) {
                            var shortSha = data.commitSha.length > 7 ? data.commitSha.substring(0, 7) : data.commitSha;
                            var tip = 'Commit: ' + data.commitSha;
                            if (data.commitAuthor) tip += ' by ' + data.commitAuthor;
                            if (data.commitMessage) tip += '\n' + data.commitMessage;
                            if (data.commitUrl) tip += '\n(Click to view commit in SCM)';
                            var shaCode = '<code class="commit-sha-code" title="' + escapeHtml(tip) + '">' + escapeHtml(shortSha) + '</code>';
                            if (data.commitUrl) {
                                commitHtml += '<a href="' + escapeHtml(data.commitUrl) + '" target="_blank" rel="noopener noreferrer" class="commit-sha-link" style="text-decoration:none;" title="' + escapeHtml(tip) + '">' + shaCode + ' <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:0px; opacity:0.7; color:#94a3b8; margin-left:2px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>';
                            } else {
                                commitHtml += shaCode;
                            }
                        }
                        if (data.commitAuthor) {
                            commitHtml += ' <span style="font-size:0.75rem; color:#94a3b8;" title="Commit author: ' + escapeHtml(data.commitAuthor) + '">(' + escapeHtml(data.commitAuthor) + ')</span>';
                        }
                        if (commitInline) {
                            commitInline.innerHTML = commitHtml;
                            commitInline.style.display = 'inline-flex';
                        }
                        if (commitEl) commitEl.innerHTML = commitHtml;
                        if (commitItem) commitItem.style.display = 'none';
                    } else {
                        if (commitInline) commitInline.style.display = 'none';
                        if (commitItem) commitItem.style.display = 'none';
                    }

                    var causeMetaEl = document.getElementById('meta-cause');
                    if (causeMetaEl) {
                        var causeHtml = '';
                        var userUrl = data.triggeredByUserUrl;
                        if (userUrl) {
                            if (userUrl.indexOf('/') === 0) {
                                userUrl = appRootUrl + userUrl.substring(1);
                            } else {
                                userUrl = appRootUrl + userUrl;
                            }
                        } else if (data.triggeredByUserId) {
                            userUrl = appRootUrl + 'user/' + encodeURIComponent(data.triggeredByUserId) + '/';
                        }

                        if (userUrl) {
                            var userDisplayName = escapeHtml(data.triggeredByUserName || data.triggeredByUserId);
                            var userTitle = "View Jenkins User Profile: " + (data.triggeredByUserName || data.triggeredByUserId) + (data.triggeredByUserId ? " (" + data.triggeredByUserId + ")" : "");
                            causeHtml = '<span class="trigger-label-prefix">Started by </span>' +
                                '<a href="' + escapeHtml(userUrl) + '" target="_blank" rel="noopener noreferrer" class="trigger-user-btn" title="' + escapeHtml(userTitle) + '" aria-label="' + escapeHtml(userTitle) + '">' +
                                    '<svg class="user-btn-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
                                        '<circle cx="12" cy="7" r="4"/>' +
                                    '</svg>' +
                                    '<span class="user-btn-name">' + userDisplayName + '</span>' +
                                    '<svg class="user-btn-ext" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                                        '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
                                        '<polyline points="15 3 21 3 21 9"/>' +
                                        '<line x1="10" y1="14" x2="21" y2="3"/>' +
                                    '</svg>' +
                                '</a>';
                        } else if (data.upstreamProject) {
                            var upUrl = data.upstreamUrl ? (data.upstreamUrl.indexOf('/') === 0 ? appRootUrl + data.upstreamUrl.substring(1) : appRootUrl + data.upstreamUrl) : (appRootUrl + 'job/' + encodeURIComponent(data.upstreamProject) + '/' + (data.upstreamBuild ? data.upstreamBuild + '/' : ''));
                            causeHtml = '<span class="trigger-label-prefix">Upstream </span>' +
                                '<a href="' + escapeHtml(upUrl) + '" target="_blank" rel="noopener noreferrer" class="trigger-upstream-btn" title="View upstream build">' +
                                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' +
                                    '<span>' + escapeHtml(data.upstreamProject) + (data.upstreamBuild ? ' #' + data.upstreamBuild : '') + '</span>' +
                                '</a>';
                        } else {
                            var rawCause = (data.causes && data.causes.length) ? data.causes[0] : "Direct trigger";
                            causeHtml = '<span class="trigger-text">' + escapeHtml(rawCause) + '</span>';
                        }

                        if (data.culprits && data.culprits.length > 0) {
                            causeHtml += ' <span class="trigger-culprits" style="font-size:0.75rem; color:#94a3b8;">(Culprits: ' +
                                data.culprits.map(function(c) {
                                    return '<a href="' + appRootUrl + 'user/' + encodeURIComponent(c) + '/" target="_blank" rel="noopener noreferrer" class="culprit-link" style="color:#60a5fa; text-decoration:underline;">' + escapeHtml(c) + '</a>';
                                }).join(', ') +
                            ')</span>';
                        }

                        causeMetaEl.innerHTML = causeHtml;
                    }
                    
                    var agentsContainer = document.getElementById('meta-agents');
                    if (agentsContainer) {
                        var rawAgents = (data.agentsUsed && data.agentsUsed.length) ? data.agentsUsed : [];
                        if (rawAgents.length > 0) {
                            var MAX_VISIBLE_AGENTS = 4;
                            var visibleAgents = rawAgents.slice(0, MAX_VISIBLE_AGENTS);
                            var overflowCount = rawAgents.length - visibleAgents.length;
                            var htmlParts = visibleAgents.map(function(ag) {
                                var esc = ag.replace(/'/g, "\\'");
                                var displayAg = escapeHtml(ag);
                                return '<span class="agent-chip" title="Agent: ' + displayAg + ' \u2014 Click for agent details" onclick="event.stopPropagation(); openAgentModal(null, \'' + esc + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openAgentModal(null, \'' + esc + '\');}" role="button" tabindex="0">' + ICON_SERVER + '<span class="agent-chip-name">' + displayAg + '</span></span>';
                            });

                            if (overflowCount > 0) {
                                var overflowList = rawAgents.slice(MAX_VISIBLE_AGENTS);
                                var overflowNames = overflowList.map(function(a) { return escapeHtml(a); }).join(', ');
                                var moreTitle = '+' + overflowCount + ' more agent' + (overflowCount === 1 ? '' : 's') + ' (' + overflowNames + ') \u2014 Click to view all in modal';
                                htmlParts.push('<span class="agent-chip-more" title="' + moreTitle + '" onclick="event.stopPropagation(); openAgentModal(null, \'ALL\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openAgentModal(null, \'ALL\');}" role="button" tabindex="0">+' + overflowCount + ' more</span>');
                            }

                            agentsContainer.innerHTML = htmlParts.join(' ');
                        } else {
                            agentsContainer.innerHTML = '<span class="agent-chip" title="Agent: Built-In Node \u2014 Click for agent details" onclick="event.stopPropagation(); openAgentModal(null, \'Built-In Node\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openAgentModal(null, \'Built-In Node\');}" role="button" tabindex="0">' + ICON_SERVER + '<span class="agent-chip-name">Built-In Node</span></span>';
                        }
                    }

                    var paramsMetaEl = document.getElementById('meta-params');
                    var paramsMenuItem = document.getElementById('menu-item-params');
                    var paramsList = (data.buildParameters && data.buildParameters.length > 0)
                        ? data.buildParameters
                        : (data.parameters ? Object.keys(data.parameters).map(function(k) { return { name: k, value: data.parameters[k], type: 'String', sensitive: false, description: '' }; }) : []);

                    if (paramsMetaEl) {
                        if (paramsList.length > 0) {
                            var pCount = paramsList.length;
                            var pNames = paramsList.map(function(p){ return p.name; }).slice(0, 3).join(', ') + (paramsList.length > 3 ? '...' : '');
                            var pTitle = pCount + ' parameter' + (pCount === 1 ? '' : 's') + ' (' + pNames + ') \u2014 Click to inspect in modal';
                            paramsMetaEl.innerHTML = '<span class="param-chip" title="' + escapeHtml(pTitle) + '" onclick="event.stopPropagation(); openParametersModal()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openParametersModal();}" role="button" tabindex="0">' +
                                ICON_SLIDERS +
                                '<span class="param-chip-name">' + pCount + (pCount === 1 ? ' Parameter' : ' Parameters') + '</span>' +
                            '</span>';
                        } else {
                            paramsMetaEl.innerHTML = '<span class="param-none" title="No parameters were provided for this build">None</span>';
                        }
                    }
                    var paramsMetaItem = document.getElementById('meta-params-item');
                    if (paramsMetaItem) {
                        paramsMetaItem.classList.toggle('meta-item-muted', paramsList.length === 0);
                    }

                    if (paramsMenuItem) {
                        if (paramsList.length > 0) {
                            paramsMenuItem.style.display = 'flex';
                            hasAnyAction = true;
                            var descEl = document.getElementById('menu-item-params-desc');
                            if (descEl) {
                                descEl.innerText = paramsList.length + ' parameter' + (paramsList.length === 1 ? '' : 's') + ' configured for this run';
                            }
                        } else {
                            paramsMenuItem.style.display = 'none';
                        }
                    }

                    var testsMetaEl = document.getElementById('meta-tests');
                    if (testsMetaEl) {
                        if (data.totalTests > 0) {
                            var pass = data.totalTests - data.failedTests - data.skippedTests;
                            var failBadge = data.failedTests > 0
                                ? (' <span style="color:#ef4444; font-weight:700;">(' + data.failedTests + ' Failed)</span>')
                                : (' <span style="color:#10b981; font-weight:600;">(All Passed)</span>');
                            testsMetaEl.innerHTML = pass + "/" + data.totalTests + " Passed" + failBadge;
                        } else {
                            testsMetaEl.innerText = "No tests recorded";
                        }
                    }
                    var testsMetaItem = document.getElementById('meta-tests-item');
                    if (testsMetaItem) {
                        testsMetaItem.classList.toggle('meta-item-muted', !(data.totalTests > 0));
                    }

                    var prevBtn = document.getElementById('btn-prev');
                    var nextBtn = document.getElementById('btn-next');
                    var navGroup = document.getElementById('run-nav-group');
                    if (prevBtn) {
                        if (data.previousBuildNumber) {
                            prevBtn.removeAttribute("disabled");
                            prevBtn.setAttribute("data-target", jobBaseUrl + data.previousBuildNumber + "/horizon/");
                            prevBtn.title = "Go to Build #" + data.previousBuildNumber;
                        } else {
                            prevBtn.setAttribute("disabled", "true");
                            prevBtn.removeAttribute("data-target");
                            prevBtn.title = "No previous build";
                        }
                    }
                    if (nextBtn) {
                        if (data.nextBuildNumber) {
                            nextBtn.removeAttribute("disabled");
                            nextBtn.setAttribute("data-target", jobBaseUrl + data.nextBuildNumber + "/horizon/");
                            nextBtn.title = "Go to Build #" + data.nextBuildNumber;
                        } else {
                            nextBtn.setAttribute("disabled", "true");
                            nextBtn.removeAttribute("data-target");
                            nextBtn.title = "No newer build";
                        }
                    }
                    if (navGroup) {
                        navGroup.style.display = (data.previousBuildNumber || data.nextBuildNumber) ? "inline-flex" : "none";
                    }

                    // Action Hub: Abort, Rebuild, Replay, Restart from Stage in Consolidated Dropdown
                    var hasAnyAction = false;

                    var abortBtn = document.getElementById('btn-abort-run');
                    if (abortBtn) {
                        abortBtn.style.display = (data.building && data.abortEnabled) ? "inline-flex" : "none";
                    }
                    var abortMenuItem = document.getElementById('menu-item-abort');
                    if (abortMenuItem) {
                        abortMenuItem.style.display = (data.building && data.abortEnabled) ? "flex" : "none";
                        if (data.building && data.abortEnabled) hasAnyAction = true;
                    }

                    var rebuildItem = document.getElementById('menu-item-rebuild');
                    if (rebuildItem) {
                        rebuildItem.style.display = data.rebuildEnabled ? "flex" : "none";
                        if (data.rebuildEnabled) hasAnyAction = true;
                    }

                    var replayItem = document.getElementById('menu-item-replay');
                    if (replayItem) {
                        replayItem.style.display = data.replayEnabled ? "flex" : "none";
                        if (data.replayEnabled) hasAnyAction = true;
                    }

                    if (data.restartEnabled && data.restartableStages && data.restartableStages.length > 0) {
                        hasAnyAction = true;
                    }
                    renderPipelineActionsRestartList();

                    var actionsWrap = document.getElementById('pipeline-actions-dropdown-wrap');
                    if (actionsWrap) {
                        actionsWrap.style.display = hasAnyAction ? "inline-block" : "none";
                    }

                    // Archived Artifacts
                    var artCount = data.artifactCount || (data.artifacts ? data.artifacts.length : 0);
                    var artSize = data.formattedTotalArtifactSize || "0 B";
                    var metaArt = document.getElementById('meta-artifacts');
                    if (metaArt) {
                        metaArt.innerText = artCount > 0 ? (artCount + " (" + artSize + ")") : "0 recorded";
                    }
                    var metaArtItem = document.getElementById('meta-artifacts-item');
                    if (metaArtItem) {
                        metaArtItem.classList.toggle('meta-item-muted', !(artCount > 0));
                    }
                    var headerArtBadge = document.getElementById('header-artifacts-badge');
                    if (headerArtBadge) {
                        headerArtBadge.innerText = artCount;
                        headerArtBadge.style.display = artCount > 0 ? "inline-block" : "none";
                    }
                    var tabArtBadge = document.getElementById('tab-artifacts-badge');
                    if (tabArtBadge) {
                        tabArtBadge.innerText = artCount;
                    }
                    var statsText = document.getElementById('artifacts-stats-text');
                    if (statsText) {
                        statsText.innerText = artCount + " files (" + artSize + ")";
                    }
                    var zipBtn = document.getElementById('btn-download-all-zip');
                    if (zipBtn) {
                        zipBtn.style.display = artCount > 0 ? "inline-flex" : "none";
                    }
                    renderArtifactsList(data.artifacts);
                    renderPendingInputBanner(data);
                    renderRootCauseBanner(data);
                }

                /* Root-Cause Failure Banner and Multi-Failure Handler */
                var currentFailures = [];
                var activeFailureIndex = 0;

                function collectPipelineFailures(stages) {
                    var failures = [];
                    if (!stages || !Array.isArray(stages)) return failures;

                    function walk(stageList, parent) {
                        for (var i = 0; i < stageList.length; i++) {
                            var st = stageList[i];
                            var stStatus = (st.status || '').toUpperCase();
                            var isFailed = (stStatus === 'FAILED' || stStatus === 'FAILURE');
                            var isUnstable = (stStatus === 'UNSTABLE');

                            // Recurse into children (parallel branches)
                            if (st.children && st.children.length > 0) {
                                walk(st.children, st);
                            }

                            if (isFailed || isUnstable) {
                                // Prefer leaf failing/unstable step over enclosing closure blocks
                                var targetStatuses = isFailed ? ['FAILED', 'FAILURE'] : ['UNSTABLE'];
                                var failedStep = pickLeafStepByStatus(st.steps, targetStatuses);
                                var fallbackStepWithError = null;
                                if (st.steps && st.steps.length > 0) {
                                    for (var s = 0; s < st.steps.length; s++) {
                                        var stepObj = st.steps[s];
                                        var stepStatus = (stepObj.status || '').toUpperCase();
                                        if (targetStatuses.indexOf(stepStatus) !== -1 && stepObj.error && !fallbackStepWithError) {
                                            fallbackStepWithError = stepObj;
                                        }
                                    }
                                }

                                var errorMsg = (failedStep && failedStep.error) ? failedStep.error : ((fallbackStepWithError && fallbackStepWithError.error) ? fallbackStepWithError.error : (st.error || ''));
                                if (!errorMsg && failedStep && failedStep.arguments) {
                                    errorMsg = failedStep.arguments;
                                }

                                var isParallel = !!(st.isParallelBranch || st.parallelBranch || (parent && (parent.isParallelBranch || parent.parallelBranch || parent.name)));

                                // Check if child branch already reported this failure
                                var childReported = false;
                                if (st.children && st.children.length > 0) {
                                    for (var c = 0; c < failures.length; c++) {
                                        if (failures[c].parentStageId === st.id) {
                                            childReported = true;
                                            break;
                                        }
                                    }
                                }

                                if (!childReported) {
                                    failures.push({
                                        stageId: st.id,
                                        stageName: st.name,
                                        parentStageId: parent ? parent.id : null,
                                        parentStageName: parent ? parent.name : null,
                                        isParallel: isParallel,
                                        branchName: st.branchName || (isParallel ? st.name : ''),
                                        status: isFailed ? 'FAILED' : 'UNSTABLE',
                                        stepId: failedStep ? failedStep.id : null,
                                        stepName: failedStep ? (failedStep.displayName || failedStep.name) : null,
                                        stepArgs: failedStep ? failedStep.arguments : null,
                                        error: errorMsg
                                    });
                                }
                            }
                        }
                    }

                    walk(stages, null);
                    failures.forEach(function(item, idx) { item._orderIdx = idx; });
                    failures.sort(function(a, b) {
                        var aRank = (a.status === 'FAILED') ? 0 : 1;
                        var bRank = (b.status === 'FAILED') ? 0 : 1;
                        if (aRank !== bRank) return aRank - bRank;
                        return a._orderIdx - b._orderIdx;
                    });
                    return failures;
                }

                function renderRootCauseBanner(data) {
                    var banner = document.getElementById('root-cause-banner');
                    if (!banner) return;

                    var runResult = (data.result || '').toUpperCase();
                    var isFailed = (runResult === 'FAILED' || runResult === 'FAILURE');
                    var isUnstable = (runResult === 'UNSTABLE');

                    currentFailures = collectPipelineFailures(data.stages);

                    // If build is not failed/unstable and has no failed stages, hide banner
                    if (!isFailed && !isUnstable && currentFailures.length === 0) {
                        banner.style.display = 'none';
                        return;
                    }

                    // Reset index if out of bounds
                    if (activeFailureIndex >= currentFailures.length) {
                        activeFailureIndex = 0;
                    }

                    // Style banner according to severity
                    var hasHardFailure = currentFailures.some(function(f) { return f.status === 'FAILED'; }) || isFailed;
                    if (hasHardFailure) {
                        banner.className = 'root-cause-banner';
                    } else {
                        banner.className = 'root-cause-banner banner-unstable';
                    }

                    banner.style.display = 'block';
                    renderRootCauseBannerContent();
                }

                function renderRootCauseBannerContent() {
                    var container = document.getElementById('root-cause-content');
                    if (!container) return;

                    if (currentFailures.length === 0) {
                        // General failure with no specific stage found
                        container.innerHTML = 
                            '<div class="root-cause-header">' +
                                '<div class="root-cause-headline-wrap">' +
                                    '<span class="root-cause-icon-badge" aria-hidden="true">' +
                                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                                    '</span>' +
                                    '<div>' +
                                        '<h3 class="root-cause-title">' +
                                            '<span class="root-cause-badge">FAILED</span>' +
                                            '<span>Pipeline Execution Terminated Unexpectedly</span>' +
                                        '</h3>' +
                                    '</div>' +
                                '</div>' +
                                '<a href="' + runBaseUrl + 'console" target="_blank" class="root-cause-jump-btn" title="Open Jenkins raw console log">' +
                                    '<span>View Raw Console Log</span>' +
                                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
                                '</a>' +
                            '</div>';
                        return;
                    }

                    var f = currentFailures[activeFailureIndex];
                    var isFailed = (f.status === 'FAILED');
                    var badgeLabel = isFailed ? 'FAILED' : 'UNSTABLE';
                    var iconSvg = isFailed
                        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
                        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

                    var html = '';
                    html += '<div class="root-cause-header">';
                    html += '<div class="root-cause-headline-wrap">';
                    html += '<span class="root-cause-icon-badge" aria-hidden="true">' + iconSvg + '</span>';
                    html += '<div>';
                    html += '<h3 class="root-cause-title">';
                    html += '<span class="root-cause-badge">' + badgeLabel + '</span>';

                    if (currentFailures.length > 1) {
                        var hardFailCount = 0;
                        var unstableWarnCount = 0;
                        for (var fc = 0; fc < currentFailures.length; fc++) {
                            if (currentFailures[fc].status === 'FAILED') hardFailCount++;
                            else unstableWarnCount++;
                        }
                        if (hardFailCount > 0 && unstableWarnCount > 0) {
                            html += '<span>' + hardFailCount + (hardFailCount === 1 ? ' Failure' : ' Failures') + ' &amp; ' + unstableWarnCount + (unstableWarnCount === 1 ? ' Unstable Stage' : ' Unstable Stages') + ' Detected</span>';
                        } else if (hardFailCount === 0 && unstableWarnCount > 1) {
                            html += '<span>' + unstableWarnCount + ' Unstable Stages Detected Across Execution</span>';
                        } else {
                            html += '<span>' + currentFailures.length + ' Failures Detected Across Execution</span>';
                        }
                    } else {
                        html += '<span>' + (isFailed ? 'Failure' : 'Unstable Warning') + ' in Stage: <strong>' + escapeHtml(f.stageName) + '</strong></span>';
                    }

                    if (f.isParallel && f.parentStageName) {
                        html += '<span class="root-cause-parallel-tag" title="Parallel Branch inside ' + escapeHtml(f.parentStageName) + '">Parallel: ' + escapeHtml(f.parentStageName) + ' \u2192 ' + escapeHtml(f.branchName || f.stageName) + '</span>';
                    }
                    html += '</h3>';
                    html += '</div>';
                    html += '</div>';

                    // Teleport jump button
                    html += '<button type="button" class="root-cause-jump-btn" onclick="jumpToFailure(\'' + escapeHtml(f.stageId) + '\', ' + (f.stepId ? ('\'' + escapeHtml(f.stepId) + '\'') : 'null') + ')" title="Jump directly to this stage and its failing log output">';
                    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
                    html += '<span>Jump to Failure Log</span>';
                    html += '</button>';
                    html += '</div>';

                    // If multiple failures detected, render selector chips
                    if (currentFailures.length > 1) {
                        html += '<div class="root-cause-multi-selector" role="tablist" aria-label="Parallel and multi-failure selector">';
                        for (var i = 0; i < currentFailures.length; i++) {
                            var item = currentFailures[i];
                            var activeClass = (i === activeFailureIndex) ? ' active' : '';
                            var chipLabel = (item.isParallel && item.parentStageName)
                                ? (item.branchName || item.stageName) + ' (' + item.parentStageName + ')'
                                : item.stageName;
                            var chipIcon = (item.status === 'FAILED')
                                ? '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> '
                                : '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ';

                            html += '<button type="button" role="tab" aria-selected="' + (i === activeFailureIndex ? 'true' : 'false') + '" class="multi-fail-chip' + activeClass + '" onclick="selectFailureIndex(' + i + ')" title="View failure ' + (i + 1) + ' in ' + escapeHtml(item.stageName) + '">';
                            html += chipIcon + escapeHtml(chipLabel);
                            html += '</button>';
                        }
                        html += '</div>';
                    }

                    // Failure Details Row
                    html += '<div class="root-cause-details-row">';
                    html += '<div style="display:flex; flex-direction:column; gap:0.35rem; width:100%; min-width:0;">';
                    var cleanBannerArg = f.stepArgs ? formatCleanStepArgsPreview(f.stepArgs, 92) : '';
                    var stepContext = f.stepName
                        ? ('Failing Step: ' + escapeHtml(f.stepName) + (cleanBannerArg ? (' <code class="root-cause-step-arg-pill" title="' + escapeHtml(f.stepArgs) + '">' + escapeHtml(cleanBannerArg) + '</code>') : ''))
                        : ('Stage: ' + escapeHtml(f.stageName));
                    html += '<div style="font-weight:700; line-height:1.45; word-break:break-word; display:flex; align-items:center; flex-wrap:wrap; gap:0.25rem;">' + stepContext + '</div>';

                    if (f.error) {
                        var cleanErr = (f.error === f.stepArgs && cleanBannerArg) ? cleanBannerArg : f.error;
                        html += '<div style="opacity:0.95; line-height:1.45; word-break:break-word;"><strong>Error:</strong> ' + escapeHtml(cleanErr) + '</div>';
                    }
                    html += '</div>';
                    html += '</div>';

                    container.innerHTML = html;
                }

                function selectFailureIndex(index) {
                    if (index >= 0 && index < currentFailures.length) {
                        activeFailureIndex = index;
                        renderRootCauseBannerContent();
                        var item = currentFailures[index];
                        if (item && item.stageId) {
                            selectStage(item.stageId, false, item.stepId);
                            setTimeout(function() {
                                scrollStageIntoPipelineView(item.stageId, true);
                            }, 50);
                        }
                    }
                }

                function jumpToFailure(stageId, stepId) {
                    if (!stageId) return;

                    // 1. Select the stage, which updates URL hash, stage card highlight, and loads steps
                    selectStage(stageId, false, stepId);

                    // 2. Scroll the stage card smoothly into view in the canvas flow
                    setTimeout(function() {
                        scrollStageIntoPipelineView(stageId, true);
                    }, 50);

                    // 3. Scroll to the failing step accordion row and trigger attention pulse
                    setTimeout(function() {
                        var targetEl = (stepId ? document.getElementById('step-row-' + stepId) : null) || document.getElementById('step-accordion-container');
                        if (targetEl) {
                            scrollWindowToElement(targetEl, 'center');
                            targetEl.classList.add('step-highlight-pulse');
                            setTimeout(function() {
                                targetEl.classList.remove('step-highlight-pulse');
                            }, 2400);
                        }
                    }, 260);
                }

                /* Artifacts & Drawer Tabs Navigation */
                var currentArtifacts = [];
                var currentArtifactFilterStage = null;
                var artifactViewMode = localStorage.getItem('horizon_artifact_view_mode') || 'tree';
                var folderExpandedState = {};

                function setArtifactViewMode(mode) {
                    artifactViewMode = mode;
                    localStorage.setItem('horizon_artifact_view_mode', mode);
                    var btnTree = document.getElementById('btn-view-tree');
                    var btnFlat = document.getElementById('btn-view-flat');
                    var btnExpAll = document.getElementById('btn-tree-expand-all');
                    var btnColAll = document.getElementById('btn-tree-collapse-all');
                    if (btnTree && btnFlat) {
                        if (mode === 'tree') {
                            btnTree.classList.add('active');
                            btnFlat.classList.remove('active');
                            if (btnExpAll) btnExpAll.style.display = 'inline-flex';
                            if (btnColAll) btnColAll.style.display = 'inline-flex';
                        } else {
                            btnFlat.classList.add('active');
                            btnTree.classList.remove('active');
                            if (btnExpAll) btnExpAll.style.display = 'none';
                            if (btnColAll) btnColAll.style.display = 'none';
                        }
                    }
                    filterArtifacts();
                }

                function openArtifactsModal(stageId) {
                    currentArtifactFilterStage = stageId || null;
                    var modal = document.getElementById('artifacts-modal');
                    var subtitle = document.getElementById('artifacts-modal-subtitle');
                    if (stageId && graphData) {
                        var st = findStage(graphData.stages, stageId);
                        if (subtitle) subtitle.innerText = "Filtered to stage: " + (st ? st.name : stageId);
                    } else if (subtitle) {
                        subtitle.innerText = "All run artifacts";
                    }
                    renderArtifactStagePills();
                    filterArtifacts();
                    if (modal) modal.classList.add('active');
                    if (graphData && !graphData.artifactsLoaded) {
                        loadDeferredArtifacts(true);
                    }
                }

                function closeArtifactsModal() {
                    var modal = document.getElementById('artifacts-modal');
                    if (modal) modal.classList.remove('active');
                }

                function filterArtifactsByStage(stageId) {
                    currentArtifactFilterStage = stageId || null;
                    var subtitle = document.getElementById('artifacts-modal-subtitle');
                    if (stageId && graphData) {
                        var st = findStage(graphData.stages, stageId);
                        if (subtitle) subtitle.innerText = "Filtered to stage: " + (st ? st.name : stageId);
                    } else if (subtitle) {
                        subtitle.innerText = "All run artifacts";
                    }
                    renderArtifactStagePills();
                    filterArtifacts();
                }

                function openAllArtifacts() {
                    openArtifactsModal(null);
                }

                function renderArtifactStagePills() {
                    var container = document.getElementById('artifacts-stage-pills');
                    if (!container) return;
                    if (!graphData) {
                        container.innerHTML = '';
                        return;
                    }

                    var allArtifacts = graphData.artifacts || [];
                    var archiverStages = [];

                    function inspectStages(stages) {
                        if (!stages) return;
                        for (var i = 0; i < stages.length; i++) {
                            var s = stages[i];
                            if (s.hasArtifacts && s.artifactCount > 0) {
                                archiverStages.push(s);
                            }
                            if (s.children && s.children.length > 0) {
                                inspectStages(s.children);
                            }
                        }
                    }
                    inspectStages(graphData.stages);

                    if (allArtifacts.length === 0) {
                        container.style.display = 'none';
                        return;
                    }
                    container.style.display = 'flex';

                    var html = '';
                    var allActive = (currentArtifactFilterStage === null) ? ' active' : '';
                    html += '<button class="stage-filter-pill' + allActive + '" onclick="filterArtifactsByStage(null)" aria-label="View all artifacts">';
                    html += '<span>All Run Artifacts</span><span class="pill-count">' + allArtifacts.length + '</span></button>';

                    for (var j = 0; j < archiverStages.length; j++) {
                        var st = archiverStages[j];
                        var isActive = (currentArtifactFilterStage === st.id) ? ' active' : '';
                        var escapedId = (st.id || '').replace(/'/g, "\\'");
                        html += '<button class="stage-filter-pill' + isActive + '" onclick="filterArtifactsByStage(\'' + escapedId + '\')" title="Filter artifacts from ' + st.name + '">';
                        html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> ';
                        html += '<span>' + st.name + '</span><span class="pill-count">' + st.artifactCount + '</span></button>';
                    }

                    container.innerHTML = html;
                }

                function switchDrawerTab(tabName) {
                    if (tabName === 'artifacts') {
                        openArtifactsModal(selectedStageId);
                    }
                }

                function getFileIcon(name) {
                    var lower = (name || '').toLowerCase();
                    if (lower.endsWith('.zip') || lower.endsWith('.tar') || lower.endsWith('.tar.gz') || lower.endsWith('.tgz') || lower.endsWith('.gz') || lower.endsWith('.jar') || lower.endsWith('.war') || lower.endsWith('.hpi')) {
                        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>';
                    }
                    if (lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.xml') || lower.endsWith('.js') || lower.endsWith('.html') || lower.endsWith('.css')) {
                        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
                    }
                    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.gif') || lower.endsWith('.webp')) {
                        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                    }
                    if (lower.endsWith('.txt') || lower.endsWith('.log') || lower.endsWith('.md') || lower.endsWith('.sha256') || lower.endsWith('.md5') || lower.endsWith('.info')) {
                        return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
                    }
                    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
                }

                function isPreviewable(name) {
                    var lower = (name || '').toLowerCase();
                    return lower.endsWith('.txt') || lower.endsWith('.log') || lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.xml') || lower.endsWith('.md') || lower.endsWith('.sha256') || lower.endsWith('.info') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.gif') || lower.endsWith('.webp');
                }

                function isImageFile(name) {
                    var lower = (name || '').toLowerCase();
                    return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.gif') || lower.endsWith('.webp');
                }

                function renderArtifactsList(artifacts) {
                    currentArtifacts = artifacts || (graphData && graphData.artifacts) || [];
                    renderArtifactStagePills();
                    filterArtifacts();
                }

                function filterArtifacts() {
                    var treeContainer = document.getElementById('artifacts-tree-view');
                    var gridContainer = document.getElementById('artifacts-grid');
                    if (!treeContainer || !gridContainer) return;

                    var all = (graphData && graphData.artifacts) ? graphData.artifacts : [];
                    var activeList = all;
                    if (currentArtifactFilterStage !== null) {
                        activeList = all.filter(function(a) {
                            return a.stageId === currentArtifactFilterStage;
                        });
                    }

                    var searchInput = document.getElementById('artifacts-search-input');
                    var query = (searchInput ? searchInput.value : '').trim().toLowerCase();

                    var statsText = document.getElementById('artifacts-stats-text');
                    if (statsText) {
                        var filteredTotal = activeList.length;
                        statsText.innerText = filteredTotal + " files" + (currentArtifactFilterStage ? " in selected stage" : "");
                    }

                    if (artifactViewMode === 'tree') {
                        treeContainer.style.display = 'block';
                        gridContainer.style.display = 'none';
                        renderArtifactsTree(activeList, query);
                    } else {
                        treeContainer.style.display = 'none';
                        gridContainer.style.display = 'grid';
                        renderArtifactsFlat(activeList, query);
                    }
                }

                function buildArtifactTree(artifacts) {
                    var root = { name: "root", fullPath: "", isFolder: true, children: {}, fileCount: 0 };
                    for (var i = 0; i < artifacts.length; i++) {
                        var art = artifacts[i];
                        var path = (art.relativePath || art.name || '').replace(/\\/g, '/');
                        var parts = path.split('/').filter(function(p) { return p.length > 0; });
                        if (parts.length === 0) continue;

                        var curr = root;
                        curr.fileCount++;
                        for (var p = 0; p < parts.length - 1; p++) {
                            var folderName = parts[p];
                            if (!curr.children[folderName]) {
                                curr.children[folderName] = {
                                    name: folderName,
                                    fullPath: (curr.fullPath ? curr.fullPath + '/' : '') + folderName,
                                    isFolder: true,
                                    children: {},
                                    fileCount: 0
                                };
                            }
                            curr = curr.children[folderName];
                            curr.fileCount++;
                        }
                        var fileName = parts[parts.length - 1];
                        curr.children[fileName] = {
                            name: fileName,
                            fullPath: path,
                            isFolder: false,
                            artifact: art,
                            fileCount: 1
                        };
                    }
                    return root;
                }

                function renderArtifactsTree(artifacts, query) {
                    var container = document.getElementById('artifacts-tree-view');
                    if (!container) return;

                    if (artifacts.length === 0) {
                        container.innerHTML = '<div class="artifact-empty-card">' +
                            '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.75rem;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' +
                            '<div style="font-size:0.95rem; font-weight:600; color:#475569; margin-bottom:0.35rem;">No Archived Artifacts Found</div>' +
                            '<div style="font-size:0.8rem; color:#94a3b8; max-width:420px; margin:0 auto 1rem;">No archived files recorded for this stage or filter.</div>' +
                            '</div>';
                        return;
                    }

                    var treeRoot = buildArtifactTree(artifacts);

                    function matchesQuery(node) {
                        if (!query) return true;
                        if (!node.isFolder) {
                            return (node.name || '').toLowerCase().indexOf(query) !== -1 || (node.fullPath || '').toLowerCase().indexOf(query) !== -1;
                        }
                        if ((node.name || '').toLowerCase().indexOf(query) !== -1) return true;
                        var keys = Object.keys(node.children);
                        for (var k = 0; k < keys.length; k++) {
                            if (matchesQuery(node.children[keys[k]])) return true;
                        }
                        return false;
                    }

                    function renderNode(node, level) {
                        if (!matchesQuery(node)) return '';
                        var html = '';
                        var keys = Object.keys(node.children);
                        keys.sort(function(a, b) {
                            var itemA = node.children[a];
                            var itemB = node.children[b];
                            if (itemA.isFolder !== itemB.isFolder) {
                                return itemA.isFolder ? -1 : 1;
                            }
                            return a.localeCompare(b);
                        });

                        for (var i = 0; i < keys.length; i++) {
                            var child = node.children[keys[i]];
                            if (!matchesQuery(child)) continue;

                            if (child.isFolder) {
                                var folderKey = child.fullPath;
                                var isExpanded = (query && query.length > 0) || (folderExpandedState[folderKey] !== false);
                                var chevronClass = isExpanded ? 'tree-chevron expanded' : 'tree-chevron';
                                var childrenClass = isExpanded ? 'tree-children' : 'tree-children collapsed';
                                var folderClass = isExpanded ? 'tree-node tree-folder open' : 'tree-node tree-folder';
                                var safeFolderId = child.fullPath.replace(/[^a-zA-Z0-9_-]/g, '_');
                                var escapedPath = folderKey.replace(/'/g, "\\'");
                                var padLeft = (level * 18 + 12) + 'px';

                                html += '<div class="' + folderClass + '" id="folder-node-' + safeFolderId + '" data-path="' + child.fullPath + '">';
                                html += '<div class="tree-node-row" onclick="toggleFolder(\'' + escapedPath + '\')" style="padding-left:' + padLeft + ';">';
                                html += '<div class="tree-node-main">';
                                html += '<span class="' + chevronClass + '" id="chevron-' + safeFolderId + '">';
                                html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
                                html += '</span>';
                                html += '<span class="tree-node-icon">';
                                html += '<svg class="folder-closed-icon" width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
                                html += '<svg class="folder-open-icon" width="16" height="16" viewBox="0 0 24 24" fill="#fde68a" stroke="#d97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M2 10h20"/></svg>';
                                html += '</span>';
                                html += '<span class="tree-node-name">' + child.name + '</span>';
                                html += '<span class="tree-folder-badge">' + child.fileCount + ' items</span>';
                                html += '</div>';
                                html += '</div>';
                                html += '<div class="' + childrenClass + '" id="folder-' + safeFolderId + '">';
                                html += renderNode(child, level + 1);
                                html += '</div>';
                                html += '</div>';
                            } else {
                                var art = child.artifact;
                                var escapedRel = (art.relativePath || '').replace(/'/g, "\\'");
                                var escapedName = (art.name || '').replace(/'/g, "\\'");
                                var previewBtn = '';
                                if (isPreviewable(art.name)) {
                                    previewBtn = '<button class="artifact-btn" onclick="openArtifactPreview(\'' + escapedRel + '\', \'' + escapedName + '\')" title="Preview file" aria-label="Preview ' + art.name + '">' +
                                        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Preview</button>';
                                }
                                var downloadUrl = runBaseUrl + 'artifact/' + (art.href || art.relativePath);
                                var filePadLeft = (level * 18 + 32) + 'px';

                                html += '<div class="tree-node tree-file" data-path="' + child.fullPath + '">';
                                html += '<div class="tree-node-row" style="padding-left:' + filePadLeft + ';">';
                                html += '<div class="tree-node-main" onclick="openArtifactPreview(\'' + escapedRel + '\', \'' + escapedName + '\')">';
                                html += '<span class="tree-node-icon">' + getFileIcon(art.name) + '</span>';
                                html += '<span class="tree-node-name" title="' + child.fullPath + '">' + child.name + '</span>';
                                html += '<span class="artifact-size" style="margin-left:6px;">' + (art.formattedSize || '0 B') + '</span>';
                                html += '</div>';
                                html += '<div class="tree-node-actions">';
                                html += previewBtn;
                                html += '<a href="' + downloadUrl + '" download="" class="artifact-btn artifact-btn-primary" title="Download ' + art.name + '" aria-label="Download ' + art.name + '">';
                                html += '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download</a>';
                                html += '</div>';
                                html += '</div>';
                                html += '</div>';
                            }
                        }
                        return html;
                    }

                    container.innerHTML = renderNode(treeRoot, 0);
                }

                function toggleFolder(folderPath) {
                    var safeId = folderPath.replace(/[^a-zA-Z0-9_-]/g, '_');
                    var folderEl = document.getElementById('folder-' + safeId);
                    var chevronEl = document.getElementById('chevron-' + safeId);
                    var nodeEl = document.getElementById('folder-node-' + safeId);
                    if (!folderEl) return;
                    var currentlyCollapsed = folderEl.classList.contains('collapsed');
                    if (currentlyCollapsed) {
                        folderEl.classList.remove('collapsed');
                        if (chevronEl) chevronEl.classList.add('expanded');
                        if (nodeEl) nodeEl.classList.add('open');
                        folderExpandedState[folderPath] = true;
                    } else {
                        folderEl.classList.add('collapsed');
                        if (chevronEl) chevronEl.classList.remove('expanded');
                        if (nodeEl) nodeEl.classList.remove('open');
                        folderExpandedState[folderPath] = false;
                    }
                }

                function toggleExpandAllTree(expand) {
                    var childrenEls = document.querySelectorAll('.tree-children');
                    var chevronEls = document.querySelectorAll('.tree-chevron');
                    var nodeEls = document.querySelectorAll('.tree-folder');
                    childrenEls.forEach(function(el) {
                        if (expand) el.classList.remove('collapsed');
                        else el.classList.add('collapsed');
                    });
                    chevronEls.forEach(function(el) {
                        if (expand) el.classList.add('expanded');
                        else el.classList.remove('expanded');
                    });
                    nodeEls.forEach(function(el) {
                        if (expand) el.classList.add('open');
                        else el.classList.remove('open');
                    });
                    var allFolders = document.querySelectorAll('.tree-folder');
                    allFolders.forEach(function(f) {
                        var p = f.getAttribute('data-path');
                        if (p) folderExpandedState[p] = expand;
                    });
                }

                function renderArtifactsFlat(list, query) {
                    var grid = document.getElementById('artifacts-grid');
                    if (!grid) return;

                    var filtered = list.filter(function(a) {
                        if (!query) return true;
                        var nameMatch = (a.name || '').toLowerCase().indexOf(query) !== -1;
                        var pathMatch = (a.relativePath || '').toLowerCase().indexOf(query) !== -1;
                        return nameMatch || pathMatch;
                    });

                    if (filtered.length === 0) {
                        grid.innerHTML = '<div class="artifact-empty-card">' +
                            '<div style="font-size:0.9rem; font-weight:600; color:#475569; margin-bottom:0.25rem;">No Matching Artifacts</div>' +
                            '<div style="font-size:0.8rem; color:#94a3b8;">No archived files match "' + query + '".</div>' +
                            '</div>';
                        return;
                    }

                    var html = '';
                    for (var i = 0; i < filtered.length; i++) {
                        var art = filtered[i];
                        var iconHtml = getFileIcon(art.name);
                        var previewBtn = '';
                        var escapedRel = (art.relativePath || '').replace(/'/g, "\\'");
                        var escapedName = (art.name || '').replace(/'/g, "\\'");

                        if (isPreviewable(art.name)) {
                            previewBtn = '<button class="artifact-btn" onclick="openArtifactPreview(\'' + escapedRel + '\', \'' + escapedName + '\')" title="Preview file in modal" aria-label="Preview ' + art.name + '">' +
                                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
                                ' Preview' +
                                '</button>';
                        }

                        var downloadUrl = runBaseUrl + 'artifact/' + (art.href || art.relativePath);

                        html += '<div class="artifact-card" role="listitem">' +
                            '<div class="artifact-card-info">' +
                                '<div class="artifact-icon">' + iconHtml + '</div>' +
                                '<div class="artifact-meta">' +
                                    '<div class="artifact-name" title="' + art.name + '">' + art.name + '</div>' +
                                    '<div class="artifact-path" title="' + (art.displayPath || art.relativePath) + '">' + (art.displayPath || art.relativePath) + '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="artifact-actions">' +
                                '<span class="artifact-size">' + (art.formattedSize || '0 B') + '</span>' +
                                previewBtn +
                                '<a href="' + downloadUrl + '" download="" class="artifact-btn artifact-btn-primary" title="Download ' + art.name + '" aria-label="Download ' + art.name + '">' +
                                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                                    ' Download' +
                                '</a>' +
                            '</div>' +
                        '</div>';
                    }
                    grid.innerHTML = html;
                }

                function openArtifactPreview(relativePath, fileName) {
                    var modal = document.getElementById('artifact-preview-modal');
                    var titleEl = document.getElementById('artifact-preview-title');
                    var pathEl = document.getElementById('artifact-preview-path');
                    var bodyEl = document.getElementById('artifact-preview-body');
                    var downloadEl = document.getElementById('artifact-preview-download');
                    var iconEl = document.getElementById('artifact-preview-icon');
                    if (!modal) return;

                    var downloadUrl = runBaseUrl + 'artifact/' + relativePath;
                    if (titleEl) titleEl.innerText = fileName || relativePath;
                    if (pathEl) pathEl.innerText = relativePath;
                    if (downloadEl) {
                        downloadEl.href = downloadUrl;
                        downloadEl.setAttribute('download', fileName);
                    }
                    if (iconEl) iconEl.innerHTML = getFileIcon(fileName);

                    if (isImageFile(fileName)) {
                        bodyEl.innerHTML = '<div class="artifact-preview-img-wrap"><img src="' + downloadUrl + '" alt="' + fileName + '" /></div>';
                        modal.classList.add('active');
                    } else {
                        bodyEl.innerHTML = '<div style="padding:1rem; color:#94a3b8; font-size:0.85rem;">Loading preview content...</div>';
                        modal.classList.add('active');

                        fetch(downloadUrl)
                            .then(function(res) {
                                if (!res.ok) throw new Error("HTTP " + res.status);
                                return res.text();
                            })
                            .then(function(text) {
                                if ((fileName || '').toLowerCase().endsWith('.json')) {
                                    try {
                                        var parsed = JSON.parse(text);
                                        text = JSON.stringify(parsed, null, 2);
                                    } catch(e) {}
                                }
                                var pre = document.createElement('pre');
                                pre.className = 'artifact-preview-content';
                                pre.textContent = text;
                                bodyEl.innerHTML = '';
                                bodyEl.appendChild(pre);
                            })
                            .catch(function(err) {
                                bodyEl.innerHTML = '<div style="padding:1.5rem; text-align:center; color:#ef4444;">Failed to preview artifact: ' + err.message + '</div>';
                            });
                    }
                }

                function closeArtifactPreviewModal() {
                    var modal = document.getElementById('artifact-preview-modal');
                    if (modal) modal.classList.remove('active');
                }

                // --- Agent Details and Overview Modal Engine ---
                var currentModalAgentName = 'ALL';
                var AGENT_COLORS = [
                    { bg: '#0284c7', text: '#ffffff' },
                    { bg: '#10b981', text: '#ffffff' },
                    { bg: '#8b5cf6', text: '#ffffff' },
                    { bg: '#f59e0b', text: '#ffffff' },
                    { bg: '#ec4899', text: '#ffffff' },
                    { bg: '#06b6d4', text: '#ffffff' },
                    { bg: '#64748b', text: '#ffffff' }
                ];

                function getAllStagesFlat(stages) {
                    var flat = [];
                    if (!stages || !stages.length) return flat;
                    for (var i = 0; i < stages.length; i++) {
                        var s = stages[i];
                        flat.push(s);
                        if (s.children && s.children.length) {
                            for (var c = 0; c < s.children.length; c++) {
                                flat.push(s.children[c]);
                            }
                        }
                    }
                    return flat;
                }

                function openAgentModal(stageId, agentName) {
                    if (!agentName && stageId && graphData) {
                        var st = findStage(graphData.stages, stageId);
                        if (st) agentName = st.agent;
                    }
                    if (!agentName) {
                        agentName = 'ALL';
                    }

                    renderAgentModalContent(stageId, agentName);
                    var modal = document.getElementById('agent-modal');
                    if (modal) modal.classList.add('active');
                }

                function openAgentModalForCurrentStage() {
                    if (!selectedStageId || !graphData) return;
                    var st = findStage(graphData.stages, selectedStageId);
                    openAgentModal(selectedStageId, st ? st.agent : null);
                }

                function closeAgentModal() {
                    var modal = document.getElementById('agent-modal');
                    if (modal) modal.classList.remove('active');
                }

                function buildAgentStagesTableHtml(stages, currentStageId) {
                    if (!stages || stages.length === 0) {
                        return '<div style="padding:1.25rem; text-align:center; color:#94a3b8; font-size:0.775rem;">No stages recorded on this node in this run.</div>';
                    }
                    var html = '<table class="agent-stages-table">';
                    html += '<thead><tr>';
                    html += '  <th>Stage</th>';
                    html += '  <th style="width: 150px;">Status</th>';
                    html += '  <th class="col-right" style="width: 95px;">Duration</th>';
                    html += '  <th class="col-action" style="width: 95px;">Action</th>';
                    html += '</tr></thead><tbody>';

                    for (var i = 0; i < stages.length; i++) {
                        var st = stages[i];
                        var rawStat = (st.status || 'SUCCESS').toUpperCase();
                        var isSkipped = (rawStat.indexOf('SKIPPED') !== -1 || rawStat === 'NOT_EXECUTED');
                        var isCurrent = (currentStageId && st.id === currentStageId);

                        var stIcon = ICON_ACCORDION_SUCCESS;
                        var pillClass = 'pill-success';
                        var pillLabel = 'Passed';

                        if (rawStat === 'FAILED' || rawStat === 'FAILURE') {
                            stIcon = ICON_ACCORDION_FAILED;
                            pillClass = 'pill-failed';
                            pillLabel = 'Failed';
                        } else if (rawStat === 'UNSTABLE') {
                            stIcon = ICON_ACCORDION_UNSTABLE;
                            pillClass = 'pill-unstable';
                            pillLabel = 'Unstable';
                        } else if (rawStat === 'ABORTED') {
                            stIcon = ICON_ACCORDION_ABORTED;
                            pillClass = 'pill-aborted';
                            pillLabel = 'Aborted';
                        } else if (rawStat === 'IN_PROGRESS' || rawStat === 'PAUSED_PENDING_INPUT') {
                            stIcon = ICON_ACCORDION_IN_PROGRESS;
                            pillClass = 'pill-running';
                            pillLabel = (rawStat === 'PAUSED_PENDING_INPUT') ? 'Paused' : 'Running';
                        } else if (isSkipped) {
                            stIcon = ICON_ACCORDION_SKIPPED;
                            pillClass = 'pill-skipped';
                            pillLabel = (rawStat === 'SKIPPED_CONDITIONAL') ? 'Skipped (When)' : (rawStat === 'SKIPPED_FAILURE' ? 'Skipped (Fail)' : 'Skipped');
                        }

                        var rowClasses = 'agent-stage-row' + (isCurrent ? ' is-current' : '') + (isSkipped ? ' is-skipped' : '');
                        var currentBadge = isCurrent ? ' <span class="agent-stage-tag" style="background:rgba(14,165,233,0.15); color:#0284c7; border-color:rgba(14,165,233,0.3);">Current</span>' : '';
                        var branchBadge = st.isParallelBranch ? ' <span class="agent-stage-tag tag-parallel">Parallel</span>' : '';
                        var allocBadge = (st.agentAllocationMillis && st.agentAllocationMillis >= 500)
                            ? (' <span class="stage-agent-alloc-chip" style="font-size:0.65rem; padding:0 4px;" title="Agent acquisition delay: ' + (st.formattedAgentAllocation || formatDuration(st.agentAllocationMillis)) + '">Alloc: ' + (st.formattedAgentAllocation || formatDuration(st.agentAllocationMillis)) + '</span>')
                            : (st.isWaitingForAgent ? (' <span class="stage-agent-waiting-chip" style="font-size:0.65rem; padding:0 4px;" title="' + (st.agentQueueReason || 'Waiting for executor').replace(/"/g, '&quot;') + '">Waiting</span>') : '');
                        var durText = (st.durationMillis > 0) ? formatDuration(st.durationMillis) : (isSkipped ? '—' : '0s');

                        html += '<tr class="' + rowClasses + '" onclick="selectStageFromAgentModal(\'' + st.id + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();selectStageFromAgentModal(\'' + st.id + '\');}" title="Click to inspect ' + (st.name || '').replace(/"/g, '&quot;') + '" role="button" tabindex="0">';
                        html += '  <td><div class="agent-stage-name-cell"><span class="agent-stage-icon">' + stIcon + '</span><span class="agent-stage-name">' + st.name + '</span>' + branchBadge + currentBadge + allocBadge + '</div></td>';
                        html += '  <td><span class="agent-status-pill ' + pillClass + '"><span class="agent-status-pill-dot"></span>' + pillLabel + '</span></td>';
                        html += '  <td class="agent-stage-duration">' + durText + '</td>';
                        html += '  <td class="agent-stage-action-cell"><span class="agent-inspect-btn">Inspect <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></span></td>';
                        html += '</tr>';
                    }

                    html += '</tbody></table>';
                    return html;
                }

                function renderAgentModalContent(stageId, agentName) {
                    var targetAgent = (agentName || 'ALL').trim();
                    currentModalAgentName = targetAgent;

                    var rawAgents = (graphData && graphData.agentsUsed && graphData.agentsUsed.length) ? graphData.agentsUsed.slice() : [];
                    if (rawAgents.length === 0) {
                        rawAgents = ['Built-In Node'];
                    }

                    // Render Switcher Pills (All Agents Overview + Individual Agent Tabs)
                    var pillsContainer = document.getElementById('agent-modal-pills');
                    if (pillsContainer) {
                        var isAllActive = (targetAgent === 'ALL');
                        var pillsHtml = '';
                        // 1. All Agents Overview pill
                        pillsHtml += '<button class="agent-pill-btn' + (isAllActive ? ' active' : '') + '" onclick="renderAgentModalContent(null, \'ALL\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> All Agents (' + rawAgents.length + ')</button>';

                        // 2. Individual agent pills
                        for (var p = 0; p < rawAgents.length; p++) {
                            var ag = rawAgents[p];
                            var isAgActive = (!isAllActive && ag.toLowerCase() === targetAgent.toLowerCase());
                            var escAg = ag.replace(/'/g, "\\'");
                            var color = AGENT_COLORS[p % AGENT_COLORS.length].bg;
                            pillsHtml += '<button class="agent-pill-btn' + (isAgActive ? ' active' : '') + '" onclick="renderAgentModalContent(null, \'' + escAg + '\')"><span class="agent-legend-dot" style="background:' + color + ';"></span>' + ICON_SERVER + ag + '</button>';
                        }
                        pillsContainer.innerHTML = pillsHtml;
                        pillsContainer.style.display = 'flex';
                    }

                    var allStages = getAllStagesFlat(graphData ? graphData.stages : []);
                    var titleEl = document.getElementById('agent-modal-title');
                    var subtitleEl = document.getElementById('agent-modal-subtitle');
                    var overviewView = document.getElementById('agent-overview-view');
                    var singleView = document.getElementById('agent-single-view');

                    if (targetAgent === 'ALL') {
                        // --- ALL AGENTS OVERVIEW MODE ---
                        if (titleEl) titleEl.innerText = "Agent Allocation & Overview";
                        if (subtitleEl) subtitleEl.innerText = "Workload distribution & execution metrics across all " + rawAgents.length + " pipeline agents";
                        if (overviewView) overviewView.style.display = 'block';
                        if (singleView) singleView.style.display = 'none';

                        // Group stages and calculate total times per agent
                        var agentStats = [];
                        var totalAllAgentTimeMs = 0;
                        var totalExecutedStagesCount = 0;
                        var totalSkippedStagesCount = 0;

                        for (var a = 0; a < rawAgents.length; a++) {
                            var agentNameItem = rawAgents[a];
                            var isBuiltInItem = (!agentNameItem || agentNameItem === 'Built-In Node' || agentNameItem.toLowerCase().indexOf('built-in') !== -1 || agentNameItem.toLowerCase() === 'master');
                            
                            var stagesForAgent = allStages.filter(function(st) {
                                var stAgent = (st.agent || 'Built-In Node').trim();
                                if (isBuiltInItem) {
                                    return !st.agent || stAgent === 'Built-In Node' || stAgent.toLowerCase().indexOf('built-in') !== -1 || stAgent.toLowerCase() === 'master';
                                }
                                return stAgent.toLowerCase() === agentNameItem.toLowerCase();
                            });

                            var agentTimeMs = 0;
                            var sCount = 0, fCount = 0, uCount = 0, skCount = 0;
                            for (var stIdx = 0; stIdx < stagesForAgent.length; stIdx++) {
                                var sObj = stagesForAgent[stIdx];
                                agentTimeMs += (sObj.durationMillis || 0);
                                var stStat = (sObj.status || 'SUCCESS').toUpperCase();
                                if (stStat === 'SUCCESS') sCount++;
                                else if (stStat === 'FAILED' || stStat === 'FAILURE') fCount++;
                                else if (stStat === 'UNSTABLE') uCount++;
                                else if (stStat.indexOf('SKIPPED') !== -1 || stStat === 'NOT_EXECUTED') skCount++;
                            }

                            var execCount = stagesForAgent.length - skCount;
                            totalAllAgentTimeMs += agentTimeMs;
                            totalExecutedStagesCount += execCount;
                            totalSkippedStagesCount += skCount;

                            agentStats.push({
                                name: agentNameItem,
                                isBuiltIn: isBuiltInItem,
                                stages: stagesForAgent,
                                durationMillis: agentTimeMs,
                                executedCount: execCount,
                                successCount: sCount,
                                failCount: fCount,
                                unstableCount: uCount,
                                skipCount: skCount,
                                color: AGENT_COLORS[a % AGENT_COLORS.length].bg
                            });
                        }

                        // Summary label (displays the number of stages that actually ran)
                        var summaryEl = document.getElementById('agent-distribution-summary');
                        if (summaryEl) {
                            var stagesLabel = totalExecutedStagesCount + (totalExecutedStagesCount === 1 ? " Stage" : " Stages");
                            summaryEl.innerText = rawAgents.length + " Agents • " + stagesLabel + " • " + formatDuration(totalAllAgentTimeMs) + " Total Runtime";
                            if (totalSkippedStagesCount > 0) {
                                summaryEl.title = totalExecutedStagesCount + " stages executed (" + totalSkippedStagesCount + " skipped)";
                            }
                        }

                        // Render Distribution Bar & Legend
                        var barEl = document.getElementById('agent-distribution-bar');
                        var legendEl = document.getElementById('agent-distribution-legend');
                        if (barEl) {
                            var barHtml = '';
                            var legendHtml = '';
                            for (var b = 0; b < agentStats.length; b++) {
                                var stat = agentStats[b];
                                var pct = totalAllAgentTimeMs > 0 ? ((stat.durationMillis / totalAllAgentTimeMs) * 100) : (100 / agentStats.length);
                                if (pct < 1 && stat.executedCount > 0 && stat.durationMillis > 0) pct = 2; // minimum visual slice
                                var escStatName = stat.name.replace(/'/g, "\\'");
                                var tip = stat.name + ': ' + stat.executedCount + ' stage' + (stat.executedCount !== 1 ? 's' : '') + ' ran' + (stat.skipCount > 0 ? ' (+' + stat.skipCount + ' skipped)' : '') + ' (' + formatDuration(stat.durationMillis) + ' — ' + pct.toFixed(0) + '%)';

                                barHtml += '<div class="agent-distribution-segment" style="width:' + pct.toFixed(1) + '%; background:' + stat.color + ';" title="' + tip + '" onclick="renderAgentModalContent(null, \'' + escStatName + '\')"></div>';

                                legendHtml += '<div class="agent-legend-item" onclick="renderAgentModalContent(null, \'' + escStatName + '\')" title="' + tip + ' — Click to view agent details">';
                                legendHtml += '<span class="agent-legend-dot" style="background:' + stat.color + ';"></span>';
                                legendHtml += '<span>' + stat.name + ' <span style="opacity:0.65; font-weight:normal;">(' + stat.executedCount + ' • ' + formatDuration(stat.durationMillis) + ')</span></span>';
                                legendHtml += '</div>';
                            }
                            barEl.innerHTML = barHtml;
                            if (legendEl) legendEl.innerHTML = legendHtml;
                        }

                        // Render Overview Cards
                        var cardsContainer = document.getElementById('agent-overview-cards');
                        if (cardsContainer) {
                            var cardsHtml = '';
                            for (var c = 0; c < agentStats.length; c++) {
                                var aStat = agentStats[c];
                                var escAgentC = aStat.name.replace(/'/g, "\\'");
                                var nodePathC = aStat.isBuiltIn ? '(built-in)' : encodeURIComponent(aStat.name);
                                var baseC = (typeof appRootUrl !== 'undefined') ? appRootUrl : (typeof runBaseUrl !== 'undefined' ? runBaseUrl.replace(/job\/.*$/, '') : '/');
                                var computerUrl = baseC + 'computer/' + nodePathC + '/';
                                var execStagesC = aStat.executedCount;

                                var hasMatchingStage = false;
                                if (stageId && aStat.stages) {
                                    for (var sIdx = 0; sIdx < aStat.stages.length; sIdx++) {
                                        if (aStat.stages[sIdx].id === stageId) {
                                            hasMatchingStage = true;
                                            break;
                                        }
                                    }
                                }
                                var isInitialExpanded = (agentStats.length <= 2 || hasMatchingStage);
                                var showBtnText = 'Show Stages (' + aStat.stages.length + ') ▾';
                                var btnText = isInitialExpanded ? 'Hide Stages ▴' : showBtnText;

                                cardsHtml += '<div id="agent-overview-card-' + c + '" class="agent-overview-card' + (isInitialExpanded ? '' : ' is-collapsed') + '">';
                                cardsHtml += '  <div class="agent-overview-card-header">';
                                cardsHtml += '    <div class="agent-overview-card-title">';
                                cardsHtml += '      <span class="agent-legend-dot" style="width:10px; height:10px; background:' + aStat.color + ';"></span>';
                                cardsHtml += '      <span class="agent-overview-card-name">' + aStat.name + '</span>';
                                cardsHtml += '      <span class="agent-hero-status" style="font-size:0.7rem; margin-left:4px;"><span class="agent-status-dot"></span>' + (aStat.isBuiltIn ? 'Built-In' : 'Active Dedicated') + '</span>';
                                cardsHtml += '    </div>';
                                cardsHtml += '    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">';
                                cardsHtml += '      <div class="agent-overview-card-metrics">';
                                cardsHtml += '        <span class="agent-overview-metric-pill">' + execStagesC + ' Executed' + (aStat.skipCount > 0 ? ' · ' + aStat.skipCount + ' Skipped' : '') + '</span>';
                                cardsHtml += '        <span class="agent-overview-metric-pill">' + formatDuration(aStat.durationMillis) + '</span>';
                                if (aStat.failCount > 0) {
                                    cardsHtml += '        <span class="agent-overview-metric-pill failed">' + aStat.failCount + ' Failed</span>';
                                } else if (aStat.unstableCount > 0) {
                                    cardsHtml += '        <span class="agent-overview-metric-pill unstable">' + aStat.unstableCount + ' Unstable</span>';
                                } else if (aStat.successCount > 0) {
                                    cardsHtml += '        <span class="agent-overview-metric-pill success">' + aStat.successCount + ' Passed</span>';
                                }
                                cardsHtml += '      </div>';
                                cardsHtml += '      <button type="button" class="agent-btn-action" id="agent-toggle-stages-btn-' + c + '" data-show-text="' + showBtnText + '" onclick="toggleAgentCardStages(' + c + ')" title="Toggle stages list for ' + escAgentC + '" style="padding:0.25rem 0.6rem; font-size:0.7rem;">' + btnText + '</button>';
                                cardsHtml += '      <button type="button" class="agent-btn-action" onclick="renderAgentModalContent(null, \'' + escAgentC + '\')" title="Focus on this agent" style="padding:0.25rem 0.6rem; font-size:0.7rem;">Focus →</button>';
                                cardsHtml += '      <a href="' + computerUrl + '" target="_blank" class="agent-btn-action" title="Open Jenkins Node page in new tab" style="padding:0.25rem 0.5rem; font-size:0.7rem;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>';
                                cardsHtml += '    </div>';
                                cardsHtml += '  </div>';

                                // Render stages table on this agent
                                cardsHtml += '<div id="agent-stages-collapse-' + c + '" class="agent-stages-list" style="display:' + (isInitialExpanded ? 'block' : 'none') + '; max-height:210px; border:none; border-radius:0;">';
                                cardsHtml += buildAgentStagesTableHtml(aStat.stages, stageId);
                                cardsHtml += '</div>';

                                cardsHtml += '</div>';
                            }
                            cardsContainer.innerHTML = cardsHtml;
                        }

                    } else {
                        // --- SINGLE AGENT FOCUSED MODE ---
                        var displayAgentName = targetAgent;
                        var isBuiltIn = (!displayAgentName || displayAgentName === 'Built-In Node' || displayAgentName.toLowerCase().indexOf('built-in') !== -1 || displayAgentName.toLowerCase() === 'master');

                        if (titleEl) titleEl.innerText = "Agent Node Details";
                        if (subtitleEl) subtitleEl.innerText = "Execution metrics & stages for " + displayAgentName;
                        if (overviewView) overviewView.style.display = 'none';
                        if (singleView) singleView.style.display = 'block';

                        var nameEl = document.getElementById('agent-modal-name');
                        if (nameEl) nameEl.innerText = displayAgentName;

                        var statusTextEl = document.getElementById('agent-modal-status-text');
                        if (statusTextEl) {
                            statusTextEl.innerText = isBuiltIn ? "Built-In Controller" : "Active Dedicated Agent";
                        }

                        var nodeLinkEl = document.getElementById('btn-agent-node-link');
                        if (nodeLinkEl) {
                            var nPath = isBuiltIn ? '(built-in)' : encodeURIComponent(displayAgentName);
                            var bUrl = (typeof appRootUrl !== 'undefined') ? appRootUrl : (typeof runBaseUrl !== 'undefined' ? runBaseUrl.replace(/job\/.*$/, '') : '/');
                            nodeLinkEl.href = bUrl + 'computer/' + nPath + '/';
                        }

                        var copyBtnText = document.getElementById('btn-copy-agent-text');
                        if (copyBtnText) copyBtnText.innerText = "Copy Name";

                        // Find matching stages for this single agent
                        var matchingStages = allStages.filter(function(st) {
                            var stAgent = (st.agent || 'Built-In Node').trim();
                            if (isBuiltIn) {
                                return !st.agent || stAgent === 'Built-In Node' || stAgent.toLowerCase().indexOf('built-in') !== -1 || stAgent.toLowerCase() === 'master';
                            }
                            return stAgent.toLowerCase() === displayAgentName.toLowerCase();
                        });

                        var totalTimeMs = 0;
                        var successCount = 0;
                        var failCount = 0;
                        var unstableCount = 0;
                        var skipCount = 0;

                        for (var i = 0; i < matchingStages.length; i++) {
                            var s = matchingStages[i];
                            totalTimeMs += (s.durationMillis || 0);
                            var stStatus = (s.status || 'SUCCESS').toUpperCase();
                            if (stStatus === 'SUCCESS') successCount++;
                            else if (stStatus === 'FAILED' || stStatus === 'FAILURE') failCount++;
                            else if (stStatus === 'UNSTABLE') unstableCount++;
                            else if (stStatus.indexOf('SKIPPED') !== -1 || stStatus === 'NOT_EXECUTED') skipCount++;
                        }

                        var executedCount = matchingStages.length - skipCount;
                        var stagesStatEl = document.getElementById('agent-stat-stages');
                        if (stagesStatEl) {
                            if (skipCount > 0) {
                                stagesStatEl.innerHTML = executedCount + ' <span style="font-size:0.75rem; font-weight:500; color:#94a3b8;">(+' + skipCount + ' skipped)</span>';
                            } else {
                                stagesStatEl.innerText = matchingStages.length.toString();
                            }
                        }

                        var timeStatEl = document.getElementById('agent-stat-time');
                        if (timeStatEl) timeStatEl.innerText = formatDuration(totalTimeMs);

                        var outcomesStatEl = document.getElementById('agent-stat-outcomes');
                        if (outcomesStatEl) {
                            var outcomeParts = [];
                            if (failCount > 0) {
                                outcomeParts.push('<span style="color:#ef4444; font-weight:700;">' + failCount + ' Failed</span>');
                            }
                            if (unstableCount > 0) {
                                outcomeParts.push('<span style="color:#f59e0b; font-weight:700;">' + unstableCount + ' Unstable</span>');
                            }
                            if (successCount > 0) {
                                outcomeParts.push('<span style="color:#10b981; font-weight:700;">' + successCount + ' Passed</span>');
                            }
                            if (skipCount > 0) {
                                outcomeParts.push('<span style="color:#94a3b8; font-weight:600; font-size:0.82rem;">' + skipCount + ' Skipped</span>');
                            }
                            outcomesStatEl.innerHTML = outcomeParts.length > 0 ? outcomeParts.join(' <span style="color:#64748b;">·</span> ') : 'None';
                        }

                        var listEl = document.getElementById('agent-modal-stages-list');
                        if (listEl) {
                            listEl.innerHTML = buildAgentStagesTableHtml(matchingStages, stageId);
                        }
                    }
                }

                function toggleAgentCardStages(idx) {
                    var listEl = document.getElementById('agent-stages-collapse-' + idx);
                    var cardEl = document.getElementById('agent-overview-card-' + idx);
                    var btnEl = document.getElementById('agent-toggle-stages-btn-' + idx);
                    if (!listEl) return;
                    var isExpanded = listEl.style.display !== 'none';
                    if (isExpanded) {
                        listEl.style.display = 'none';
                        if (cardEl) cardEl.classList.add('is-collapsed');
                        if (btnEl) btnEl.innerText = btnEl.getAttribute('data-show-text') || 'Show Stages ▾';
                    } else {
                        listEl.style.display = 'block';
                        if (cardEl) cardEl.classList.remove('is-collapsed');
                        if (btnEl) btnEl.innerText = 'Hide Stages ▴';
                    }
                }

                function toggleAllAgentOverviewCards(expand) {
                    var cards = document.querySelectorAll('[id^="agent-stages-collapse-"]');
                    for (var i = 0; i < cards.length; i++) {
                        cards[i].style.display = expand ? 'block' : 'none';
                        var idx = cards[i].id.replace('agent-stages-collapse-', '');
                        var cardEl = document.getElementById('agent-overview-card-' + idx);
                        if (cardEl) {
                            if (expand) cardEl.classList.remove('is-collapsed');
                            else cardEl.classList.add('is-collapsed');
                        }
                        var btn = document.getElementById('agent-toggle-stages-btn-' + idx);
                        if (btn) {
                            btn.innerText = expand ? 'Hide Stages ▴' : (btn.getAttribute('data-show-text') || 'Show Stages ▾');
                        }
                    }
                }

                function selectStageFromAgentModal(stageId) {
                    closeAgentModal();
                    if (stageId) {
                        selectStage(stageId);
                        setTimeout(function() {
                            scrollStageIntoPipelineView(stageId, true);
                        }, 100);
                    }
                }

                function copyModalAgentName() {
                    if (!currentModalAgentName) return;
                    var toCopy = currentModalAgentName;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(toCopy).then(function() {
                            showCopiedAgentState();
                        }).catch(function() {
                            fallbackCopyAgentText(toCopy);
                        });
                    } else {
                        fallbackCopyAgentText(toCopy);
                    }
                }

                function showCopiedAgentState() {
                    var textEl = document.getElementById('btn-copy-agent-text');
                    if (textEl) {
                        var orig = textEl.innerText;
                        textEl.innerText = "Copied!";
                        setTimeout(function() {
                            if (textEl) textEl.innerText = orig;
                        }, 2000);
                    }
                }

                function fallbackCopyAgentText(text) {
                    try {
                        var ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        showCopiedAgentState();
                    } catch (e) {
                        console.error("Failed to copy agent name", e);
                    }
                }

                function navigateBuild(type) {
                    var btn = document.getElementById(type === 'prev' ? 'btn-prev' : 'btn-next');
                    var target = btn.getAttribute("data-target");
                    if (target) {
                        window.location.href = target;
                    }
                }

                function renderGraph(data) {
                    var flowContainer = document.getElementById('pipeline-flow');
                    applyViewPreferences();

                    if (!data.stages || data.stages.length === 0) {
                        flowContainer.innerHTML = '<div style="padding:2rem; color:#64748b;">No stages recorded yet.</div>';
                        return;
                    }

                    totalPipelineDuration = data.duration || 0;
                    if (!totalPipelineDuration || totalPipelineDuration <= 0) {
                        totalPipelineDuration = 0;
                        if (data.stages) {
                            for (var s = 0; s < data.stages.length; s++) {
                                totalPipelineDuration += (data.stages[s].durationMillis || 0);
                            }
                        }
                    }

                    longestStageId = null;
                    maxStageDuration = 0;

                    function scanStageDurations(stageList) {
                        if (!stageList) return;
                        for (var dIdx = 0; dIdx < stageList.length; dIdx++) {
                            var itemStage = stageList[dIdx];
                            if (itemStage.children && itemStage.children.length > 0) {
                                scanStageDurations(itemStage.children);
                            } else {
                                var dVal = itemStage.durationMillis || 0;
                                var isSkippedVal = (itemStage.status && (itemStage.status.indexOf('SKIPPED') !== -1 || itemStage.status === 'NOT_EXECUTED'));
                                if (!isSkippedVal && dVal > maxStageDuration && dVal >= 500) {
                                    maxStageDuration = dVal;
                                    longestStageId = itemStage.id;
                                }
                            }
                        }
                    }
                    scanStageDurations(data.stages);

                    var visibleColumns = [];
                    for (var i = 0; i < data.stages.length; i++) {
                        var stage = data.stages[i];
                        if (stage.children && stage.children.length > 0) {
                            var visibleChildren = hideSkipped
                                ? stage.children.filter(function(c) { return !(c.status && c.status.indexOf("SKIPPED") !== -1); })
                                : stage.children;
                            if (visibleChildren.length > 0) {
                                visibleColumns.push({
                                    isParallel: true,
                                    name: stage.name,
                                    stage: stage,
                                    children: visibleChildren
                                });
                            }
                        } else {
                            if (!hideSkipped || !(stage.status && stage.status.indexOf("SKIPPED") !== -1)) {
                                visibleColumns.push({
                                    isParallel: false,
                                    stage: stage
                                });
                            }
                        }
                    }

                    if (visibleColumns.length === 0) {
                        flowContainer.innerHTML = '<div style="padding:2rem; color:#64748b; text-align:center;">All stages in this run are skipped. Uncheck &quot;Hide Skipped&quot; above to view them.</div>';
                        return;
                    }

                    var html = '<div id="pipeline-flow-canvas" class="pipeline-flow-canvas">';
                    html += '<svg id="pipeline-flow-svg" class="pipeline-flow-svg" aria-hidden="true"></svg>';

                    // Start Terminal Milestone Node (Image 2 style)
                    var startupTitle = "Pipeline execution started";
                    var startupSubtextHtml = "";
                    if (totalStartupDelayMs >= 500) {
                        var startupPct = totalPipelineDuration > 0 ? Math.round((totalStartupDelayMs / totalPipelineDuration) * 100) : 0;
                        startupTitle = "Pipeline Startup & Agent Allocation: " + formatDuration(totalStartupDelayMs) + (startupPct > 0 ? (" (" + startupPct + "% of total build)") : "") + " before Stage 1";
                        startupSubtextHtml = '<span class="terminal-subtext" title="' + startupTitle.replace(/"/g, '&quot;') + '">' + formatDuration(totalStartupDelayMs) + ' setup</span>';
                    }

                    html += '<div class="terminal-node terminal-start" id="terminal-node-start" title="' + startupTitle.replace(/"/g, '&quot;') + '">';
                    html += '  <span class="terminal-label">Start</span>';
                    html += '  <div class="terminal-circle terminal-start-circle" aria-hidden="true">';
                    html += '    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>';
                    html += '  </div>';
                    html += '  ' + startupSubtextHtml;
                    html += '</div>';

                    for (var i = 0; i < visibleColumns.length; i++) {
                        var col = visibleColumns[i];
                        var isLastCol = (i === visibleColumns.length - 1);

                        if (isLastCol) {
                            html += '<div class="terminal-end-group">';
                        }

                        if (col.isParallel) {
                            var maxChildDur = 0;
                            var longestChildName = "";
                            var parallelDoneCount = 0;
                            var parallelRunningCount = 0;
                            var parallelFailedCount = 0;
                            var parallelSkippedCount = 0;
                            for (var c = 0; c < col.children.length; c++) {
                                var cDur = col.children[c].durationMillis || 0;
                                if (cDur > maxChildDur) {
                                    maxChildDur = cDur;
                                    longestChildName = col.children[c].name;
                                }
                                var childStatus = col.children[c].status || "SUCCESS";
                                if (childStatus === "IN_PROGRESS" || childStatus === "PAUSED_INPUT") {
                                    parallelRunningCount++;
                                } else if (childStatus === "FAILED" || childStatus === "FAILURE" || childStatus === "UNSTABLE") {
                                    parallelFailedCount++;
                                } else if (childStatus.indexOf("SKIPPED") !== -1 || childStatus === "NOT_EXECUTED") {
                                    parallelSkippedCount++;
                                } else {
                                    parallelDoneCount++;
                                }
                            }
                            var parallelDur = Math.max(col.stage ? (col.stage.durationMillis || 0) : 0, maxChildDur);
                            var parallelPct = (totalPipelineDuration > 0 && parallelDur > 0)
                                ? Math.round((parallelDur / totalPipelineDuration) * 100)
                                : 0;
                            var parallelPctOfStages = (totalActiveStageTimeMs > 0 && parallelDur > 0)
                                ? Math.round((parallelDur / totalActiveStageTimeMs) * 100)
                                : 0;
                            var parallelTooltip = 'Overall Parallel Duration: ' + formatDuration(parallelDur) +
                                (parallelPctOfStages > 0 ? (' (' + parallelPctOfStages + '% of stage execution time, ' + parallelPct + '% of total build)') : '') +
                                (longestChildName ? (' — Longest branch: ' + longestChildName + ' (' + formatDuration(maxChildDur) + ')') : '');

                            var parallelOverallStatus = "SUCCESS";
                            if (parallelFailedCount > 0) {
                                parallelOverallStatus = "FAILED";
                            } else if (parallelRunningCount > 0) {
                                parallelOverallStatus = "IN_PROGRESS";
                            } else if (parallelSkippedCount === col.children.length) {
                                parallelOverallStatus = "SKIPPED";
                            }

                            var isMatrixStack = (col.stage && col.stage.matrix) || col.children.some(function(c) { return c.matrix; });
                            var stackClasses = "parallel-stack status-" + parallelOverallStatus + (isMatrixStack ? " is-matrix" : "");
                            if (parallelRunningCount > 0) {
                                stackClasses += " is-running";
                            }

                            var cleanParallelName = col.name;
                            if (cleanParallelName.indexOf('Matrix:') === 0) {
                                cleanParallelName = cleanParallelName.substring(7).trim();
                            }

                            html += '<div class="stage-column">';
                            html += '<div class="' + stackClasses + '" data-status="' + parallelOverallStatus + '" data-parallel-name="' + col.name.replace(/"/g, '&quot;') + '">';
                            html += '<div class="parallel-label' + (parallelRunningCount > 0 ? ' is-running' : '') + '">';

                            html += '<div class="parallel-label-top">';
                            html += '<div class="parallel-label-title-wrap">';
                            if (isMatrixStack) {
                                html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; flex-shrink:0;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
                            } else {
                                html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; flex-shrink:0;"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 10.5L15.5 7.5"/><path d="M8.5 13.5L15.5 16.5"/></svg>';
                            }
                            html += '<span class="parallel-label-name" title="' + cleanParallelName.replace(/"/g, '&quot;') + '">' + cleanParallelName + '</span>';
                            if (isMatrixStack) {
                                html += '<span class="parallel-matrix-badge">MATRIX</span>';
                            }
                            html += '</div>';
                            html += '<button type="button" class="parallel-toggle-btn" title="Toggle parallel view" onclick="window.toggleParallelStack(this, event)" aria-expanded="true">';
                            html += '<svg class="parallel-toggle-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
                            html += '</button>';
                            html += '</div>'; // end parallel-label-top

                            html += '<div class="parallel-label-sub">';
                            html += '<span class="parallel-count-badge" title="' + col.children.length + (isMatrixStack ? ' matrix cells' : ' parallel branches') + '">' + col.children.length + (isMatrixStack ? ' CELLS' : ' BRANCHES') + '</span>';
                            if (parallelRunningCount > 0) {
                                html += '<span class="parallel-running-chip" title="' + parallelRunningCount + ' branch(es) currently executing">';
                                html += '<svg class="horizon-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="vertical-align:-1px; margin-right:3px; flex-shrink:0;"><circle cx="12" cy="12" r="9" stroke-opacity="0.3"/><path d="M12 3a9 9 0 0 1 9 9" stroke-linecap="round"/></svg>';
                                html += parallelRunningCount + ' RUNNING';
                                html += '</span>';
                            }
                            if (parallelDur > 0) {
                                html += '<span class="parallel-duration-badge" title="' + parallelTooltip.replace(/"/g, '&quot;') + '">';
                                html += '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; margin-right:3px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
                                html += formatDuration(parallelDur) + (parallelPctOfStages > 0 ? (' (' + parallelPctOfStages + '%)') : '');
                                html += '</span>';
                            }
                            html += '</div>'; // end parallel-label-sub

                            html += '</div>'; // end parallel-label

                            html += '<div class="parallel-summary" title="Parallel stages execute concurrently: the next stage starts after all branches finish.">';
                            html += '<span class="parallel-join-badge">' + (isMatrixStack ? 'ALL CELLS COMPLETE' : 'ALL BRANCHES JOIN') + '</span>';
                            html += '<div class="parallel-summary-pills">';
                            if (parallelRunningCount > 0) {
                                html += '<span class="parallel-summary-pill pill-running"><span class="parallel-pulsing-dot"></span>' + parallelRunningCount + ' running</span>';
                            }
                            if (parallelDoneCount > 0) {
                                html += '<span class="parallel-summary-pill pill-done">' + parallelDoneCount + '/' + col.children.length + ' done</span>';
                            }
                            if (parallelFailedCount > 0) {
                                html += '<span class="parallel-summary-pill pill-failed">' + parallelFailedCount + ' attention</span>';
                            }
                            if (parallelSkippedCount > 0 && parallelDoneCount === 0 && parallelRunningCount === 0) {
                                html += '<span class="parallel-summary-pill pill-skipped">' + parallelSkippedCount + ' skipped</span>';
                            }
                            html += '</div>';
                            html += '</div>';

                            html += '<div class="parallel-collapsed-card" onclick="window.toggleParallelStack(this, event)" title="Click to expand parallel branches">';
                            html += '<div class="parallel-collapsed-header">';
                            html += '<span>' + col.children.length + (isMatrixStack ? ' Matrix Cells' : ' Parallel Branches') + '</span>';
                            html += '<span>' + (parallelDur > 0 ? formatDuration(parallelDur) : '') + '</span>';
                            html += '</div>';
                            html += '<div class="parallel-collapsed-hint">';
                            html += '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>';
                            html += (parallelRunningCount > 0 ? (parallelRunningCount + ' running currently — ') : '') + 'Click to expand all cards';
                            html += '</div>';
                            html += '</div>';

                            var gridCols = (col.children.length >= 12) ? 3 : ((col.children.length >= 5) ? 2 : 1);
                            html += '<div class="parallel-cards-grid cols-' + gridCols + '">';
                            for (var c = 0; c < col.children.length; c++) {
                                html += renderStageCard(col.children[c], col.stage, parallelDur);
                            }
                            html += '</div>';
                            html += '</div></div>';
                        } else {
                            html += '<div class="stage-column">';
                            html += renderStageCard(col.stage, null, 0);
                            html += '</div>';
                        }

                        if (isLastCol) {
                            var runStatus = data.status || 'SUCCESS';
                            var endStatusCls = 'status-' + runStatus;
                            var endIcon = ICON_SUCCESS;
                            if (runStatus === 'FAILED' || runStatus === 'FAILURE') endIcon = ICON_FAILED;
                            else if (runStatus === 'UNSTABLE') endIcon = ICON_UNSTABLE;
                            else if (runStatus === 'IN_PROGRESS') endIcon = ICON_IN_PROGRESS;
                            else if (runStatus === 'ABORTED') endIcon = ICON_ABORTED;

                            html += '<div class="terminal-node terminal-end ' + endStatusCls + '" id="terminal-node-end" data-status="' + runStatus + '" title="Pipeline execution completed (' + runStatus + ')">';
                            html += '  <span class="terminal-label">End</span>';
                            html += '  <div class="terminal-circle terminal-end-circle ' + endStatusCls + '" aria-hidden="true">';
                            html += '    ' + endIcon;
                            html += '  </div>';
                            html += '</div>';
                            html += '</div>'; // close .terminal-end-group
                        }
                    }

                    if (visibleColumns.length === 0) {
                        var runStatus = data.status || 'SUCCESS';
                        var endStatusCls = 'status-' + runStatus;
                        var endIcon = ICON_SUCCESS;
                        if (runStatus === 'FAILED' || runStatus === 'FAILURE') endIcon = ICON_FAILED;
                        else if (runStatus === 'UNSTABLE') endIcon = ICON_UNSTABLE;
                        else if (runStatus === 'IN_PROGRESS') endIcon = ICON_IN_PROGRESS;
                        else if (runStatus === 'ABORTED') endIcon = ICON_ABORTED;

                        html += '<div class="terminal-node terminal-end ' + endStatusCls + '" id="terminal-node-end" data-status="' + runStatus + '" title="Pipeline execution completed (' + runStatus + ')">';
                        html += '  <span class="terminal-label">End</span>';
                        html += '  <div class="terminal-circle terminal-end-circle ' + endStatusCls + '" aria-hidden="true">';
                        html += '    ' + endIcon;
                        html += '  </div>';
                        html += '</div>';
                    }

                    html += '</div>'; // close #pipeline-flow-canvas

                    flowContainer.innerHTML = html;
                    initFlowPanAndDrag();
                    var fitColCount = flowContainer.querySelectorAll('.stage-column').length;
                    var needsRefit = !userManualZoomApplied && (!window._horizonInitialAutoFitDone || window._horizonLastFitColCount !== fitColCount);
                    window._horizonLastFitColCount = fitColCount;
                    if (needsRefit) {
                        window._horizonInitialAutoFitDone = true;
                        autoFitPipelineGraph(false);
                        scheduleSettledRefit();
                    } else {
                        applyCanvasZoom();
                    }
                    setTimeout(scheduleDrawFlowConnectors, 25);


                    // Re-select stage from URL hash only ONCE on initial load;
                    // never re-invoke applyHashSelection during periodic live polling!
                    var hashApplied = false;
                    if (!window._horizonInitialHashSelectionDone) {
                        window._horizonInitialHashSelectionDone = true;
                        hashApplied = applyHashSelection(true);
                    }
                    if (!hashApplied) {
                        if (!window._horizonInitialAutoJumpDone) {
                            window._horizonInitialAutoJumpDone = true;
                            var autoTarget = findAutoJumpTarget(graphData);
                            if (autoTarget && autoTarget.stage) {
                                autoTarget.stage._isAutoJump = true;
                                selectStage(autoTarget.stage.id, true, autoTarget.step ? autoTarget.step.id : null);
                                setTimeout(function() {
                                    scrollStageIntoPipelineView(autoTarget.stage.id, true);
                                }, 120);
                                if (autoTarget.type === 'failure' || autoTarget.type === 'unstable') {
                                    showAutoJumpNotice(autoTarget);
                                }
                            } else if (visibleColumns.length > 0) {
                                var firstCol = visibleColumns[0];
                                var firstStage = firstCol.isParallel ? firstCol.children[0] : firstCol.stage;
                                selectStage(firstStage.id, true);
                            }
                        } else {
                            var movedToActiveStage = followActiveStageIfNeeded(graphData);
                            var isCurrentlyVisible = selectedStageId && document.getElementById('stage-card-' + selectedStageId);
                            if (movedToActiveStage) {
                                // followActiveStageIfNeeded already selected and rendered the active stage
                            } else if (isCurrentlyVisible) {
                                selectStage(selectedStageId, true, null, null, true);
                            } else if (visibleColumns.length > 0) {
                                var firstCol = visibleColumns[0];
                                var firstStage = firstCol.isParallel ? firstCol.children[0] : firstCol.stage;
                                selectStage(firstStage.id, true);
                            }
                        }
                    }
                    renderStagePickerList();
                    renderGraphMinimizedStrip();
                }

                var isGraphMinimized = false;

                function toggleGraphMinimized() {
                    isGraphMinimized = !isGraphMinimized;
                    var card = document.querySelector('.graph-card');
                    var strip = document.getElementById('graph-minimized-strip');
                    var btn = document.getElementById('btn-minimize-graph');
                    var lbl = document.getElementById('btn-minimize-graph-label');
                    if (card) card.classList.toggle('is-minimized', isGraphMinimized);
                    if (strip) strip.style.display = isGraphMinimized ? 'flex' : 'none';
                    if (btn) btn.setAttribute('aria-pressed', isGraphMinimized ? 'true' : 'false');
                    if (lbl) lbl.textContent = isGraphMinimized ? 'Expand Graph' : 'Minimize Graph';
                    if (isGraphMinimized) {
                        renderGraphMinimizedStrip();
                    } else {
                        setTimeout(scheduleDrawFlowConnectors, 30);
                    }
                }

                function renderGraphMinimizedStrip() {
                    var strip = document.getElementById('graph-minimized-strip');
                    if (!strip || !graphData || !graphData.stages) return;
                    var allLeafStages = [];
                    function collectLeafs(list) {
                        for (var i = 0; i < list.length; i++) {
                            var s = list[i];
                            if (s.children && s.children.length > 0) {
                                collectLeafs(s.children);
                            } else {
                                if (hideSkipped && s.status && s.status.indexOf('SKIPPED') !== -1) continue;
                                allLeafStages.push(s);
                            }
                        }
                    }
                    collectLeafs(graphData.stages);
                    var html = '';
                    for (var idx = 0; idx < allLeafStages.length; idx++) {
                        var st = allLeafStages[idx];
                        var stat = (st.status || 'SUCCESS').toUpperCase();
                        var dotCls = 'dot-success';
                        if (stat === 'FAILED' || stat === 'FAILURE') dotCls = 'dot-failed';
                        else if (stat === 'UNSTABLE') dotCls = 'dot-unstable';
                        else if (stat === 'IN_PROGRESS') dotCls = 'dot-in-progress';
                        else if (stat === 'PAUSED_INPUT') dotCls = 'dot-paused-input';
                        else if (stat.indexOf('SKIPPED') !== -1 || stat === 'NOT_EXECUTED') dotCls = 'dot-skipped';

                        var isSel = (st.id === selectedStageId);
                        var durFmt = st.durationMillis ? formatStepDuration(st.durationMillis) : '';
                        if (idx > 0) {
                            html += '<span class="graph-min-arrow" aria-hidden="true">\u2192</span>';
                        }
                        html += '<button type="button" class="graph-min-pill' + (isSel ? ' is-selected' : '') + '" id="graph-min-pill-' + st.id + '" onclick="selectStage(\'' + st.id + '\')" title="' + escapeHtml(st.name + ' (' + stat + (durFmt ? ', ' + durFmt : '') + ')') + '">';
                        html += '<span class="stage-picker-dot ' + dotCls + '" aria-hidden="true"></span>';
                        html += '<span>' + escapeHtml(st.name) + '</span>';
                        if (durFmt) {
                            html += '<span class="graph-min-pill-dur">' + durFmt + '</span>';
                        }
                        html += '</button>';
                    }
                    strip.innerHTML = html;
                }

                function getFlowStatusClass(srcStatus, tgtStatus) {
                    if (srcStatus === "FAILED" || srcStatus === "FAILURE" || tgtStatus === "FAILED" || tgtStatus === "FAILURE") {
                        return "flow-failed";
                    }
                    if (srcStatus === "PAUSED_INPUT" || tgtStatus === "PAUSED_INPUT") {
                        return "flow-paused-input";
                    }
                    if (srcStatus === "IN_PROGRESS" || tgtStatus === "IN_PROGRESS") {
                        return "flow-in-progress";
                    }
                    if (srcStatus === "UNSTABLE" || tgtStatus === "UNSTABLE") {
                        return "flow-unstable";
                    }
                    if ((srcStatus && srcStatus.indexOf("SKIPPED") !== -1) || (tgtStatus && tgtStatus.indexOf("SKIPPED") !== -1)) {
                        return "flow-skipped";
                    }
                    if (srcStatus === "SUCCESS") {
                        return "flow-success";
                    }
                    return "flow-neutral";
                }

                function createFlowPathElement(x1, y1, x2, y2, srcStatus, tgtStatus, srcBottomY, customRowGapFloor) {
                    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    var statusCls = getFlowStatusClass(srcStatus, tgtStatus);
                    path.setAttribute("class", "flow-path " + statusCls);
                    var d = "";
                    if (x2 >= x1) {
                        var dx = x2 - x1;
                        if (Math.abs(y2 - y1) < 2) {
                            d = "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
                        } else {
                            var cx1 = x1 + dx * 0.5;
                            var cx2 = x2 - dx * 0.5;
                            d = "M " + x1 + " " + y1 + " C " + cx1 + " " + y1 + ", " + cx2 + " " + y2 + ", " + x2 + " " + y2;
                        }
                    } else {
                        // Serpentine wrap connector: Row break occurred (next row is below and starts back on the left)
                        // Route down through the row separator space below all cards and parallel stacks in the source row
                        var rowGapFloor;
                        if (customRowGapFloor !== undefined) {
                            rowGapFloor = customRowGapFloor;
                        } else {
                            rowGapFloor = (srcBottomY !== undefined) ? Math.max(srcBottomY + 18, (y1 + y2) / 2) : (y1 + 44);
                            if (y2 > y1 && rowGapFloor > y2 - 14) {
                                rowGapFloor = (y1 + y2) / 2;
                            }
                        }

                        var rOut = 14;
                        if ((rowGapFloor - y1) < rOut * 2) {
                            rOut = Math.max(4, Math.floor((rowGapFloor - y1) / 2));
                        }
                        if ((y2 - rowGapFloor) < rOut * 2) {
                            rOut = Math.max(4, Math.floor((y2 - rowGapFloor) / 2));
                        }

                        var rightTurnX = x1 + 22;
                        var leftEntryX = Math.max(8, x2 - 24);

                        d = "M " + x1 + " " + y1 +
                            " L " + (rightTurnX - rOut) + " " + y1 +
                            " Q " + rightTurnX + " " + y1 + ", " + rightTurnX + " " + (y1 + rOut) +
                            " L " + rightTurnX + " " + (rowGapFloor - rOut) +
                            " Q " + rightTurnX + " " + rowGapFloor + ", " + (rightTurnX - rOut) + " " + rowGapFloor +
                            " L " + (leftEntryX + rOut) + " " + rowGapFloor +
                            " Q " + leftEntryX + " " + rowGapFloor + ", " + leftEntryX + " " + (rowGapFloor + rOut) +
                            " L " + leftEntryX + " " + (y2 - rOut) +
                            " Q " + leftEntryX + " " + y2 + ", " + (leftEntryX + rOut) + " " + y2 +
                            " L " + x2 + " " + y2;
                    }
                    path.setAttribute("d", d);
                    return path;
                }

                function createJunctionDotElement(x, y, status) {
                    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                    var statusCls = getFlowStatusClass(status, status);
                    if (status === "IN_PROGRESS" || statusCls === "flow-in-progress") {
                        var pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        pulse.setAttribute("class", "flow-junction-pulse");
                        pulse.setAttribute("cx", x);
                        pulse.setAttribute("cy", y);
                        pulse.setAttribute("r", "7");
                        g.appendChild(pulse);
                    }
                    var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute("class", "flow-junction-dot " + statusCls);
                    circle.setAttribute("cx", x);
                    circle.setAttribute("cy", y);
                    circle.setAttribute("r", "4");
                    g.appendChild(circle);
                    return g;
                }

                window.toggleParallelStack = function(triggerEl, ev) {
                    if (ev) {
                        if (ev.stopPropagation) ev.stopPropagation();
                        if (ev.preventDefault) ev.preventDefault();
                    }
                    var stack = triggerEl.closest('.parallel-stack');
                    if (!stack) return;
                    stack.classList.toggle('is-collapsed');
                    var isCollapsed = stack.classList.contains('is-collapsed');
                    var toggleBtn = stack.querySelector('.parallel-toggle-btn');
                    if (toggleBtn) {
                        toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
                        toggleBtn.title = isCollapsed ? 'Expand parallel branches' : 'Collapse parallel branches';
                    }
                    scheduleDrawFlowConnectors();
                };

                var flowConnectorRaf = null;

                function scheduleDrawFlowConnectors() {
                    if (flowConnectorRaf !== null) return;
                    var frameScheduler = window.requestAnimationFrame || function(callback) { return window.setTimeout(callback, 16); };
                    flowConnectorRaf = frameScheduler(function() {
                        flowConnectorRaf = null;
                        drawFlowConnectors();
                    });
                }

                function drawFlowConnectors() {
                    var flow = document.getElementById("pipeline-flow");
                    var canvas = document.getElementById("pipeline-flow-canvas") || flow;
                    var svg = document.getElementById("pipeline-flow-svg");
                    if (!flow || !canvas || !svg) return;

                    while (svg.firstChild) {
                        svg.removeChild(svg.firstChild);
                    }

                    // Reset SVG size before measuring natural canvas dimensions so stale dimensions from a previous layout mode never inflate scrollWidth/scrollHeight
                    svg.setAttribute("width", "0");
                    svg.setAttribute("height", "0");
                    svg.style.width = "0px";
                    svg.style.height = "0px";

                    var width = (currentLayoutMode === "wrap")
                        ? Math.max(canvas.clientWidth, canvas.scrollWidth)
                        : Math.max(canvas.offsetWidth, canvas.scrollWidth);
                    var height = Math.max(canvas.offsetHeight, canvas.scrollHeight);
                    svg.setAttribute("width", width);
                    svg.setAttribute("height", height);
                    svg.style.width = width + "px";
                    svg.style.height = height + "px";

                    var canvasRect = canvas.getBoundingClientRect();
                    var zoom = currentZoom || 1.0;

                    function getNodeAnchor(el, side, fallbackStatus) {
                        var r = el.getBoundingClientRect();
                        var x = (side === "right")
                            ? (r.right - canvasRect.left) / zoom
                            : (r.left - canvasRect.left) / zoom;
                        var y = ((r.top - canvasRect.top) + (r.height / 2)) / zoom;
                        var bottomY = (r.bottom - canvasRect.top) / zoom;
                        var status = el.getAttribute("data-status") || fallbackStatus || "SUCCESS";
                        return { x: x, y: y, bottomY: bottomY, status: status };
                    }

                    var columns = Array.from(canvas.querySelectorAll(".stage-column"));
                    if (columns.length === 0) return;

                    // Group stage-columns into visual flex rows to detect row breaks and route wrap connectors safely below all cards and parallel stacks
                    var visualRows = [];
                    var curRow = [];
                    for (var c = 0; c < columns.length; c++) {
                        if (curRow.length > 0) {
                            var prevR = columns[c - 1].getBoundingClientRect();
                            var thisR = columns[c].getBoundingClientRect();
                            if (thisR.left < prevR.left - 10) {
                                visualRows.push(curRow);
                                curRow = [];
                            }
                        }
                        curRow.push(columns[c]);
                    }
                    if (curRow.length > 0) {
                        visualRows.push(curRow);
                    }

                    var colRowMap = new Map();
                    for (var rIdx = 0; rIdx < visualRows.length; rIdx++) {
                        for (var cIdx = 0; cIdx < visualRows[rIdx].length; cIdx++) {
                            colRowMap.set(visualRows[rIdx][cIdx], rIdx);
                        }
                    }

                    function getVisualRowBottom(rIdx) {
                        if (rIdx < 0 || rIdx >= visualRows.length) return 0;
                        var maxB = 0;
                        var rowCols = visualRows[rIdx];
                        for (var j = 0; j < rowCols.length; j++) {
                            var rect = rowCols[j].getBoundingClientRect();
                            var b = (rect.bottom - canvasRect.top) / zoom;
                            if (b > maxB) maxB = b;
                            var childElements = rowCols[j].querySelectorAll(".stage-node, .parallel-stack");
                            for (var ce = 0; ce < childElements.length; ce++) {
                                var cr = childElements[ce].getBoundingClientRect();
                                var cb = (cr.bottom - canvasRect.top) / zoom;
                                if (cb > maxB) maxB = cb;
                            }
                        }
                        return maxB;
                    }

                    function getVisualRowTop(rIdx) {
                        if (rIdx < 0 || rIdx >= visualRows.length) return 0;
                        var minT = Infinity;
                        var rowCols = visualRows[rIdx];
                        for (var j = 0; j < rowCols.length; j++) {
                            var rect = rowCols[j].getBoundingClientRect();
                            var t = (rect.top - canvasRect.top) / zoom;
                            if (t < minT) minT = t;
                            var childElements = rowCols[j].querySelectorAll(".stage-node, .parallel-stack");
                            for (var ce = 0; ce < childElements.length; ce++) {
                                var cr = childElements[ce].getBoundingClientRect();
                                var ct = (cr.top - canvasRect.top) / zoom;
                                if (ct < minT) minT = ct;
                            }
                        }
                        return minT === Infinity ? 0 : minT;
                    }

                    function getWrapCorridorFloor(currCol, nextCol) {
                        var rSrc = colRowMap.has(currCol) ? colRowMap.get(currCol) : 0;
                        var rTgt = colRowMap.has(nextCol) ? colRowMap.get(nextCol) : rSrc + 1;
                        var srcBottom = getVisualRowBottom(rSrc);
                        var tgtTop = getVisualRowTop(rTgt);
                        if (tgtTop > srcBottom + 12) {
                            return (srcBottom + tgtTop) / 2;
                        }
                        return srcBottom + 26;
                    }

                    // Parallel stages are a barrier: all incoming branches converge before
                    // the next column starts, and all outgoing branches fan out afterwards.
                    // Keeping the shared junction explicit avoids the N x M edge explosion
                    // that made two large parallel groups unreadable.
                    function getColumnAnchor(colElement, side) {
                        var parallelStack = colElement.querySelector(".parallel-stack");
                        if (parallelStack) {
                            var r = parallelStack.getBoundingClientRect();
                            var x = (side === "right")
                                ? (r.right - canvasRect.left) / zoom
                                : (r.left - canvasRect.left) / zoom;
                            var y = ((r.top - canvasRect.top) + (r.height / 2)) / zoom;
                            var bottomY = (r.bottom - canvasRect.top) / zoom;
                            var status = parallelStack.getAttribute("data-status") || "SUCCESS";
                            return { x: x, y: y, bottomY: bottomY, status: status, isParallel: true, el: parallelStack };
                        }
                        var card = colElement.querySelector(".stage-node");
                        if (card) {
                            var r = card.getBoundingClientRect();
                            var x = (side === "right")
                                ? (r.right - canvasRect.left) / zoom
                                : (r.left - canvasRect.left) / zoom;
                            var y = ((r.top - canvasRect.top) + (r.height / 2)) / zoom;
                            var bottomY = (r.bottom - canvasRect.top) / zoom;
                            var status = card.getAttribute("data-status") || "SUCCESS";
                            return { x: x, y: y, bottomY: bottomY, status: status, isParallel: false, el: card };
                        }
                        var r = colElement.getBoundingClientRect();
                        var x = (side === "right")
                            ? (r.right - canvasRect.left) / zoom
                            : (r.left - canvasRect.left) / zoom;
                        var y = ((r.top - canvasRect.top) + (r.height / 2)) / zoom;
                        var bottomY = (r.bottom - canvasRect.top) / zoom;
                        return { x: x, y: y, bottomY: bottomY, status: "SUCCESS", isParallel: false, el: colElement };
                    }

                    // 1. Connect Start Node to First Column
                    var startNode = document.getElementById("terminal-node-start");
                    if (startNode) {
                        var startCircle = startNode.querySelector(".terminal-circle") || startNode;
                        var startAnchor = getNodeAnchor(startCircle, "right", "SUCCESS");
                        var firstColAnchor = getColumnAnchor(columns[0], "left");
                        svg.appendChild(createFlowPathElement(startAnchor.x, startAnchor.y, firstColAnchor.x, firstColAnchor.y, "SUCCESS", firstColAnchor.status, startAnchor.bottomY));
                        if (firstColAnchor.isParallel) {
                            svg.appendChild(createJunctionDotElement(firstColAnchor.x, firstColAnchor.y, firstColAnchor.status));
                        }
                    }

                    // 2. Connect Columns to Columns
                    for (var i = 0; i < columns.length - 1; i++) {
                        var colCurr = columns[i];
                        var colNext = columns[i + 1];

                        var src = getColumnAnchor(colCurr, "right");
                        var tgt = getColumnAnchor(colNext, "left");
                        var wrapFloor = getWrapCorridorFloor(colCurr, colNext);

                        if (src.isParallel) {
                            svg.appendChild(createJunctionDotElement(src.x, src.y, src.status));
                        }

                        svg.appendChild(createFlowPathElement(src.x, src.y, tgt.x, tgt.y, src.status, tgt.status, src.bottomY, wrapFloor));

                        if (tgt.isParallel) {
                            svg.appendChild(createJunctionDotElement(tgt.x, tgt.y, tgt.status));
                        }
                    }

                    // 3. Connect Last Column to End Node
                    var endNode = document.getElementById("terminal-node-end");
                    if (endNode) {
                        var endCircle = endNode.querySelector(".terminal-circle") || endNode;
                        var endStatus = endNode.getAttribute("data-status") || "SUCCESS";
                        var endAnchor = getNodeAnchor(endCircle, "left", endStatus);
                        var lastColAnchor = getColumnAnchor(columns[columns.length - 1], "right");
                        if (lastColAnchor.isParallel) {
                            svg.appendChild(createJunctionDotElement(lastColAnchor.x, lastColAnchor.y, lastColAnchor.status));
                        }
                        var endWrapFloor = undefined;
                        if (endAnchor.x < lastColAnchor.x) {
                            var lastR = colRowMap.has(columns[columns.length - 1]) ? colRowMap.get(columns[columns.length - 1]) : visualRows.length - 1;
                            var lastB = getVisualRowBottom(lastR);
                            var endT = (endCircle.getBoundingClientRect().top - canvasRect.top) / zoom;
                            endWrapFloor = (endT > lastB + 12) ? (lastB + endT) / 2 : lastB + 26;
                        }
                        svg.appendChild(createFlowPathElement(lastColAnchor.x, lastColAnchor.y, endAnchor.x, endAnchor.y, lastColAnchor.status, endStatus, lastColAnchor.bottomY, endWrapFloor));
                    }
                }

                if (!window._horizonResizeBound) {
                    window._horizonResizeBound = true;
                    window.addEventListener("resize", function() {
                        scheduleDrawFlowConnectors();
                    });
                }

                function handleStageKeyNav(e, stageId) {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        var allStages = Array.from(document.querySelectorAll('.stage-node'));
                        var currentIndex = allStages.findIndex(function(el) { return el.id === 'stage-card-' + stageId; });
                        if (currentIndex !== -1 && currentIndex < allStages.length - 1) {
                            allStages[currentIndex + 1].focus();
                            selectStage(allStages[currentIndex + 1].id.replace('stage-card-', ''));
                        }
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        var allStages = Array.from(document.querySelectorAll('.stage-node'));
                        var currentIndex = allStages.findIndex(function(el) { return el.id === 'stage-card-' + stageId; });
                        if (currentIndex > 0) {
                            allStages[currentIndex - 1].focus();
                            selectStage(allStages[currentIndex - 1].id.replace('stage-card-', ''));
                        }
                    } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectStage(stageId);
                    }
                }

                function handleStepKeyNav(e, stepId, stepName) {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        var allSteps = Array.from(document.querySelectorAll('.step-item'));
                        var currentIndex = allSteps.findIndex(function(el) { return el.id === 'step-item-' + stepId; });
                        if (currentIndex !== -1 && currentIndex < allSteps.length - 1) {
                            allSteps[currentIndex + 1].focus();
                            allSteps[currentIndex + 1].click();
                        }
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        var allSteps = Array.from(document.querySelectorAll('.step-item'));
                        var currentIndex = allSteps.findIndex(function(el) { return el.id === 'step-item-' + stepId; });
                        if (currentIndex > 0) {
                            allSteps[currentIndex - 1].focus();
                            allSteps[currentIndex - 1].click();
                        }
                    } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectStep(stepId, stepName);
                    }
                }

                function renderStageCard(stage, parentStage, parentParallelDur) {
                    var status = stage.status || "SUCCESS";
                    var icon = ICON_SUCCESS;
                    if (status === "FAILED" || status === "FAILURE") icon = ICON_FAILED;
                    else if (status === "UNSTABLE") icon = ICON_UNSTABLE;
                    else if (status === "ABORTED") icon = ICON_ABORTED;
                    else if (status === "PAUSED_INPUT") icon = ICON_PAUSED_INPUT;
                    else if (status === "IN_PROGRESS") icon = ICON_IN_PROGRESS;
                    else if (status.indexOf("SKIPPED") !== -1 || status === "NOT_EXECUTED") icon = ICON_SKIPPED;

                    var isSelected = (selectedStageId === stage.id);
                    var selectedClass = isSelected ? " selected" : "";
                    var optionalClass = stage.optional ? " is-optional" : "";
                    var agentStr = stage.agent ? stage.agent : "Built-In Node";

                    var isSkipped = (status.indexOf("SKIPPED") !== -1 || status === "NOT_EXECUTED" || (stage.pauseDurationMillis === -1));
                    var isParallelChild = (parentStage != null && parentParallelDur > 0);
                    var pctOfTotal = (totalPipelineDuration > 0 && stage.durationMillis > 0)
                        ? Math.round((stage.durationMillis / totalPipelineDuration) * 100)
                        : 0;
                    var pctOfPar = isParallelChild
                        ? Math.round((stage.durationMillis / parentParallelDur) * 100)
                        : 0;
                    var pctOfStages = (totalActiveStageTimeMs > 0 && stage.durationMillis > 0)
                        ? Math.round((stage.durationMillis / totalActiveStageTimeMs) * 100)
                        : 0;

                    var isBottleneck = (!isSkipped && stage.id === longestStageId && maxStageDuration >= 500 && (isParallelChild ? pctOfPar : pctOfStages) >= 5);

                    var durationTooltip = "";
                    var durationLabelHtml = "";
                    var barWidthPct = 0;

                    if (isSkipped) {
                        durationTooltip = "Stage was skipped" + (stage.durationMillis > 0 ? (" (evaluated in " + formatDuration(stage.durationMillis) + ")") : "");
                        durationLabelHtml = formatDuration(stage.durationMillis);
                        barWidthPct = 0;
                    } else if (isParallelChild) {
                        durationTooltip = "Duration: " + formatDuration(stage.durationMillis) + " (" + pctOfPar + "% of parallel stage, " + pctOfTotal + "% of total build)";
                        durationLabelHtml = formatDuration(stage.durationMillis) + (pctOfPar > 0 ? (' <span class="stage-pct-pill parallel" title="' + pctOfPar + '% of parallel stage, ' + pctOfTotal + '% of total build">' + pctOfPar + '% parallel</span>') : '');
                        barWidthPct = Math.min(100, Math.max(3, pctOfPar));
                    } else {
                        durationTooltip = "Duration: " + formatDuration(stage.durationMillis) + (pctOfStages > 0 ? (" (" + pctOfStages + "% of stage execution time, " + pctOfTotal + "% of total build)") : "");
                        durationLabelHtml = formatDuration(stage.durationMillis) + (pctOfStages > 0 ? (' <span class="stage-pct-pill total" title="' + pctOfStages + '% of stage execution time, ' + pctOfTotal + '% of total build">' + pctOfStages + '%</span>') : '');
                        barWidthPct = Math.min(100, Math.max(3, pctOfStages));
                    }

                    var a11yLabel = "Stage: " + stage.name + (stage.optional ? " (Optional)" : "") + (isBottleneck ? " (Bottleneck stage)" : "") + ", Status: " + status + ", " + durationTooltip + (stage.agent ? ", Agent: " + stage.agent : "") + (stage.skipReason ? ", " + stage.skipReason : "");

                    var optionalBadge = stage.optional ? '<span class="stage-badge-optional" title="Optional stage: Allowed to fail without failing the pipeline">OPTIONAL</span>' : '';
                    var bottleneckBadge = isBottleneck
                        ? '<span class="stage-bottleneck-badge" title="Bottleneck stage: Took ' + formatDuration(stage.durationMillis) + ' (' + pctOfTotal + '% of total run)">' + ICON_BOLT + 'Longest</span>'
                        : '';
                    var isMatrixCell = !!(stage.matrix || (stage.matrixCell && stage.matrixCell.length > 0));
                    var isMultiStageMatrixCell = isMatrixCell && stage.matrixShortAxes && stage.name !== stage.matrixShortAxes && stage.name.indexOf('\u2192') !== -1;
                    var matrixPillsHtml = "";
                    if (stage.matrixShortAxes && stage.name !== stage.matrixShortAxes) {
                        var axesParts = stage.matrixShortAxes.split(" · ");
                        matrixPillsHtml = '<div class="stage-matrix-pills" title="' + escapeHtml(stage.matrixCell || stage.matrixShortAxes) + '">';
                        for (var ap = 0; ap < axesParts.length; ap++) {
                            if (ap > 0) matrixPillsHtml += '<span class="matrix-pill-dot" aria-hidden="true">·</span>';
                            matrixPillsHtml += '<span class="matrix-axis-pill">' + escapeHtml(axesParts[ap]) + '</span>';
                        }
                        matrixPillsHtml += '</div>';
                    }
                    var subStageBadge = (stage.branchName && stage.branchName !== stage.name && !isMatrixCell)
                        ? '<span class="stage-badge-substage" title="Sub-stage flow: ' + escapeHtml(stage.branchName) + '">' + escapeHtml(stage.branchName) + '</span>'
                        : (isMultiStageMatrixCell
                            ? '<span class="stage-badge-substage" title="Cell stages: ' + escapeHtml(stage.name) + '">' + escapeHtml(stage.name) + '</span>'
                            : '');
                    var currentAttr = isSelected ? ' aria-current="step"' : '';
                    var card = '<div id="stage-card-' + stage.id + '" data-status="' + status + '" class="stage-node status-' + status + optionalClass + selectedClass + '" role="button" tabindex="0" aria-pressed="' + (isSelected ? 'true' : 'false') + '"' + currentAttr + ' aria-label="' + a11yLabel.replace(/"/g, '&quot;') + '" onclick="selectStage(\'' + stage.id + '\')" onkeydown="handleStageKeyNav(event, \'' + stage.id + '\')">';
                    card += '<div class="stage-selected-pill" aria-hidden="true"><span class="stage-selected-pill-dot"></span>Viewing</div>';
                    card += '<div class="stage-active-strip" aria-hidden="true"></div>';
                    card += '<div class="stage-drawer-pointer" aria-hidden="true"></div>';
                    card += '<div class="stage-header">';
                    if (isMultiStageMatrixCell) {
                        card += '<div class="stage-title-wrap">' + matrixPillsHtml + optionalBadge + bottleneckBadge + subStageBadge + '</div>';
                    } else {
                        card += '<div class="stage-title-wrap"><div class="stage-name" title="' + stage.name.replace(/"/g, '&quot;') + '">' + stage.name + '</div>' + optionalBadge + bottleneckBadge + subStageBadge + matrixPillsHtml + '</div>';
                    }
                    card += '<div class="stage-card-actions">';
                    card += '<span class="stage-status-icon" title="Stage status: ' + status + '">' + icon + '</span>';
                    var escapedStageName = stage.name.replace(/'/g, "\\'");
                    card += '<button class="stage-card-link-btn" title="Copy direct link to stage: ' + stage.name.replace(/"/g, '&quot;') + '" onclick="event.stopPropagation(); copyStageCardLink(\'' + stage.id + '\', \'' + escapedStageName + '\')" aria-label="Copy direct link to stage ' + stage.name.replace(/"/g, '&quot;') + '">';
                    card += '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
                    card += '</button>';
                    if (stage.restartable) {
                        var targetRestartName = stage.name;
                        if (graphData && graphData.restartableStages && graphData.restartableStages.indexOf(targetRestartName) === -1) {
                            var parentInfo = findStageAndParent(graphData.stages, stage.id);
                            if (parentInfo && parentInfo.parent && graphData.restartableStages.indexOf(parentInfo.parent.name) !== -1) {
                                targetRestartName = parentInfo.parent.name;
                            }
                        }
                        var escapedTargetRestartName = targetRestartName.replace(/'/g, "\\'");
                        card += '<button class="stage-card-restart-btn" title="Restart pipeline from stage: ' + targetRestartName.replace(/"/g, '&quot;') + '" onclick="event.stopPropagation(); triggerRestartStage(\'' + escapedTargetRestartName + '\')" aria-label="Restart pipeline from stage ' + targetRestartName.replace(/"/g, '&quot;') + '">';
                        card += '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
                        card += '</button>';
                    }
                    card += '</div>';
                    card += '</div>';
                    var variancePillHtml = "";
                    var hasMeaningfulVariance = stage.formattedVariance &&
                        stage.formattedVariance !== '+0%' &&
                        stage.formattedVariance !== '-0%' &&
                        stage.formattedVariance !== '0%' &&
                        ((stage.durationMillis || 0) >= 500 || (stage.avgDurationMillis || 0) >= 500);
                    if (hasMeaningfulVariance) {
                        var stIsSpike = !!(stage.isSpike || stage.spike);
                        var stIsFaster = !!(stage.isFaster || stage.faster);
                        var vClass = stIsSpike ? "spike" : (stIsFaster ? "faster" : "neutral");
                        var vIcon = stIsSpike ? ICON_TREND_UP : (stIsFaster ? ICON_TREND_DOWN : "");
                        var vTitle = stIsSpike
                            ? ("Duration Spike: " + stage.formattedVariance + " vs avg " + formatDuration(stage.avgDurationMillis))
                            : (stIsFaster
                                ? ("Faster: " + stage.formattedVariance.replace('-', '') + " vs avg " + formatDuration(stage.avgDurationMillis))
                                : ("Historical avg: " + formatDuration(stage.avgDurationMillis)));
                        variancePillHtml = ' <span class="stage-variance-pill ' + vClass + '" title="' + vTitle.replace(/"/g, '&quot;') + '">' + vIcon + stage.formattedVariance + '</span>';
                    }

                    var escapedAgent = agentStr.replace(/'/g, "\\'");
                    var hasMultipleAgents = !!(graphData && graphData.agentsUsed && graphData.agentsUsed.length > 1);
                    var hasAgentWaitInfo = !!(stage.isWaitingForAgent || (stage.agentAllocationMillis && stage.agentAllocationMillis >= 500));

                    card += '<div class="stage-body">';
                    card += '<div class="stage-meta-row">';
                    card += '<span>Duration:</span><strong class="stage-duration-val" title="' + durationTooltip.replace(/"/g, '&quot;') + '">' + durationLabelHtml + '</strong>' + variancePillHtml;
                    card += '</div>';
                    if (hasMultipleAgents || hasAgentWaitInfo) {
                        card += '<div class="stage-meta-row">';
                        card += '<span>Agent:</span><span class="stage-agent-badge" title="Agent: ' + agentStr.replace(/"/g, '&quot;') + ' \u2014 Click for agent details" onclick="event.stopPropagation(); openAgentModal(\'' + stage.id + '\', \'' + escapedAgent + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openAgentModal(\'' + stage.id + '\', \'' + escapedAgent + '\');}" role="button" tabindex="0" aria-label="View agent details for ' + agentStr.replace(/"/g, '&quot;') + '">' + ICON_SERVER + agentStr + '</span>';
                        if (stage.isWaitingForAgent) {
                            var waitReason = stage.agentQueueReason || "Waiting for agent executor...";
                            card += ' <span class="stage-agent-waiting-chip" title="' + waitReason.replace(/"/g, '&quot;') + '">' + ICON_HOURGLASS + 'Waiting for Agent</span>';
                        } else if (stage.agentAllocationMillis && stage.agentAllocationMillis >= 500) {
                            card += ' <span class="stage-agent-alloc-chip" title="Agent allocation wait: ' + (stage.formattedAgentAllocation || formatDuration(stage.agentAllocationMillis)) + ' (' + stage.agentAllocationMillis + 'ms)">Alloc: ' + (stage.formattedAgentAllocation || formatDuration(stage.agentAllocationMillis)) + '</span>';
                        }
                        card += '</div>';
                    }

                    if (stage.skippedStepsCount && stage.skippedStepsCount > 0) {
                        card += '<div class="stage-meta-row" style="margin-top:2px;">';
                        card += '<span class="stage-skipped-steps-badge" title="' + stage.skippedStepsCount + ' step(s) were skipped in this stage">' + ICON_SKIPPED + stage.skippedStepsCount + ' skipped</span>';
                        card += '</div>';
                    }

                    if (stage.hasArtifacts && stage.artifactCount > 0) {
                        card += '<div class="stage-meta-row" style="margin-top:2px;">';
                        card += '<span class="stage-artifacts-badge" title="' + stage.artifactCount + ' artifact(s) generated by this stage \u2014 click to view in modal" onclick="event.stopPropagation(); openArtifactsModal(\'' + stage.id + '\')">';
                        card += '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:3px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
                        card += stage.artifactCount + ' artifacts';
                        card += '</span></div>';
                    }

                    // Compact density metric & agent rows (Option B: clean layout without redundant bar)
                    var compactDurationHtml = "";
                    if (isSkipped) {
                        compactDurationHtml = '<span class="stage-compact-duration" title="' + durationTooltip.replace(/"/g, '&quot;') + '">' + formatDuration(stage.durationMillis) + '</span>' +
                            '<span class="stage-pct-pill skipped" title="' + durationTooltip.replace(/"/g, '&quot;') + '">skipped</span>';
                    } else if (isParallelChild) {
                        compactDurationHtml = '<span class="stage-compact-duration" title="' + durationTooltip.replace(/"/g, '&quot;') + '">' + formatDuration(stage.durationMillis) + '</span>' +
                            (pctOfPar > 0 ? ('<span class="stage-pct-pill parallel" title="' + pctOfPar + '% of parallel stage, ' + pctOfTotal + '% of total build">' + pctOfPar + '% parallel</span>') : '');
                    } else {
                        compactDurationHtml = '<span class="stage-compact-duration" title="' + durationTooltip.replace(/"/g, '&quot;') + '">' + formatDuration(stage.durationMillis) + '</span>' +
                            (pctOfStages > 0 ? ('<span class="stage-pct-pill total" title="' + pctOfStages + '% of stage execution time, ' + pctOfTotal + '% of total build">' + pctOfStages + '%</span>') : '');
                    }

                    card += '<div class="stage-compact-metric-row">';
                    card += compactDurationHtml + variancePillHtml;
                    card += '</div>';

                    var displayAgent = stage.agent ? stage.agent : 'Built-in';
                    if (hasMultipleAgents || hasAgentWaitInfo || (stage.hasArtifacts && stage.artifactCount > 0)) {
                        card += '<div class="stage-compact-agent-row">';
                        if (hasMultipleAgents || hasAgentWaitInfo) {
                            card += '<span class="stage-agent-badge" style="max-width:125px;" title="Agent: ' + agentStr.replace(/"/g, '&quot;') + ' \u2014 Click for agent details" onclick="event.stopPropagation(); openAgentModal(\'' + stage.id + '\', \'' + escapedAgent + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openAgentModal(\'' + stage.id + '\', \'' + escapedAgent + '\');}" role="button" tabindex="0" aria-label="View agent details for ' + agentStr.replace(/"/g, '&quot;') + '">' + ICON_SERVER + displayAgent + '</span>';
                        }
                        if (stage.isWaitingForAgent) {
                            var waitReasonCompact = stage.agentQueueReason || "Waiting for agent executor...";
                            card += ' <span class="stage-agent-waiting-chip" style="font-size:0.64rem; padding:0 4px;" title="' + waitReasonCompact.replace(/"/g, '&quot;') + '">' + ICON_HOURGLASS + 'Wait</span>';
                        } else if (stage.agentAllocationMillis && stage.agentAllocationMillis >= 500) {
                            card += ' <span class="stage-agent-alloc-chip" style="font-size:0.64rem; padding:0 4px;" title="Agent allocation wait: ' + (stage.formattedAgentAllocation || formatDuration(stage.agentAllocationMillis)) + '">Alloc: ' + (stage.formattedAgentAllocation || formatDuration(stage.agentAllocationMillis)) + '</span>';
                        }
                        if (stage.hasArtifacts && stage.artifactCount > 0) {
                            card += '<span class="stage-artifacts-badge" style="padding:0 4px;" title="' + stage.artifactCount + ' artifacts" onclick="event.stopPropagation(); openArtifactsModal(\'' + stage.id + '\')">';
                            card += '<svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> ' + stage.artifactCount;
                            card += '</span>';
                        }
                        card += '</div>';
                    }

                    if (stage.skipReason) {
                        card += '<div class="stage-skip-reason" title="' + stage.skipReason.replace(/"/g, '&quot;') + '">' + ICON_WARNING + stage.skipReason + '</div>';
                    }

                    if (!isSkipped && barWidthPct > 0) {
                        card += '<div class="stage-duration-bar" aria-hidden="true" title="' + durationTooltip.replace(/"/g, '&quot;') + '"><div class="stage-duration-bar-fill" style="width:' + barWidthPct + '%;"></div></div>';
                    }

                    card += '</div></div>';
                    return card;
                }

                function findStage(stages, id) {
                    for (var i = 0; i < stages.length; i++) {
                        if (stages[i].id === id) return stages[i];
                        if (stages[i].children) {
                            for (var c = 0; c < stages[i].children.length; c++) {
                                if (stages[i].children[c].id === id) return stages[i].children[c];
                            }
                        }
                    }
                    return null;
                }

                // --- Deep Linking Engine (URL Hash Synchronization & Line Anchoring) ---
                function parseLineRange(val) {
                    if (!val) return null;
                    var clean = val.toString().replace(/^[lL]/, '');
                    if (clean.indexOf('-') !== -1) {
                        var parts = clean.split('-');
                        var start = parseInt(parts[0].replace(/^[lL]/, ''), 10);
                        var end = parseInt(parts[1].replace(/^[lL]/, ''), 10);
                        if (!isNaN(start) && !isNaN(end)) {
                            return { start: Math.min(start, end), end: Math.max(start, end) };
                        }
                    }
                    var single = parseInt(clean, 10);
                    if (!isNaN(single)) {
                        return { start: single, end: single };
                    }
                    return null;
                }

                function parseUrlHash() {
                    var hashInfo = { stageParam: null, stepParam: null, tabParam: null, lineRange: null };

                    function parseParamString(str) {
                        if (!str) return;
                        if (str.charAt(0) === '#' || str.charAt(0) === '?') str = str.substring(1);
                        if (!str) return;
                        if (str === 'artifacts' || str === 'artifact') {
                            hashInfo.tabParam = 'artifacts';
                            return;
                        }
                        if (str === 'parameters' || str === 'params' || str === 'param') {
                            hashInfo.tabParam = 'parameters';
                            return;
                        }
                        if (str === 'tests' || str === 'test') {
                            hashInfo.tabParam = 'tests';
                            return;
                        }
                        if (str.indexOf('=') !== -1) {
                            var pairs = str.split('&');
                            for (var i = 0; i < pairs.length; i++) {
                                var parts = pairs[i].split('=');
                                var key = decodeURIComponent(parts[0]).trim().toLowerCase();
                                var val = parts.length > 1 ? decodeURIComponent(parts[1]).trim() : '';
                                if (key === 'stage' || key === 's') hashInfo.stageParam = val;
                                else if (key === 'step' || key === 'st') hashInfo.stepParam = val;
                                else if (key === 'l' || key === 'line' || key === 'lines') {
                                    hashInfo.lineRange = parseLineRange(val);
                                }
                                else if (key === 'tab') {
                                    if (val === 'artifacts' || val === 'artifact') hashInfo.tabParam = 'artifacts';
                                    else if (val === 'parameters' || val === 'params' || val === 'param') hashInfo.tabParam = 'parameters';
                                    else if (val === 'tests' || val === 'test') hashInfo.tabParam = 'tests';
                                    else if (val === 'steps') hashInfo.tabParam = 'steps';
                                }
                            }
                        } else {
                            hashInfo.stageParam = decodeURIComponent(str).trim();
                        }
                    }

                    // Query string fallback (?stage=...&step=...&L=...)
                    parseParamString(window.location.search);
                    // Hash parameters override query string (#stage=...&step=...&L=...)
                    parseParamString(window.location.hash);

                    return hashInfo;
                }

                function updateUrlHash(stageId, stepId, lineStart, lineEnd, replace) {
                    if (!stageId) return;
                    var actualReplace = replace;
                    var actualStart = lineStart;
                    var actualEnd = lineEnd;
                    if (typeof lineStart === 'boolean') {
                        actualReplace = lineStart;
                        actualStart = selectedLineStart;
                        actualEnd = selectedLineEnd;
                    }
                    var newHash = '#stage=' + encodeURIComponent(stageId);
                    if (stepId) {
                        newHash += '&step=' + encodeURIComponent(stepId);
                        if (actualStart) {
                            if (actualEnd && actualEnd !== actualStart) {
                                newHash += '&L=' + actualStart + '-' + actualEnd;
                            } else {
                                newHash += '&L=' + actualStart;
                            }
                        }
                    }
                    if (window.location.hash === newHash) return;

                    if (actualReplace || !window.history.pushState) {
                        if (window.history.replaceState) {
                            window.history.replaceState(null, '', newHash);
                        } else {
                            window.location.hash = newHash;
                        }
                    } else {
                        window.history.pushState(null, '', newHash);
                    }
                }

                function isUserViewingLogs() {
                    // 1. Any step accordion item is currently expanded
                    var hasExpandedStep = !!document.querySelector('.step-accordion-item.expanded');
                    // 2. Any active live-tail is currently running
                    var hasActiveTail = false;
                    if (typeof activeLiveTailSteps === 'object' && activeLiveTailSteps) {
                        for (var k in activeLiveTailSteps) {
                            if (activeLiveTailSteps.hasOwnProperty(k) && activeLiveTailSteps[k] !== false) {
                                hasActiveTail = true;
                                break;
                            }
                        }
                    }
                    // 3. User has scrolled down into the drawer / step logs area past the graph
                    var graphEl = document.querySelector('.graph-card') || document.getElementById('pipeline-flow');
                    var isScrolledPastGraph = false;
                    if (graphEl) {
                        var gRect = graphEl.getBoundingClientRect();
                        isScrolledPastGraph = (gRect.bottom <= 200);
                    } else {
                        var currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
                        isScrolledPastGraph = (currentScrollY > 200);
                    }
                    return hasExpandedStep || hasActiveTail || isScrolledPastGraph;
                }

                function scrollStageIntoPipelineView(stageId, smooth) {
                    var flowContainer = document.getElementById('pipeline-flow');
                    var cardEl = document.getElementById('stage-card-' + stageId);
                    if (!flowContainer || !cardEl) return;

                    var containerRect = flowContainer.getBoundingClientRect();
                    var cardRect = cardEl.getBoundingClientRect();
                    var cardRelativeLeft = (cardRect.left - containerRect.left) + flowContainer.scrollLeft;
                    var targetScrollLeft = cardRelativeLeft - (flowContainer.clientWidth / 2) + (cardRect.width / 2);

                    var cardRelativeTop = (cardRect.top - containerRect.top) + flowContainer.scrollTop;
                    var targetScrollTop = cardRelativeTop - (flowContainer.clientHeight / 2) + (cardRect.height / 2);

                    // If the pipeline content fits comfortably inside the container, keep initial view centered without scrolling
                    if (flowContainer.scrollWidth <= flowContainer.clientWidth + 4) {
                        targetScrollLeft = 0;
                    }
                    if (flowContainer.scrollHeight <= flowContainer.clientHeight + 4) {
                        targetScrollTop = 0;
                    }

                    flowContainer.scrollTo({
                        left: Math.max(0, targetScrollLeft),
                        top: Math.max(0, targetScrollTop),
                        behavior: (smooth !== false) ? 'smooth' : 'auto'
                    });
                }

                function scrollWindowToElement(targetEl, block) {
                    if (!targetEl) return;
                    // GUARD: If user is viewing or live-tailing logs down in the drawer,
                    // never yank the window scroll back up to the stage view / graph card!
                    var isGraphTarget = (targetEl.classList && targetEl.classList.contains('graph-card')) ||
                                        targetEl.id === 'pipeline-flow' ||
                                        targetEl.id === 'pipeline-flow-canvas' ||
                                        (targetEl.closest && targetEl.closest('.graph-card'));
                    if (isGraphTarget && isUserViewingLogs()) {
                        return;
                    }
                    var app = document.getElementById('horizon-run-app');
                    var isFullscreen = app && app.classList.contains('mode-fullscreen');
                    var alignBlock = block || 'center';

                    if (isFullscreen && app) {
                        var appRect = app.getBoundingClientRect();
                        var targetRect = targetEl.getBoundingClientRect();
                        var targetRelativeTop = (targetRect.top - appRect.top) + app.scrollTop;
                        var appScrollTop = targetRelativeTop - (app.clientHeight / 2) + (targetEl.offsetHeight / 2);
                        if (alignBlock === 'start') {
                            appScrollTop = targetRelativeTop - 20;
                        }
                        app.scrollTo({
                            top: Math.max(0, appScrollTop),
                            behavior: 'smooth'
                        });
                    } else {
                        var targetRect = targetEl.getBoundingClientRect();
                        var currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
                        var useStart = (alignBlock === 'start') || (targetEl.offsetHeight > window.innerHeight * 0.6);
                        var targetTop = useStart
                            ? (currentScrollY + targetRect.top - 24)
                            : (currentScrollY + targetRect.top - (window.innerHeight / 2) + (targetEl.offsetHeight / 2));
                        window.scrollTo({
                            top: Math.max(0, targetTop),
                            behavior: 'smooth'
                        });
                    }
                }

                function scrollToStepTargetLine(stepId, lineNum) {
                    var item = document.getElementById('step-item-' + stepId) || document.getElementById('drawer-steps-container');
                    if (item) {
                        scrollWindowToElement(item, 'center');
                    }

                    if (stepId && typeof scrollVirtualTerminalToLine === 'function' && stepTerminalVirtualizers && stepTerminalVirtualizers[stepId]) {
                        scrollVirtualTerminalToLine(stepId, lineNum, 'line');
                        return;
                    }

                    var terminal = document.getElementById('terminal-' + stepId) || document.getElementById('terminal-view');
                    if (!terminal) return;

                    var lineEl = document.getElementById('log-line-' + stepId + '-' + lineNum) || document.getElementById('log-line-' + lineNum);
                    if (!lineEl) {
                        var allLines = terminal.querySelectorAll('.log-line');
                        if (allLines.length > 0) {
                            var clampedIdx = Math.min(Math.max(0, lineNum - 1), allLines.length - 1);
                            lineEl = allLines[clampedIdx];
                        }
                    }

                    if (lineEl) {
                        var termRect = terminal.getBoundingClientRect();
                        var lineRect = lineEl.getBoundingClientRect();
                        var lineRelativeTop = (lineRect.top - termRect.top) + terminal.scrollTop;
                        var targetScrollTop = lineRelativeTop - (terminal.clientHeight / 2) + (lineEl.offsetHeight / 2);

                        terminal.scrollTo({
                            top: Math.max(0, targetScrollTop),
                            behavior: 'smooth'
                        });

                        lineEl.classList.remove('pulse-highlight');
                        void lineEl.offsetWidth;
                        lineEl.classList.add('pulse-highlight');
                        setTimeout(function() {
                            lineEl.classList.remove('pulse-highlight');
                        }, 2800);
                    }
                }

                function scrollToTargetLine(lineNum) {
                    scrollToStepTargetLine(selectedStepId, lineNum);
                }

                function isAutoCopyLineLinkEnabled() {
                    var app = document.getElementById('horizon-run-app');
                    if (app && app.hasAttribute('data-pref-auto-copy')) {
                        return app.getAttribute('data-pref-auto-copy') === 'true';
                    }
                    return localStorage.getItem('horizon_pref_auto_copy') === 'true';
                }

                function selectStepLineRange(stepId, start, end, updateHash, copyLink) {
                    selectedStepId = stepId;
                    selectedLineStart = start;
                    selectedLineEnd = end || start;

                    if (stepId && typeof renderVirtualSlice === 'function' && stepTerminalVirtualizers && stepTerminalVirtualizers[stepId]) {
                        renderVirtualSlice(stepTerminalVirtualizers[stepId]);
                    } else {
                        var allLines = document.querySelectorAll('.inline-terminal-view .log-line, .terminal-view .log-line');
                        allLines.forEach(function(el) {
                            var elStep = el.getAttribute('data-step');
                            var num = parseInt(el.getAttribute('data-line'), 10);
                            if ((!elStep || elStep === stepId) && !isNaN(num) && num >= selectedLineStart && num <= selectedLineEnd) {
                                el.classList.add('selected');
                            } else {
                                el.classList.remove('selected');
                            }
                        });
                    }

                    var shareLabel = document.getElementById('btn-share-label-' + stepId) || document.getElementById('btn-copy-step-link-text');
                    if (shareLabel) {
                        if (selectedLineStart !== null) {
                            if (selectedLineStart === selectedLineEnd) {
                                shareLabel.innerText = "Share L" + selectedLineStart;
                            } else {
                                shareLabel.innerText = "Share L" + selectedLineStart + "-" + selectedLineEnd;
                            }
                        } else {
                            shareLabel.innerText = "Share Step";
                        }
                    }

                    if (updateHash) {
                        updateUrlHash(selectedStageId, stepId, selectedLineStart, selectedLineEnd, true);
                    }

                    if (copyLink) {
                        var baseUrl = window.location.origin + window.location.pathname;
                        var lineParam = (selectedLineStart === selectedLineEnd) ? selectedLineStart : (selectedLineStart + '-' + selectedLineEnd);
                        var link = baseUrl + '#stage=' + encodeURIComponent(selectedStageId) + '&step=' + encodeURIComponent(stepId) + '&L=' + lineParam;
                        var label = (selectedLineStart === selectedLineEnd) ? ("line " + selectedLineStart) : ("lines " + selectedLineStart + "-" + selectedLineEnd);
                        copyTextToClipboard(link, "Link to " + label + " copied!");
                    }
                }

                function selectLineRange(start, end, updateHash, copyLink) {
                    selectStepLineRange(selectedStepId, start, end, updateHash, copyLink);
                }

                function clearLineSelection(updateHash) {
                    selectedLineStart = null;
                    selectedLineEnd = null;
                    if (selectedStepId && typeof renderVirtualSlice === 'function' && stepTerminalVirtualizers && stepTerminalVirtualizers[selectedStepId]) {
                        renderVirtualSlice(stepTerminalVirtualizers[selectedStepId]);
                    } else {
                        var allLines = document.querySelectorAll('.inline-terminal-view .log-line, .terminal-view .log-line');
                        allLines.forEach(function(el) { el.classList.remove('selected'); });
                    }
                    if (selectedStepId) {
                        var shareLabel = document.getElementById('btn-share-label-' + selectedStepId) || document.getElementById('btn-copy-step-link-text');
                        if (shareLabel) shareLabel.innerText = "Share Step";
                    }
                    if (updateHash && selectedStageId) {
                        updateUrlHash(selectedStageId, selectedStepId, null, null, true);
                    }
                }

                function handleLineGutterClick(event, stepIdOrLine, lineNum) {
                    event.stopPropagation();
                    var stepId = selectedStepId;
                    var targetLine = 0;
                    if (typeof lineNum === 'number') {
                        stepId = stepIdOrLine;
                        targetLine = lineNum;
                    } else {
                        targetLine = stepIdOrLine;
                    }

                    selectedStepId = stepId;

                    if (event.shiftKey && selectedLineStart !== null) {
                        var start = Math.min(selectedLineStart, targetLine);
                        var end = Math.max(selectedLineStart, targetLine);
                        selectStepLineRange(stepId, start, end, true, true);
                        for (var l = start; l <= end; l++) {
                            var el = document.getElementById('log-line-' + stepId + '-' + l);
                            if (el) {
                                el.classList.remove('pulse-highlight');
                                void el.offsetWidth;
                                el.classList.add('pulse-highlight');
                                (function(targetEl) {
                                    setTimeout(function() { targetEl.classList.remove('pulse-highlight'); }, 2000);
                                })(el);
                            }
                        }
                    } else {
                        if (selectedLineStart === targetLine && selectedLineEnd === targetLine) {
                            clearLineSelection(true);
                            showToast("Line selection cleared", "info");
                        } else {
                            selectStepLineRange(stepId, targetLine, targetLine, true, true);
                            var lineEl = document.getElementById('log-line-' + stepId + '-' + targetLine);
                            if (lineEl) {
                                lineEl.classList.remove('pulse-highlight');
                                void lineEl.offsetWidth;
                                lineEl.classList.add('pulse-highlight');
                                setTimeout(function() { lineEl.classList.remove('pulse-highlight'); }, 2000);
                            }
                        }
                    }
                }

                function toSlug(str) {
                    if (!str) return '';
                    return str.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                }

                function findStageByParam(stages, param) {
                    if (!stages || !param) return null;
                    var cleanParam = param.toString().trim().toLowerCase();
                    var slugParam = toSlug(param);

                    // 1. Exact ID match
                    for (var i = 0; i < stages.length; i++) {
                        var s = stages[i];
                        if (s.id && s.id.toString() === param) return s;
                        if (s.children) {
                            for (var c = 0; c < s.children.length; c++) {
                                if (s.children[c].id && s.children[c].id.toString() === param) return s.children[c];
                            }
                        }
                    }

                    // 2. Exact Name match (case-insensitive)
                    for (var i = 0; i < stages.length; i++) {
                        var s = stages[i];
                        if (s.name && s.name.toLowerCase() === cleanParam) return s;
                        if (s.children) {
                            for (var c = 0; c < s.children.length; c++) {
                                if (s.children[c].name && s.children[c].name.toLowerCase() === cleanParam) return s.children[c];
                            }
                        }
                    }

                    // 3. Slug Name match
                    for (var i = 0; i < stages.length; i++) {
                        var s = stages[i];
                        if (s.name && toSlug(s.name) === slugParam) return s;
                        if (s.children) {
                            for (var c = 0; c < s.children.length; c++) {
                                if (s.children[c].name && toSlug(s.children[c].name) === slugParam) return s.children[c];
                            }
                        }
                    }
                    return null;
                }

                function findStepByParam(stage, param) {
                    if (!stage || !stage.steps || !param) return null;
                    var cleanParam = param.toString().trim().toLowerCase();
                    var slugParam = toSlug(param);
                    for (var i = 0; i < stage.steps.length; i++) {
                        var st = stage.steps[i];
                        if (st.id && st.id.toString() === param) return st;
                        if (st.displayName && (st.displayName.toLowerCase() === cleanParam || toSlug(st.displayName) === slugParam)) return st;
                    }
                    return null;
                }

                function applyHashSelection(isInitialLoad) {
                    if (!graphData || !graphData.stages || graphData.stages.length === 0) return false;
                    var hashInfo = parseUrlHash();

                    if (hashInfo.tabParam === 'artifacts') {
                        var stObj = hashInfo.stageParam ? findStageByParam(graphData.stages, hashInfo.stageParam) : null;
                        openArtifactsModal(stObj ? stObj.id : null);
                        return true;
                    }

                    if (hashInfo.tabParam === 'parameters') {
                        openParametersModal();
                        return true;
                    }

                    if (hashInfo.tabParam === 'tests') {
                        openTestsModal();
                        return true;
                    }

                    if (!hashInfo.stageParam && !hashInfo.stepParam) {
                        return false;
                    }

                    var targetStage = null;
                    var targetStep = null;

                    if (hashInfo.stageParam) {
                        targetStage = findStageByParam(graphData.stages, hashInfo.stageParam);
                    }

                    // If only step is provided or stage not found by stageParam, search across all stages
                    if (!targetStage && hashInfo.stepParam) {
                        for (var i = 0; i < graphData.stages.length; i++) {
                            var stg = graphData.stages[i];
                            var candList = stg.children ? stg.children : [stg];
                            for (var k = 0; k < candList.length; k++) {
                                var foundSt = findStepByParam(candList[k], hashInfo.stepParam);
                                if (foundSt) {
                                    targetStage = candList[k];
                                    targetStep = foundSt;
                                    break;
                                }
                            }
                            if (targetStage) break;
                        }
                    }

                    if (!targetStage) return false;

                    // If target stage is skipped and currently hidden, uncheck "Hide Skipped"
                    if (hideSkipped && targetStage.status && targetStage.status.indexOf("SKIPPED") !== -1) {
                        var chk = document.getElementById('ctrl-hide-skipped');
                        if (chk) {
                            chk.checked = false;
                            hideSkipped = false;
                            renderGraph(graphData);
                            showToast("Revealed skipped stage referenced by link: " + targetStage.name, "info");
                        }
                    }

                    if (!targetStep && hashInfo.stepParam) {
                        targetStep = findStepByParam(targetStage, hashInfo.stepParam);
                    }

                    selectStage(targetStage.id, true, targetStep ? targetStep.id : null, hashInfo.lineRange);

                    setTimeout(function() {
                        scrollStageIntoPipelineView(targetStage.id, true);
                        var cardEl = document.getElementById('stage-card-' + targetStage.id);
                        if (cardEl) {
                            cardEl.classList.add('deep-link-target');
                            setTimeout(function() { cardEl.classList.remove('deep-link-target'); }, 6800);
                        }

                        if (targetStep) {
                            var stepEl = document.getElementById('step-item-' + targetStep.id);
                            if (stepEl) {
                                stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                stepEl.classList.add('deep-link-target');
                                setTimeout(function() { stepEl.classList.remove('deep-link-target'); }, 6800);
                            }
                        }

                        // Viewport window positioning
                        if (hashInfo.lineRange || hashInfo.stepParam) {
                            var outputTarget = document.querySelector('.log-card') || document.getElementById('drawer-steps-container');
                            if (outputTarget) {
                                scrollWindowToElement(outputTarget, 'center');
                            }
                        } else if (hashInfo.stageParam) {
                            // Only scroll to stage graph on initial permalink load, never when user is viewing/tailing logs
                            if (isInitialLoad && !isUserViewingLogs()) {
                                var graphCard = document.querySelector('.graph-card');
                                if (graphCard) {
                                    scrollWindowToElement(graphCard, 'center');
                                }
                            }
                        }
                    }, 120);

                    if (isInitialLoad && (hashInfo.stageParam || hashInfo.stepParam)) {
                        var targetDesc = targetStage.name + (targetStep ? ' (' + targetStep.displayName + ')' : '');
                        showToast("Jumped to referenced stage: " + targetDesc, "info");
                    }

                    return true;
                }

                function copyTextToClipboard(text, successMsg) {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).then(function() {
                            showToast(successMsg, "success");
                        }).catch(function() {
                            fallbackCopyText(text, successMsg);
                        });
                    } else {
                        fallbackCopyText(text, successMsg);
                    }
                }

                function fallbackCopyText(text, successMsg) {
                    var textArea = document.createElement("textarea");
                    textArea.value = text;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        showToast(successMsg, "success");
                    } catch (err) {
                        showToast("Unable to copy to clipboard", "error");
                    }
                    document.body.removeChild(textArea);
                }

                var stepLogsCache = {};
                var stepLogsOffset = {};
                var stepSearchQueries = {};

                function copyCurrentDeepLink(targetType, stepId) {
                    if (!graphData || !selectedStageId) return;
                    var stage = findStage(graphData.stages, selectedStageId);
                    var stageName = stage ? stage.name : selectedStageId;
                    var baseUrl = window.location.origin + window.location.pathname;

                    var link = "";
                    var msg = "";
                    var effStepId = stepId || selectedStepId;
                    if (targetType === 'stage' || !effStepId) {
                        link = baseUrl + '#stage=' + encodeURIComponent(selectedStageId);
                        msg = "Stage link copied: " + stageName;
                    } else {
                        link = baseUrl + '#stage=' + encodeURIComponent(selectedStageId) + '&step=' + encodeURIComponent(effStepId);
                        var stepObj = stage ? findStepByParam(stage, effStepId) : null;
                        var stepName = stepObj ? (stepObj.displayName || stepObj.name) : effStepId;
                        if (selectedLineStart !== null && (!selectedStepId || selectedStepId === effStepId)) {
                            var lineParam = (selectedLineStart === selectedLineEnd) ? selectedLineStart : (selectedLineStart + '-' + selectedLineEnd);
                            link += '&L=' + lineParam;
                            var lineLabel = (selectedLineStart === selectedLineEnd) ? ("line " + selectedLineStart) : ("lines " + selectedLineStart + "-" + selectedLineEnd);
                            msg = "Step link (" + lineLabel + ") copied: " + stepName;
                        } else {
                            msg = "Step link copied: " + stepName;
                        }
                    }
                    copyTextToClipboard(link, msg);
                }

                function copyStageCardLink(stageId, stageName) {
                    var baseUrl = window.location.origin + window.location.pathname;
                    var link = baseUrl + '#stage=' + encodeURIComponent(stageId);
                    copyTextToClipboard(link, "Stage link copied: " + (stageName || stageId));
                }

                window.addEventListener('hashchange', function() {
                    applyHashSelection(false);
                });

                function selectStage(stageId, skipHistoryUpdate, targetStepId, targetLineRange, isRefresh) {
                    if (window._isGraphDragging) return;
                    var stageChanged = (selectedStageId !== stageId);
                    if (!skipHistoryUpdate && !isRefresh) {
                        // The user picked a stage themselves: stop auto-following the running one.
                        pauseStepFollow(true);
                    }
                    selectedStageId = stageId;
                    if (!isRefresh) {
                        switchDrawerTab('steps');
                        if (stageChanged) {
                            var searchInput = document.getElementById('stage-log-search');
                            if (searchInput) searchInput.value = '';
                            filterStageLogs('');
                        }
                    }
                    // Update visual highlight and ARIA pressed on flow stage cards
                    var nodes = document.querySelectorAll('.stage-node');
                    nodes.forEach(function(n) {
                        n.classList.remove('selected');
                        n.setAttribute('aria-pressed', 'false');
                        n.removeAttribute('aria-current');
                    });
                    var target = document.getElementById('stage-card-' + stageId);
                    if (target) {
                        target.classList.add('selected');
                        target.setAttribute('aria-pressed', 'true');
                        target.setAttribute('aria-current', 'step');
                        if (!isRefresh || stageChanged) {
                            scrollStageIntoPipelineView(stageId, true);
                        }
                    }

                    if (!graphData) return;
                    var stage = findStage(graphData.stages, stageId);
                    if (!stage) return;

                    if (!skipHistoryUpdate) {
                        updateUrlHash(stageId, targetStepId || selectedStepId, false);
                    }

                    renderStageHeaderBanner(stage);
                    renderStepAccordionList(stage, targetStepId, targetLineRange);
                    renderPipelineActionsRestartList();

                    var pickerLabel = document.getElementById('stage-picker-btn-text');
                    if (pickerLabel && stage) {
                        pickerLabel.innerText = stage.name;
                        pickerLabel.title = "Current Stage: " + stage.name + " (Click or press 's' to switch)";
                    }
                    var minPills = document.querySelectorAll('#graph-minimized-strip .graph-min-pill');
                    for (var mp = 0; mp < minPills.length; mp++) {
                        var isThisPill = (minPills[mp].id === 'graph-min-pill-' + stageId);
                        minPills[mp].classList.toggle('is-selected', isThisPill);
                    }
                }

                function renderStageHeaderBanner(stage) {
                    var banner = document.getElementById('stage-header-banner');
                    if (!banner) return;

                    var st = (stage.status || 'UNKNOWN').toUpperCase();
                    var bannerStatusClass = 'status-unknown';
                    var iconSvg = ICON_ACCORDION_SUCCESS;
                    if (st === 'SUCCESS') {
                        bannerStatusClass = 'status-success';
                        iconSvg = ICON_ACCORDION_SUCCESS;
                    } else if (st === 'FAILED' || st === 'FAILURE') {
                        bannerStatusClass = 'status-failed';
                        iconSvg = ICON_ACCORDION_FAILED;
                    } else if (st === 'UNSTABLE') {
                        bannerStatusClass = 'status-unstable';
                        iconSvg = ICON_ACCORDION_UNSTABLE;
                    } else if (st === 'PAUSED_INPUT') {
                        bannerStatusClass = 'status-paused-input';
                        iconSvg = ICON_ACCORDION_PAUSED_INPUT;
                    } else if (st === 'IN_PROGRESS') {
                        bannerStatusClass = 'status-in-progress';
                        iconSvg = ICON_ACCORDION_IN_PROGRESS;
                    } else if (st.indexOf('SKIPPED') !== -1 || st === 'NOT_EXECUTED') {
                        bannerStatusClass = 'status-skipped';
                        iconSvg = ICON_ACCORDION_SKIPPED;
                    } else if (st === 'ABORTED') {
                        bannerStatusClass = 'status-aborted';
                        iconSvg = ICON_ACCORDION_ABORTED;
                    }

                    banner.className = 'stage-header-banner ' + bannerStatusClass;

                    var ajBadge = document.getElementById('stage-banner-autojump-badge');
                    if (ajBadge && !stage._isAutoJump) {
                        ajBadge.style.display = 'none';
                    }

                    var iconEl = document.getElementById('stage-banner-status-icon');
                    if (iconEl) iconEl.innerHTML = iconSvg;

                    var titleEl = document.getElementById('stage-banner-title');
                    if (titleEl) {
                        titleEl.innerText = stage.name;
                        titleEl.title = stage.name;
                    }

                    var skipBadge = document.getElementById('stage-banner-skipped-badge');
                    if (skipBadge) {
                        skipBadge.style.display = (st.indexOf('SKIPPED') !== -1 || st === 'NOT_EXECUTED') ? 'inline-block' : 'none';
                        if (stage.skipReason) skipBadge.title = stage.skipReason;
                    }

                    var optBadge = document.getElementById('stage-banner-optional-badge');
                    if (optBadge) {
                        optBadge.style.display = stage.optional ? 'inline-block' : 'none';
                    }

                    var bottleneckBadge = document.getElementById('stage-banner-bottleneck-badge');
                    var isBottleneck = (stage.id === longestStageId && maxStageDuration >= 500);
                    if (bottleneckBadge) {
                        bottleneckBadge.style.display = isBottleneck ? 'inline-flex' : 'none';
                    }

                    var varBadge = document.getElementById('stage-banner-variance-badge');
                    if (varBadge) {
                        var showBannerVariance = stage.formattedVariance &&
                            stage.formattedVariance !== '+0%' &&
                            stage.formattedVariance !== '-0%' &&
                            stage.formattedVariance !== '0%' &&
                            ((stage.durationMillis || 0) >= 500 || (stage.avgDurationMillis || 0) >= 500);
                        if (showBannerVariance) {
                            var isSpike = !!(stage.isSpike || stage.spike);
                            var isFaster = !!(stage.isFaster || stage.faster);
                            var avgFmt = formatDuration(stage.avgDurationMillis);
                            var trendIcon = isSpike ? ICON_TREND_UP : (isFaster ? ICON_TREND_DOWN : '');
                            var title = isSpike
                                ? ('Duration Spiked by ' + stage.formattedVariance + ' vs historical average (' + avgFmt + ')')
                                : (isFaster ? ('Finished ' + stage.formattedVariance.replace('-', '') + ' faster than historical avg (' + avgFmt + ')') : ('Historical avg: ' + avgFmt));
                            varBadge.className = 'stage-banner-badge ' + (isSpike ? 'stage-badge-variance-spike' : (isFaster ? 'stage-badge-variance-faster' : 'stage-badge-variance-neutral'));
                            varBadge.innerHTML = trendIcon + (isSpike ? ('SPIKE ' + stage.formattedVariance) : (isFaster ? (stage.formattedVariance + ' FASTER') : ('VARIANCE ' + stage.formattedVariance)));
                            varBadge.title = title;
                            varBadge.style.display = 'inline-flex';
                        } else {
                            varBadge.style.display = 'none';
                        }
                    }

                    var durEl = document.getElementById('stage-banner-duration');
                    var durText = document.getElementById('stage-banner-duration-text');
                    if (durEl && durText) {
                        var totalRunDur = totalPipelineDuration || 0;
                        var stgDur = stage.durationMillis || 0;
                        var durPct = (totalRunDur > 0 && stgDur > 0)
                            ? Math.round((stgDur / totalRunDur) * 100)
                            : 0;

                        var parentInfo = (graphData && graphData.stages) ? findStageAndParent(graphData.stages, stage.id) : null;
                        var parentStage = (parentInfo && parentInfo.parent) ? parentInfo.parent : null;

                        var isStageSkipped = (stage.status && stage.status.indexOf('SKIPPED') !== -1) || stage.status === 'NOT_EXECUTED' || stage.pauseDurationMillis === -1;
                        if (parentStage) {
                            var maxChild = 0;
                            if (parentStage.children) {
                                for (var pc = 0; pc < parentStage.children.length; pc++) {
                                    var cd = parentStage.children[pc].durationMillis || 0;
                                    if (cd > maxChild) maxChild = cd;
                                }
                            }
                            var parDur = Math.max(parentStage.durationMillis || 0, maxChild);
                            var parPct = (parDur > 0 && stgDur > 0) ? Math.round((stgDur / parDur) * 100) : 0;

                            if (isStageSkipped) {
                                durText.innerText = formatStepDuration(stgDur) + ' (skipped)';
                                durEl.title = 'Branch was skipped (evaluated in ' + formatStepDuration(stgDur) + ')';
                            } else if (parPct > 0 && durPct > 0) {
                                durText.innerText = formatStepDuration(stgDur) + ' (' + parPct + '% of parallel, ' + durPct + '% of build)';
                                durEl.title = 'Stage Duration: ' + formatStepDuration(stgDur) + ' (' + parPct + '% of parallel stage, ' + durPct + '% of total build)';
                            } else if (durPct > 0) {
                                durText.innerText = formatStepDuration(stgDur) + ' (' + durPct + '% of build)';
                                durEl.title = 'Stage Duration: ' + formatStepDuration(stgDur) + ' (' + durPct + '% of total build)';
                            } else {
                                durText.innerText = formatStepDuration(stgDur);
                                durEl.title = 'Stage Duration: ' + formatStepDuration(stgDur);
                            }
                        } else {
                            var pctOfStages = (totalActiveStageTimeMs > 0 && stgDur > 0) ? Math.round((stgDur / totalActiveStageTimeMs) * 100) : 0;
                            if (isStageSkipped) {
                                durText.innerText = formatStepDuration(stgDur) + ' (skipped)';
                                durEl.title = 'Stage was skipped (evaluated in ' + formatStepDuration(stgDur) + ')';
                            } else if (pctOfStages > 0 && durPct > 0) {
                                durText.innerText = formatStepDuration(stgDur) + ' (' + pctOfStages + '% of stage time, ' + durPct + '% of build)';
                                durEl.title = 'Stage Duration: ' + formatStepDuration(stgDur) + ' (' + pctOfStages + '% of stage execution time, ' + durPct + '% of total build)';
                            } else if (durPct > 0) {
                                durText.innerText = formatStepDuration(stgDur) + ' (' + durPct + '% of build)';
                                durEl.title = 'Stage Duration: ' + formatStepDuration(stgDur) + ' (' + durPct + '% of total build)';
                            } else {
                                durText.innerText = formatStepDuration(stgDur);
                                durEl.title = 'Stage Duration: ' + formatStepDuration(stgDur);
                            }
                        }
                        durEl.style.display = 'inline-flex';
                    }

                    var startEl = document.getElementById('stage-banner-start');
                    var startText = document.getElementById('stage-banner-start-text');
                    if (startEl && startText) {
                        var relTime = formatRelativeTime(stage.startTimeMillis);
                        if (relTime) {
                            startText.innerText = relTime;
                            startEl.style.display = 'inline-flex';
                        } else {
                            startEl.style.display = 'none';
                        }
                    }

                    var agentEl = document.getElementById('stage-banner-agent');
                    var agentText = document.getElementById('stage-banner-agent-text');
                    if (agentEl && agentText) {
                        var agentName = stage.agent || stage.node || '';
                        if (!agentName && stage.status !== 'SKIPPED' && stage.status !== 'NOT_EXECUTED') {
                            agentName = (graphData && graphData.agentsUsed && graphData.agentsUsed.length === 1) ? graphData.agentsUsed[0] : 'Built-In Node';
                        }
                        if (agentName) {
                            agentText.innerText = agentName;
                            agentEl.style.display = 'inline-flex';
                        } else {
                            agentEl.style.display = 'none';
                        }
                    }

                    var restartBtn = document.getElementById('btn-banner-restart');
                    if (restartBtn) {
                        restartBtn.style.display = (stage.restartable) ? 'flex' : 'none';
                    }
                    var artBtn = document.getElementById('btn-banner-artifacts');
                    var artText = document.getElementById('btn-banner-artifacts-text');
                    if (artBtn) {
                        if (stage.hasArtifacts && stage.artifactCount > 0) {
                            artBtn.style.display = 'flex';
                            if (artText) artText.innerText = 'View Artifacts (' + stage.artifactCount + ')';
                        } else {
                            artBtn.style.display = 'none';
                        }
                    }
                    var downloadLogLink = document.getElementById('btn-banner-download-log');
                    if (downloadLogLink) {
                        var safeStageName = (stage.name || 'stage-' + stage.id).replace(/[^a-zA-Z0-9_-]/g, '_');
                        downloadLogLink.href = horizonBaseUrl + 'apiLog?nodeId=' + encodeURIComponent(stage.id) + '&download=true';
                        downloadLogLink.setAttribute('download', safeStageName + '.txt');
                        downloadLogLink.style.display = 'flex';
                    }
                    var plainLogLink = document.getElementById('btn-banner-plain-log');
                    if (plainLogLink) {
                        plainLogLink.href = horizonBaseUrl + 'apiLog?nodeId=' + encodeURIComponent(stage.id);
                        plainLogLink.style.display = 'flex';
                    }
                    var classicLogLink = document.getElementById('btn-banner-classic-log');
                    if (classicLogLink) {
                        classicLogLink.href = runBaseUrl + 'execution/node/' + encodeURIComponent(stage.id) + '/';
                        classicLogLink.style.display = 'flex';
                    }
                }

                var stepFollowOn = true;
                var stepUserToggled = {};
                var stepAutoExpanded = {};
                var collapsedClosures = {};
                var lastFollowedStepId = null;
                var ICON_ACCORDION_CONTAINER_ACTIVE = '<svg class="step-container-ring" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" stroke-dasharray="3.5 3.5"/><circle cx="12" cy="12" r="2.2" fill="#38bdf8" stroke="none"/></svg>';

                function isStepGroup(step) {
                    return !!(step && (step.closure || step.block) && step.childStepsCount > 0);
                }

                function isRunLive() {
                    return !!(graphData && (graphData.building || graphData.result === 'IN_PROGRESS'));
                }

                function isStepActiveStatus(st) {
                    return st === 'IN_PROGRESS' || st === 'PAUSED_INPUT';
                }

                function findStepInStage(stage, stepId) {
                    if (!stage || !stage.steps) return null;
                    for (var i = 0; i < stage.steps.length; i++) {
                        if (stage.steps[i].id === stepId) return stage.steps[i];
                    }
                    return null;
                }

                // Work out which steps are *really* running. A closure (withCredentials, dir, timeout ...)
                // stays IN_PROGRESS for as long as anything inside it runs, so only steps with no running
                // descendant are "current"; their enclosing closures are merely "containers".
                function computeStepRuntime(stage) {
                    var steps = (stage && stage.steps) ? stage.steps : [];
                    var live = isRunLive();
                    var byId = {};
                    var i;
                    for (i = 0; i < steps.length; i++) byId[steps[i].id] = steps[i];

                    var containerActive = {};
                    if (live) {
                        for (i = 0; i < steps.length; i++) {
                            if (isStepActiveStatus((steps[i].status || '').toUpperCase())) {
                                var p = steps[i].parentStepId;
                                var guard = 0;
                                while (p && byId[p] && guard++ < 64) {
                                    containerActive[p] = true;
                                    p = byId[p].parentStepId;
                                }
                            }
                        }
                    }

                    var leaf = {};
                    var leafList = [];
                    var failed = 0;
                    var unstable = 0;
                    var maxLeafDur = 0;
                    var slowestStepId = null;
                    for (i = 0; i < steps.length; i++) {
                        var st = (steps[i].status || '').toUpperCase();
                        if (live && isStepActiveStatus(st) && !containerActive[steps[i].id]) {
                            leaf[steps[i].id] = true;
                            leafList.push(steps[i]);
                        }
                        if (st === 'FAILED' || st === 'FAILURE') failed++;
                        else if (st === 'UNSTABLE') unstable++;
                        if (!isStepGroup(steps[i]) && (steps[i].durationMillis || 0) > maxLeafDur) {
                            maxLeafDur = steps[i].durationMillis || 0;
                            slowestStepId = steps[i].id;
                        }
                    }
                    var stageDur = (stage && stage.durationMillis) ? stage.durationMillis : maxLeafDur;
                    if (steps.length < 4 || maxLeafDur < 500 || maxLeafDur < stageDur * 0.35) {
                        slowestStepId = null;
                    }
                    return {
                        leaf: leaf,
                        containerActive: containerActive,
                        leafList: leafList,
                        current: leafList.length > 0 ? leafList[leafList.length - 1] : null,
                        total: steps.length,
                        failed: failed,
                        unstable: unstable,
                        maxLeafDur: maxLeafDur,
                        slowestStepId: slowestStepId
                    };
                }

                function formatCleanStepArgsPreview(rawArgs, maxLen) {
                    if (!rawArgs) return '';
                    var limit = maxLen || 84;
                    var lines = String(rawArgs).split(/\r?\n/);
                    var meaningful = [];
                    for (var i = 0; i < lines.length; i++) {
                        var ln = lines[i].trim();
                        if (!ln) continue;
                        if (/^(set\s+[+-][euxo]|#!\/)/.test(ln)) continue;
                        if (/^echo\s+["']?[=\-+*#_]{4,}["']?$/i.test(ln)) continue;
                        if (/^[=\-+*#_]{4,}$/.test(ln)) continue;
                        var echoMatch = ln.match(/^echo\s+["'](.+)["']$/);
                        if (echoMatch) {
                            var inner = echoMatch[1].trim();
                            if (/^[=\-+*#_]{4,}$/.test(inner)) continue;
                            ln = inner;
                        }
                        meaningful.push(ln);
                        if (meaningful.length >= 2) break;
                    }
                    var joined = (meaningful.length > 0 ? meaningful.join(' \u00b7 ') : String(rawArgs).replace(/\s+/g, ' ').trim());
                    joined = joined.replace(/[=\-+]{5,}/g, '').replace(/\s+/g, ' ').trim();
                    if (joined.length > limit) {
                        return joined.substring(0, limit - 1) + '\u2026';
                    }
                    return joined;
                }

                function getStepStatusIconHtml(step, rt) {
                    var st = (step.status || 'SUCCESS').toUpperCase();
                    if (rt && rt.containerActive[step.id]) return ICON_ACCORDION_CONTAINER_ACTIVE;
                    if (st === 'FAILED' || st === 'FAILURE') return ICON_ACCORDION_FAILED;
                    if (st === 'UNSTABLE') return ICON_ACCORDION_UNSTABLE;
                    if (st === 'PAUSED_INPUT') return ICON_ACCORDION_PAUSED_INPUT;
                    if (st === 'IN_PROGRESS') return ICON_ACCORDION_IN_PROGRESS;
                    if (st === 'ABORTED') return ICON_ACCORDION_ABORTED;
                    if (st.indexOf('SKIPPED') !== -1 || st === 'NOT_EXECUTED') return ICON_ACCORDION_SKIPPED;
                    return ICON_ACCORDION_SUCCESS;
                }

                function buildStepDurationHtml(step, rt) {
                    if ((step.closure || step.block) && (step.childStepsCount > 0 || (step.durationMillis > 0 && step.selfDurationMillis !== undefined && step.selfDurationMillis < step.durationMillis))) {
                        var totalFmt = formatStepDuration(step.durationMillis);
                        var selfFmt = formatStepDuration(step.selfDurationMillis || 0);
                        var closureTip = 'Closure block total: ' + totalFmt + ' (includes ' + (step.childStepsCount || 'nested') + ' step' + (step.childStepsCount === 1 ? '' : 's') + ') \u00b7 Self execution time: ' + selfFmt;
                        return '<span class="step-duration step-duration-closure" title="' + escapeHtml(closureTip) + '">' +
                               '<span class="step-self-dur">' + selfFmt + ' self</span> ' +
                               '<span class="step-total-dur">(' + totalFmt + ' total)</span>' +
                               '</span>';
                    }
                    var microBarHtml = '';
                    var stepDur = step.durationMillis || 0;
                    if (!isStepGroup(step) && rt && rt.total >= 2 && rt.maxLeafDur >= 100 && stepDur > 0) {
                        var pct = Math.min(100, Math.max(6, Math.round((stepDur / rt.maxLeafDur) * 100)));
                        microBarHtml = '<span class="step-dur-microbar" aria-hidden="true" title="' + pct + '% of slowest step in stage"><span class="step-dur-microbar-fill" style="width:' + pct + '%;"></span></span>';
                    }
                    return microBarHtml + '<span class="step-duration">' + formatStepDuration(step.durationMillis) + '</span>';
                }

                function buildClosureBadgeHtml(step) {
                    if (!(step.closure || step.block)) return '';
                    var n = step.childStepsCount || 0;
                    return '<span class="step-closure-badge" id="step-closure-badge-' + step.id + '" data-count="' + n + '" title="Closure block step enclosing ' + (n || 'nested') + ' step' + (n === 1 ? '' : 's') + '">CLOSURE</span>';
                }

                function buildStepItemHtml(step, stage, rt) {
                    var st = (step.status || 'SUCCESS').toUpperCase();
                    var statusIcon = getStepStatusIconHtml(step, rt);
                    var glyphSvg = getStepGlyph(step);
                    var classicLogUrl = runBaseUrl + 'execution/node/' + encodeURIComponent(step.id) + '/log';

                    var titleStr = step.displayName || step.name || 'Step';
                    var argsStr = (step.arguments && step.arguments !== titleStr) ? step.arguments : '';

                    var optBadge = (step.optional || (step.displayName && step.displayName.toLowerCase().indexOf('optional') !== -1))
                        ? '<span class="stage-banner-badge stage-badge-optional" style="margin-left:0.3rem;">OPT</span>' : '';
                    var pausedBadge = (st === 'PAUSED_INPUT')
                        ? '<button type="button" class="btn-input-proceed" style="padding:2px 8px; font-size:0.68rem; margin-left:0.4rem;" onclick="event.stopPropagation(); openInputApprovalModal(0);">Review Input</button>' : '';
                    var closureBadge = buildClosureBadgeHtml(step);
                    var slowestBadge = (rt && rt.slowestStepId === step.id)
                        ? '<span class="step-slowest-badge" title="Slowest step in this stage (' + formatStepDuration(step.durationMillis) + ')">' + ICON_BOLT + 'SLOWEST</span>'
                        : '';
                    var isRunningLeaf = !!(rt && rt.leaf[step.id]);
                    var livePill = '<span class="step-live-pill" id="step-live-pill-' + step.id + '" style="' + (isRunningLeaf ? '' : 'display:none;') + '"><span class="live-tail-dot"></span>LIVE</span>';

                    var group = isStepGroup(step);
                    var depth = Math.min(step.depth || 0, 4);
                    var rowStyle = (depth > 0) ? ('padding-left:' + (1.0 + (depth * 1.25)) + 'rem;') : '';
                    var treeBranch = (depth > 0)
                        ? '<span class="step-tree-elbow" title="Nested inside enclosing block step"><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 1v9a2 2 0 0 0 2 2h8"/></svg></span>'
                        : '';

                    var itemClasses = 'step-accordion-item' + (group ? ' step-group' : '') +
                        (isRunningLeaf ? ' step-running' : '') +
                        ((rt && rt.containerActive[step.id]) ? ' step-container-active' : '') +
                        (collapsedClosures[step.id] ? ' group-collapsed' : '');

                    var html = '';
                    html += '<div class="' + itemClasses + '" id="step-item-' + step.id + '" data-status="' + st + '" data-parent="' + (step.parentStepId || '') + '" data-depth="' + depth + '">';
                    // Accordion Row
                    html += '<div class="accordion-step-row" id="step-row-' + step.id + '" style="' + rowStyle + '" role="button" tabindex="0" aria-expanded="false" aria-controls="step-log-' + step.id + '" onclick="toggleStepAccordion(\'' + step.id + '\')" onkeydown="handleStepRowKey(event, \'' + step.id + '\')">';
                    html += '<div class="accordion-step-left">';
                    if (treeBranch) {
                        html += treeBranch;
                    }
                    html += '<span class="step-status-icon" id="step-icon-' + step.id + '">' + statusIcon + '</span>';
                    if (glyphSvg) {
                        html += '<span class="step-glyph">' + glyphSvg + '</span>';
                    }
                    html += '<span class="step-title" title="' + escapeHtml(titleStr) + '">' + escapeHtml(titleStr) + '</span>';
                    var cleanArgsPreview = argsStr ? formatCleanStepArgsPreview(argsStr, 84) : '';
                    if (cleanArgsPreview) {
                        html += '<span class="step-args" title="' + escapeHtml(argsStr) + '">' + escapeHtml(cleanArgsPreview) + '</span>';
                    }
                    html += optBadge + pausedBadge + closureBadge + slowestBadge + livePill;
                    html += '<span class="step-chevron"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></span>';
                    html += '</div>';

                    html += '<div class="accordion-step-right">';
                    html += '<span class="step-row-match-badge" id="step-row-match-' + step.id + '" style="display:none;"></span>';
                    html += '<span class="step-dur-wrap" id="step-dur-' + step.id + '">' + buildStepDurationHtml(step, rt) + '</span>';
                    html += '<a href="' + classicLogUrl + '" target="_blank" class="step-external-link" title="Open classic step log in new tab" onclick="event.stopPropagation();">';
                    html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
                    html += '</a>';
                    html += '</div>';
                    html += '</div>';

                    // Step Inline Log (hidden by CSS for closures that merely wrap other steps)
                    var wrapPref = (window._stepWrapLines !== false);
                    var tallPref = !!window._stepTallView;
                    html += '<div class="step-inline-log" id="step-log-' + step.id + '" role="region" aria-label="Console log for ' + escapeHtml(titleStr) + '">';
                    html += '<div class="inline-log-toolbar">';
                    html += '<div class="inline-log-meta-left">';
                    html += '<span class="inline-log-line-count" id="log-count-' + step.id + '">0 lines</span>';
                    html += '<span class="step-match-pill" id="step-match-pill-' + step.id + '" style="display:none;"></span>';
                    html += '<div class="inline-step-filter-wrap">';
                    html += '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
                    html += '<input type="text" class="inline-step-filter-input" id="step-filter-input-' + step.id + '" placeholder="Filter step output..." oninput="filterSingleStepLog(\'' + step.id + '\', this.value)" onclick="event.stopPropagation();" aria-label="Filter output for this step"/>';
                    html += '</div>';
                    html += '</div>';
                    html += '<div class="inline-log-actions">';

                    var isStepActive = isRunLive() && (isStepActiveStatus(st) || (stage && stage.status === 'IN_PROGRESS' && !(st === 'SUCCESS' || st === 'FAILED' || st === 'FAILURE' || st === 'ABORTED' || st === 'UNSTABLE' || st.indexOf('SKIPPED') !== -1 || st === 'NOT_EXECUTED')));
                    if (isStepActive) {
                        html += '<button class="inline-log-btn live-tail-btn live-tail-active" id="btn-tail-step-' + step.id + '" onclick="toggleStepLiveTail(\'' + step.id + '\')" title="Toggle auto-following live log stream"><span class="live-tail-dot"></span><span id="label-tail-step-' + step.id + '">Live Tail</span></button>';
                    }

                    html += '<button type="button" class="inline-log-btn' + (wrapPref ? ' is-active' : '') + '" id="btn-wrap-step-' + step.id + '" onclick="toggleStepWordWrap(\'' + step.id + '\')" title="Toggle word wrapping for long lines">';
                    html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><polyline points="16 16 14 18 16 20"/><line x1="3" y1="18" x2="10" y2="18"/></svg>';
                    html += '<span>Wrap</span></button>';

                    html += '<button type="button" class="inline-log-btn' + (tallPref ? ' is-active' : '') + '" id="btn-tall-step-' + step.id + '" onclick="toggleStepTallView(\'' + step.id + '\')" title="Toggle expanded log viewer height">';
                    html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
                    html += '<span id="label-tall-step-' + step.id + '">' + (tallPref ? 'Compact' : 'Expand') + '</span></button>';

                    html += '<button type="button" class="inline-log-btn" onclick="scrollStepTerminalEdge(\'' + step.id + '\', \'top\')" title="Scroll to top of step output">';
                    html += '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
                    html += '<span>Top</span></button>';

                    html += '<button type="button" class="inline-log-btn" onclick="scrollStepTerminalEdge(\'' + step.id + '\', \'bottom\')" title="Scroll to bottom of step output">';
                    html += '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
                    html += '<span>Bottom</span></button>';

                    html += '<button class="inline-log-btn" id="btn-share-step-' + step.id + '" onclick="copyCurrentDeepLink(\'step\', \'' + step.id + '\')" title="Copy direct link to this step / line">';
                    html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
                    html += '<span id="btn-share-label-' + step.id + '">Share Step</span>';
                    html += '</button>';
                    html += '<button class="inline-log-btn" onclick="copyStepConsoleLog(\'' + step.id + '\')" title="Copy step output to clipboard">Copy Log</button>';
                    html += '<a class="inline-log-btn" href="' + horizonBaseUrl + 'apiLog?nodeId=' + encodeURIComponent(step.id) + '&download=true" download="step-' + encodeURIComponent(step.id) + '.txt" title="Download step output as text file">';
                    html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
                    html += '<span>Download</span>';
                    html += '</a>';
                    html += '</div>';
                    html += '</div>';
                    html += '<div class="inline-terminal-view' + (wrapPref ? '' : ' nowrap-mode') + (tallPref ? ' tall-view' : '') + '" id="terminal-' + step.id + '">';
                    html += '<div class="log-placeholder">Loading log stream...</div>';
                    html += '</div>';
                    html += '</div>';

                    html += '</div>';
                    return html;
                }

                // Update an existing row in place (status, duration, running markers) without touching its log.
                function patchStepItem(step, stage, rt, item) {
                    var st = (step.status || 'SUCCESS').toUpperCase();
                    var isRunningLeaf = !!rt.leaf[step.id];
                    item.setAttribute('data-status', st);
                    item.classList.toggle('step-running', isRunningLeaf);
                    item.classList.toggle('step-container-active', !!rt.containerActive[step.id]);
                    item.classList.toggle('step-group', isStepGroup(step));

                    var iconEl = document.getElementById('step-icon-' + step.id);
                    if (iconEl) {
                        var sig = st + (rt.containerActive[step.id] ? ':c' : '');
                        if (iconEl.getAttribute('data-icon-sig') !== sig) {
                            iconEl.innerHTML = getStepStatusIconHtml(step, rt);
                            iconEl.setAttribute('data-icon-sig', sig);
                        }
                    }
                    var durEl = document.getElementById('step-dur-' + step.id);
                    if (durEl) durEl.innerHTML = buildStepDurationHtml(step, rt);

                    var pill = document.getElementById('step-live-pill-' + step.id);
                    if (pill) pill.style.display = isRunningLeaf ? '' : 'none';

                    var badge = document.getElementById('step-closure-badge-' + step.id);
                    if (badge) {
                        var n = step.childStepsCount || 0;
                        badge.setAttribute('data-count', String(n));
                        badge.setAttribute('title', 'Closure block step enclosing ' + (n || 'nested') + ' step' + (n === 1 ? '' : 's'));
                    }

                    // A step that has finished no longer has a live tail.
                    var finished = (st === 'SUCCESS' || st === 'FAILED' || st === 'FAILURE' || st === 'ABORTED' || st === 'UNSTABLE' || st.indexOf('SKIPPED') !== -1 || st === 'NOT_EXECUTED');
                    if (finished || !isRunLive()) {
                        var tailBtn = document.getElementById('btn-tail-step-' + step.id);
                        if (tailBtn) tailBtn.parentNode.removeChild(tailBtn);
                    }
                }

                function syncStepList(container, stage, rt) {
                    var existing = {};
                    var items = container.querySelectorAll('.step-accordion-item');
                    var i;
                    for (i = 0; i < items.length; i++) {
                        existing[items[i].id.replace('step-item-', '')] = items[i];
                    }
                    var seen = {};
                    var prev = null;
                    for (i = 0; i < stage.steps.length; i++) {
                        var step = stage.steps[i];
                        seen[step.id] = true;
                        var item = existing[step.id];
                        if (item) {
                            patchStepItem(step, stage, rt, item);
                            prev = item;
                        } else {
                            var tmp = document.createElement('div');
                            tmp.innerHTML = buildStepItemHtml(step, stage, rt);
                            var fresh = tmp.firstChild;
                            if (prev) {
                                prev.parentNode.insertBefore(fresh, prev.nextSibling);
                            } else {
                                container.insertBefore(fresh, container.firstChild);
                            }
                            prev = fresh;
                        }
                    }
                    for (var key in existing) {
                        if (Object.prototype.hasOwnProperty.call(existing, key) && !seen[key]) {
                            existing[key].parentNode.removeChild(existing[key]);
                        }
                    }
                }

                function applyClosureCollapse() {
                    var items = document.querySelectorAll('#step-accordion-container .step-accordion-item');
                    var hidden = {};
                    for (var i = 0; i < items.length; i++) {
                        var it = items[i];
                        var id = it.id.replace('step-item-', '');
                        var pid = it.getAttribute('data-parent');
                        var hide = !!(pid && (hidden[pid] || collapsedClosures[pid]));
                        hidden[id] = hide;
                        it.style.display = hide ? 'none' : '';
                        it.classList.toggle('group-collapsed', !!collapsedClosures[id]);
                    }
                    updateGroupsButton();
                }

                function toggleClosureGroup(stepId) {
                    collapsedClosures[stepId] = !collapsedClosures[stepId];
                    if (!collapsedClosures[stepId]) delete collapsedClosures[stepId];
                    applyClosureCollapse();
                }

                function toggleAllClosureGroups() {
                    var groups = document.querySelectorAll('#step-accordion-container .step-group');
                    var anyOpen = false;
                    var i;
                    for (i = 0; i < groups.length; i++) {
                        if (!collapsedClosures[groups[i].id.replace('step-item-', '')]) { anyOpen = true; break; }
                    }
                    for (i = 0; i < groups.length; i++) {
                        var gid = groups[i].id.replace('step-item-', '');
                        if (anyOpen) collapsedClosures[gid] = true; else delete collapsedClosures[gid];
                    }
                    applyClosureCollapse();
                }

                function updateGroupsButton() {
                    var btn = document.getElementById('btn-step-groups');
                    if (!btn) return;
                    var groups = document.querySelectorAll('#step-accordion-container .step-group');
                    if (groups.length === 0) { btn.style.display = 'none'; return; }
                    btn.style.display = '';
                    var anyOpen = false;
                    for (var i = 0; i < groups.length; i++) {
                        if (!collapsedClosures[groups[i].id.replace('step-item-', '')]) { anyOpen = true; break; }
                    }
                    btn.textContent = anyOpen ? 'Collapse blocks' : 'Expand blocks';
                }

                function updateFollowButton() {
                    var btn = document.getElementById('btn-step-follow');
                    if (!btn) return;
                    if (stepFollowOn) {
                        btn.className = 'step-tool-btn follow-active';
                        btn.innerHTML = '<span class="live-tail-dot"></span>Following live';
                        btn.title = 'Auto-following the running step. Click, or open any step yourself, to pause.';
                    } else {
                        btn.className = 'step-tool-btn follow-paused';
                        btn.textContent = 'Follow paused \u2014 resume';
                        btn.title = 'Click to jump back to the running step and keep following it.';
                    }
                }

                function pauseStepFollow(byUser) {
                    if (!stepFollowOn) return;
                    stepFollowOn = false;
                    updateFollowButton();
                }

                function toggleStepFollow() {
                    if (stepFollowOn) {
                        pauseStepFollow(true);
                        return;
                    }
                    stepFollowOn = true;
                    updateFollowButton();
                    if (graphData) {
                        followActiveStageIfNeeded(graphData);
                        var stage = selectedStageId ? findStage(graphData.stages, selectedStageId) : null;
                        if (stage) {
                            lastFollowedStepId = null;
                            followRunningStep(stage, computeStepRuntime(stage), true);
                        }
                    }
                }

                function isElementComfortablyInView(el) {
                    if (!el) return true;
                    var app = document.getElementById('horizon-run-app');
                    var isFullscreen = app && app.classList.contains('mode-fullscreen');
                    var rect = el.getBoundingClientRect();
                    var top = 70;
                    var bottom = window.innerHeight - 40;
                    if (isFullscreen && app) {
                        var appRect = app.getBoundingClientRect();
                        top = appRect.top + 70;
                        bottom = appRect.bottom - 40;
                    }
                    return rect.top >= top && rect.bottom <= bottom;
                }

                // Keep the currently running step open and visible, like a live console would.
                function followRunningStep(stage, rt, forceScroll) {
                    if (!stage || !stepFollowOn || !isRunLive()) return;
                    var cur = rt.current;
                    if (!cur) return;
                    var changed = (cur.id !== lastFollowedStepId);
                    if (!changed && !forceScroll) return;

                    if (changed) {
                        var prevId = lastFollowedStepId;
                        if (prevId && stepAutoExpanded[prevId] && !stepUserToggled[prevId]) {
                            var prevStep = findStepInStage(stage, prevId);
                            var ps = prevStep ? (prevStep.status || '').toUpperCase() : '';
                            var prevItem = document.getElementById('step-item-' + prevId);
                            // Keep a finished step open only if it needs attention.
                            if (prevItem && prevItem.classList.contains('expanded') && ps !== 'FAILED' && ps !== 'FAILURE' && ps !== 'UNSTABLE') {
                                toggleStepAccordion(prevId, null, false, true);
                            }
                            delete stepAutoExpanded[prevId];
                        }
                        lastFollowedStepId = cur.id;

                        var pid = cur.parentStepId;
                        var guard = 0;
                        var byId = {};
                        for (var s = 0; s < stage.steps.length; s++) byId[stage.steps[s].id] = stage.steps[s];
                        while (pid && guard++ < 64) {
                            delete collapsedClosures[pid];
                            pid = byId[pid] ? byId[pid].parentStepId : null;
                        }
                        applyClosureCollapse();

                        var curItem = document.getElementById('step-item-' + cur.id);
                        if (curItem && !curItem.classList.contains('expanded')) {
                            stepAutoExpanded[cur.id] = true;
                            toggleStepAccordion(cur.id, null, true, true);
                        }
                    }

                    var row = document.getElementById('step-row-' + cur.id);
                    if (row && (forceScroll || (!isElementComfortablyInView(row) && !isUserViewingLogs()))) {
                        setTimeout(function() {
                            if (stepFollowOn && !isUserViewingLogs()) scrollWindowToElement(row, 'center');
                        }, 60);
                    }
                }

                // When the stage we are looking at finishes while the build keeps going, move along with it.
                function followActiveStageIfNeeded(data) {
                    if (!stepFollowOn || !data || !data.building) return false;
                    var cur = selectedStageId ? findStage(data.stages, selectedStageId) : null;
                    var curStatus = cur ? (cur.status || '').toUpperCase() : '';
                    if (cur && isStepActiveStatus(curStatus)) return false;
                    var all = getAllStagesFlat(data.stages);
                    var target = null;
                    for (var i = 0; i < all.length; i++) {
                        var s = all[i];
                        if ((s.status || '').toUpperCase() === 'IN_PROGRESS' && (!s.children || s.children.length === 0)) {
                            target = s;
                        }
                    }
                    if (target && (!cur || target.id !== cur.id)) {
                        selectStage(target.id, true, null, null, true);
                        return true;
                    }
                    return false;
                }

                function updateStepToolbar(stage, rt) {
                    var bar = document.getElementById('step-toolbar');
                    if (!bar) return;
                    if (!stage || !stage.steps || stage.steps.length === 0) {
                        bar.style.display = 'none';
                        bar.classList.remove('has-steps');
                        return;
                    }
                    bar.style.display = 'flex';
                    bar.classList.add('has-steps');

                    var parts = [rt.total + (rt.total === 1 ? ' step' : ' steps')];
                    if (rt.leafList.length > 0) parts.push(rt.leafList.length + ' running');
                    if (rt.failed > 0) parts.push(rt.failed + ' failed');
                    if (rt.unstable > 0) parts.push(rt.unstable + ' unstable');
                    var sum = document.getElementById('step-toolbar-summary');
                    if (sum) sum.textContent = parts.join(' \u00b7 ');

                    var now = document.getElementById('step-now-running');
                    if (now) {
                        if (rt.current) {
                            var nm = rt.current.displayName || rt.current.name || 'Step';
                            var ar = (rt.current.arguments && rt.current.arguments !== nm) ? rt.current.arguments : '';
                            now.innerHTML = '<span class="live-tail-dot"></span><span class="step-now-label">Now running</span> <b>' + escapeHtml(nm) + '</b>' + (ar ? ' <span class="step-now-args">' + escapeHtml(ar) + '</span>' : '');
                            now.style.display = '';
                            now.onclick = function() {
                                var r = document.getElementById('step-row-' + rt.current.id);
                                if (r) scrollWindowToElement(r, 'center');
                            };
                        } else {
                            now.style.display = 'none';
                            now.onclick = null;
                        }
                    }

                    var qFilters = document.getElementById('step-quick-filters');
                    var qIssues = document.getElementById('step-qfilter-issues');
                    var qSlow = document.getElementById('step-qfilter-slow');
                    if (qFilters) {
                        var hasIssues = (rt.failed + rt.unstable) > 0;
                        var hasSlow = !!rt.slowestStepId;
                        if (rt.total >= 4 && (hasIssues || hasSlow)) {
                            qFilters.style.display = 'inline-flex';
                            if (qIssues) {
                                qIssues.style.display = hasIssues ? '' : 'none';
                                qIssues.textContent = 'Failed / Warn (' + (rt.failed + rt.unstable) + ')';
                            }
                            if (qSlow) {
                                qSlow.style.display = hasSlow ? '' : 'none';
                            }
                        } else {
                            qFilters.style.display = 'none';
                        }
                    }

                    var followBtn = document.getElementById('btn-step-follow');
                    if (followBtn) {
                        followBtn.style.display = isRunLive() ? '' : 'none';
                        updateFollowButton();
                    }
                    updateGroupsButton();
                }

                var currentStepQuickFilter = 'all';

                function setStepQuickFilter(mode) {
                    currentStepQuickFilter = mode || 'all';
                    var allBtn = document.getElementById('step-qfilter-all');
                    var issBtn = document.getElementById('step-qfilter-issues');
                    var slowBtn = document.getElementById('step-qfilter-slow');
                    if (allBtn) allBtn.classList.toggle('active', currentStepQuickFilter === 'all');
                    if (issBtn) issBtn.classList.toggle('active', currentStepQuickFilter === 'issues');
                    if (slowBtn) slowBtn.classList.toggle('active', currentStepQuickFilter === 'slow');

                    var stage = (graphData && selectedStageId) ? findStage(graphData.stages, selectedStageId) : null;
                    var rt = stage ? computeStepRuntime(stage) : null;
                    var items = document.querySelectorAll('#step-accordion-container .step-accordion-item');
                    for (var i = 0; i < items.length; i++) {
                        var it = items[i];
                        var id = it.id.replace('step-item-', '');
                        var st = (it.getAttribute('data-status') || '').toUpperCase();
                        if (currentStepQuickFilter === 'all') {
                            it.style.display = '';
                        } else if (currentStepQuickFilter === 'issues') {
                            var isIssue = (st === 'FAILED' || st === 'FAILURE' || st === 'UNSTABLE');
                            it.style.display = isIssue ? '' : 'none';
                        } else if (currentStepQuickFilter === 'slow') {
                            var isSlow = (rt && rt.slowestStepId === id);
                            it.style.display = isSlow ? '' : 'none';
                        }
                    }
                    if (currentStepQuickFilter === 'all') {
                        applyClosureCollapse();
                    }
                }

                function collapseAllStepLogs() {
                    var items = document.querySelectorAll('#step-accordion-container .step-accordion-item.expanded');
                    for (var i = 0; i < items.length; i++) {
                        var id = items[i].id.replace('step-item-', '');
                        toggleStepAccordion(id, null, false, true);
                    }
                }

                function renderStepAccordionList(stage, targetStepId, targetLineRange) {
                    var container = document.getElementById('step-accordion-container');
                    if (!container) return;

                    if (!stage.steps || stage.steps.length === 0) {
                        container.removeAttribute('data-stage-id');
                        updateStepToolbar(null, null);
                        if (stage.status && (stage.status.indexOf('SKIPPED') !== -1 || stage.status === 'NOT_EXECUTED')) {
                            container.innerHTML = '<div class="step-accordion-empty">' +
                                '<div style="margin-bottom:0.6rem; display:flex; justify-content:center;">' + ICON_ACCORDION_SKIPPED + '</div>' +
                                '<div style="font-size:0.9rem; font-weight:600; color:#cbd5e1; margin-bottom:0.35rem;">Stage Skipped</div>' +
                                '<div style="font-size:0.8rem; line-height:1.45; color:#94a3b8; max-width:320px; margin:0 auto;">' +
                                escapeHtml(stage.skipReason || 'Condition evaluated to false. Steps in this stage were not executed.') +
                                '</div></div>';
                        } else {
                            container.innerHTML = '<div class="step-accordion-empty">No sub-steps found for this stage.</div>';
                        }
                        return;
                    }

                    var rt = computeStepRuntime(stage);

                    // Same stage, live refresh: patch rows in place so open logs, scroll position and
                    // the page layout are never disturbed by the 3s poll.
                    var sameStage = container.getAttribute('data-stage-id') === String(stage.id) &&
                        container.querySelector('.step-accordion-item') && !targetStepId && !targetLineRange;
                    if (sameStage) {
                        syncStepList(container, stage, rt);
                        applyClosureCollapse();
                        updateStepToolbar(stage, rt);
                        followRunningStep(stage, rt, false);
                        return;
                    }

                    stepUserToggled = {};
                    stepAutoExpanded = {};
                    collapsedClosures = {};
                    lastFollowedStepId = null;
                    currentStepQuickFilter = 'all';
                    var qAllBtn = document.getElementById('step-qfilter-all');
                    var qIssBtn = document.getElementById('step-qfilter-issues');
                    var qSlwBtn = document.getElementById('step-qfilter-slow');
                    if (qAllBtn) qAllBtn.classList.add('active');
                    if (qIssBtn) qIssBtn.classList.remove('active');
                    if (qSlwBtn) qSlwBtn.classList.remove('active');
                    container.setAttribute('data-stage-id', String(stage.id));

                    var html = '';
                    for (var i = 0; i < stage.steps.length; i++) {
                        html += buildStepItemHtml(stage.steps[i], stage, rt);
                    }
                    container.innerHTML = html;
                    applyClosureCollapse();
                    updateStepToolbar(stage, rt);

                    var stepToExpand = null;
                    if (targetStepId) {
                        for (var k = 0; k < stage.steps.length; k++) {
                            if (stage.steps[k].id === targetStepId) {
                                stepToExpand = stage.steps[k].id;
                                break;
                            }
                        }
                    }
                    if (!stepToExpand) {
                        if (stepFollowOn && rt.current) {
                            stepToExpand = rt.current.id;
                            lastFollowedStepId = rt.current.id;
                            stepAutoExpanded[rt.current.id] = true;
                        }
                    }
                    if (!stepToExpand) {
                        // Prefer the leaf step that actually needs attention, not the wrapper around it.
                        var attention = null;
                        var anyAttention = null;
                        for (var j = 0; j < stage.steps.length; j++) {
                            var stCheck = (stage.steps[j].status || '').toUpperCase();
                            if (stCheck === 'FAILED' || stCheck === 'FAILURE' || stCheck === 'UNSTABLE' || stCheck === 'PAUSED_INPUT' || stCheck === 'IN_PROGRESS') {
                                if (!anyAttention) anyAttention = stage.steps[j];
                                if (!attention && !isStepGroup(stage.steps[j])) {
                                    attention = stage.steps[j];
                                }
                            }
                        }
                        var chosen = attention || anyAttention;
                        if (chosen) {
                            stepToExpand = chosen.id;
                        } else if (stage.steps.length <= 3) {
                            for (var f = 0; f < stage.steps.length; f++) {
                                if (!isStepGroup(stage.steps[f])) { stepToExpand = stage.steps[f].id; break; }
                            }
                            if (!stepToExpand) stepToExpand = stage.steps[0].id;
                        }
                    }

                    if (stepToExpand) {
                        toggleStepAccordion(stepToExpand, targetLineRange, true, true);
                    }
                }

                function toggleStepAccordion(stepId, targetLineRange, forceExpand, isAuto) {
                    var item = document.getElementById('step-item-' + stepId);
                    var row = document.getElementById('step-row-' + stepId);
                    if (!item) return;

                    // A closure that wraps other steps is a collapsible group, not a log viewer.
                    if (item.classList.contains('step-group') && !forceExpand) {
                        toggleClosureGroup(stepId);
                        return;
                    }

                    if (!isAuto) {
                        stepUserToggled[stepId] = true;
                        delete stepAutoExpanded[stepId];
                        pauseStepFollow(true);
                    }

                    var isCurrentlyExpanded = item.classList.contains('expanded');
                    var shouldExpand = forceExpand || !isCurrentlyExpanded;

                    if (shouldExpand) {
                        item.classList.add('expanded');
                        if (row) row.setAttribute('aria-expanded', 'true');
                        if (!isAuto) selectedStepId = stepId;

                        var terminal = document.getElementById('terminal-' + stepId);
                        if (terminal) {
                            if (stepLogsCache[stepId] !== undefined) {
                                renderStepLogLines(stepId, stepLogsCache[stepId], targetLineRange);
                            } else {
                                terminal.innerHTML = '<div class="log-placeholder">Loading log stream...</div>';
                                fetch(horizonBaseUrl + 'apiLog?nodeId=' + encodeURIComponent(stepId))
                                    .then(function(res) {
                                        var sizeHeader = res.headers ? res.headers.get('X-Text-Size') : null;
                                        if (sizeHeader) {
                                            stepLogsOffset[stepId] = parseInt(sizeHeader, 10);
                                        }
                                        return res.text();
                                    })
                                    .then(function(text) {
                                        var currentStage = selectedStageId && graphData ? findStage(graphData.stages, selectedStageId) : null;
                                        var processedText = fixMojibake(text);
                                        if (!text || text.trim() === "[No console output recorded for this step]") {
                                            if (currentStage && currentStage.skipReason) {
                                                processedText = "[Stage was skipped: " + currentStage.skipReason + "]\n[No execution console output generated for this step]";
                                            } else {
                                                processedText = "[No console output recorded for this step]";
                                            }
                                        }
                                        stepLogsCache[stepId] = processedText;
                                        if (stepLogsOffset[stepId] === undefined) {
                                            stepLogsOffset[stepId] = (text ? text.length : 0);
                                        }
                                        renderStepLogLines(stepId, processedText, targetLineRange);
                                    })
                                    .catch(function(err) {
                                        terminal.innerHTML = '<div class="log-placeholder" style="color:#ef4444;">Error loading log: ' + escapeHtml(err.toString()) + '</div>';
                                    });
                            }
                        }
                    } else {
                        item.classList.remove('expanded');
                        if (row) row.setAttribute('aria-expanded', 'false');
                        if (selectedStepId === stepId) {
                            clearLineSelection(true);
                        }
                    }
                }

                function getLogLineSeverityClass(lineText) {
                    if (!lineText) return '';
                    if (/(ERROR\b|FATAL\b|FAILED\b|FAILURE\b|Exception:|\bError:|\bErr:\b|SyntaxError|NullPointerException|\bexit [1-9]|\bexit code [1-9]|returned exit code [1-9]|BUILD FAILURE)/i.test(lineText)) {
                        return ' log-line-error';
                    }
                    if (/(WARN\b|WARNING\b|DEPRECATED\b|\bNotice:\b)/i.test(lineText)) {
                        return ' log-line-warn';
                    }
                    if (/(BUILD SUCCESS|SUCCESSFULLY|Tests run: [0-9]+, Failures: 0, Errors: 0)/i.test(lineText)) {
                        return ' log-line-success';
                    }
                    return '';
                }

                var ANSI_COLOR_MAP = {
                    30: 'ansi-fg-black',
                    31: 'ansi-fg-red',
                    32: 'ansi-fg-green',
                    33: 'ansi-fg-yellow',
                    34: 'ansi-fg-blue',
                    35: 'ansi-fg-magenta',
                    36: 'ansi-fg-cyan',
                    37: 'ansi-fg-white',
                    90: 'ansi-fg-bright-black',
                    91: 'ansi-fg-bright-red',
                    92: 'ansi-fg-bright-green',
                    93: 'ansi-fg-bright-yellow',
                    94: 'ansi-fg-bright-blue',
                    95: 'ansi-fg-bright-magenta',
                    96: 'ansi-fg-bright-cyan',
                    97: 'ansi-fg-bright-white',
                    40: 'ansi-bg-black',
                    41: 'ansi-bg-red',
                    42: 'ansi-bg-green',
                    43: 'ansi-bg-yellow',
                    44: 'ansi-bg-blue',
                    45: 'ansi-bg-magenta',
                    46: 'ansi-bg-cyan',
                    47: 'ansi-bg-white'
                };

                function formatLogUrls(escapedText) {
                    var urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
                    return escapedText.replace(urlRegex, function(url) {
                        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="log-inline-link" onclick="event.stopPropagation();">' + url + '</a>';
                    });
                }

                function parseAnsiToHtml(text) {
                    if (!text) return '';
                    if (text.indexOf('\u001b') === -1 && text.indexOf('\x1b') === -1) {
                        return formatLogUrls(escapeHtml(text));
                    }

                    var cleaned = text.replace(/[\u001b\x1b]\[[0-9;]*[a-zA-Z]/g, function(match) {
                        return match.endsWith('m') ? match : '';
                    });

                    var parts = cleaned.split(/([\u001b\x1b]\[[0-9;]*m)/g);
                    var html = '';
                    var openSpans = 0;

                    for (var i = 0; i < parts.length; i++) {
                        var part = parts[i];
                        if (!part) continue;

                        if (part.startsWith('\u001b[') || part.startsWith('\x1b[')) {
                            var codesStr = part.slice(2, -1);
                            if (!codesStr || codesStr === '0') {
                                while (openSpans > 0) {
                                    html += '</span>';
                                    openSpans--;
                                }
                                continue;
                            }
                            var codes = codesStr.split(';').map(function(c) { return parseInt(c, 10); });
                            var classes = [];
                            var style = '';

                            for (var c = 0; c < codes.length; c++) {
                                var code = codes[c];
                                if (code === 0) {
                                    while (openSpans > 0) {
                                        html += '</span>';
                                        openSpans--;
                                    }
                                } else if (code === 1) {
                                    classes.push('ansi-bold');
                                } else if (code === 2) {
                                    classes.push('ansi-dim');
                                } else if (code === 3) {
                                    classes.push('ansi-italic');
                                } else if (code === 4) {
                                    classes.push('ansi-underline');
                                } else if (ANSI_COLOR_MAP[code]) {
                                    classes.push(ANSI_COLOR_MAP[code]);
                                } else if (code === 38 && c + 4 < codes.length && codes[c + 1] === 2) {
                                    var r = codes[c + 2], g = codes[c + 3], b = codes[c + 4];
                                    style += 'color: rgb(' + r + ',' + g + ',' + b + ');';
                                    c += 4;
                                } else if (code === 48 && c + 4 < codes.length && codes[c + 1] === 2) {
                                    var br = codes[c + 2], bg = codes[c + 3], bb = codes[c + 4];
                                    style += 'background-color: rgb(' + br + ',' + bg + ',' + bb + ');';
                                    c += 4;
                                }
                            }

                            if (classes.length > 0 || style) {
                                var spanAttrs = '';
                                if (classes.length > 0) spanAttrs += ' class="' + classes.join(' ') + '"';
                                if (style) spanAttrs += ' style="' + style + '"';
                                html += '<span' + spanAttrs + '>';
                                openSpans++;
                            }
                        } else {
                            html += formatLogUrls(escapeHtml(part));
                        }
                    }

                    while (openSpans > 0) {
                        html += '</span>';
                        openSpans--;
                    }
                    return html;
                }

                function formatLogLineText(lineText) {
                    if (!lineText) return '';
                    return parseAnsiToHtml(lineText);
                }

                var activeLiveTailSteps = {};

                function toggleStepLiveTail(stepId) {
                    var isCurrentlyActive = (activeLiveTailSteps[stepId] !== false);
                    setStepLiveTailState(stepId, !isCurrentlyActive);
                    if (!isCurrentlyActive) {
                        var term = document.getElementById('terminal-' + stepId);
                        if (term) term.scrollTop = term.scrollHeight;
                    }
                }

                function setStepLiveTailState(stepId, isActive) {
                    activeLiveTailSteps[stepId] = isActive;
                    var btn = document.getElementById('btn-tail-step-' + stepId);
                    var label = document.getElementById('label-tail-step-' + stepId);
                    if (!btn || !label) return;
                    if (isActive) {
                        btn.className = 'inline-log-btn live-tail-btn live-tail-active';
                        label.innerText = 'Live Tail';
                        btn.title = 'Live Tail active \u2014 auto-scrolling to bottom (scroll up to pause)';
                    } else {
                        btn.className = 'inline-log-btn live-tail-btn live-tail-paused';
                        label.innerText = 'Tail: Paused';
                        btn.title = 'Live Tail paused \u2014 click or scroll to bottom to resume';
                    }
                }

                function pollActiveStepLogs() {
                    if (!graphData || !graphData.building) return;
                    var expandedItems = document.querySelectorAll('.step-accordion-item.expanded');
                    if (!expandedItems || expandedItems.length === 0) return;

                    expandedItems.forEach(function(item) {
                        var idAttr = item.id;
                        if (!idAttr) return;
                        var stepId = idAttr.replace('step-item-', '');
                        if (!stepId) return;

                        var curOffset = (stepLogsOffset[stepId] !== undefined) ? stepLogsOffset[stepId] : -1;
                        var url = horizonBaseUrl + 'apiLog?nodeId=' + encodeURIComponent(stepId);
                        if (curOffset >= 0) {
                            url += '&startOffset=' + encodeURIComponent(curOffset);
                        }

                        fetch(url)
                            .then(function(res) {
                                var sizeHeader = res.headers ? res.headers.get('X-Text-Size') : null;
                                if (sizeHeader) {
                                    stepLogsOffset[stepId] = parseInt(sizeHeader, 10);
                                }
                                return res.text();
                            })
                            .then(function(deltaText) {
                                if (!deltaText || deltaText.length === 0) {
                                    return;
                                }
                                var cleanDelta = fixMojibake(deltaText);
                                if (!cleanDelta) return;

                                var existingText = stepLogsCache[stepId] || '';
                                if (curOffset >= 0 && existingText && existingText !== "[No console output recorded for this step]") {
                                    stepLogsCache[stepId] = existingText + cleanDelta;
                                } else {
                                    stepLogsCache[stepId] = cleanDelta;
                                }

                                renderStepLogLines(stepId, stepLogsCache[stepId], null, { isUpdate: true });
                            })
                            .catch(function() {});
                    });
                }

                function copyRunMarkdownSummary() {
                    if (!graphData) return;
                    var result = (graphData.result || 'UNKNOWN').toUpperCase();
                    var symbol = (result === 'SUCCESS') ? '[SUCCESS]' : (result === 'UNSTABLE' ? '[WARN]' : '[FAILED]');

                    var lines = [];
                    lines.push('*Pipeline Build #' + (graphData.number || '') + ' - ' + symbol + '*');
                    lines.push('- *Result*: `' + result + '`');
                    if (graphData.duration) {
                        var durStr = formatDuration(graphData.duration);
                        var extraDur = [];
                        if (graphData.formattedQueueWait) extraDur.push('Queue: ' + graphData.formattedQueueWait);
                        if (graphData.formattedAgentAllocation) extraDur.push('Agent Alloc: ' + graphData.formattedAgentAllocation);
                        if (extraDur.length > 0) durStr += ' (' + extraDur.join(', ') + ')';
                        lines.push('- *Duration*: ' + durStr);
                    }
                    if (graphData.branch || graphData.commitSha) {
                        var scmStr = '';
                        if (graphData.branch) scmStr += 'Branch `' + graphData.branch + '`';
                        if (graphData.commitSha) {
                            scmStr += (scmStr ? ' @ `' : 'Commit `') + graphData.commitSha.substring(0, 7) + '`';
                        }
                        if (graphData.commitAuthor) {
                            scmStr += ' by ' + graphData.commitAuthor;
                        }
                        lines.push('- *SCM*: ' + scmStr);
                    }
                    if (graphData.causes && graphData.causes.length > 0) {
                        lines.push('- *Triggered By*: ' + graphData.causes[0]);
                    }
                    if (graphData.failedSteps > 0 || (graphData.stages && graphData.stages.some(function(s){ return s.status==='FAILED'||s.status==='FAILURE'; }))) {
                        var failedStage = graphData.stages ? graphData.stages.find(function(s){ return s.status==='FAILED'||s.status==='FAILURE'; }) : null;
                        if (failedStage) {
                            lines.push('- *Failed Stage*: `' + failedStage.name + '`');
                            if (failedStage.error && failedStage.error.message) {
                                var cleanErr = failedStage.error.message.split('\n')[0].substring(0, 120);
                                lines.push('- *Error*: `' + cleanErr + '`');
                            }
                        }
                    }
                    if (graphData.totalTests > 0) {
                        lines.push('- *Tests*: ' + (graphData.totalTests - graphData.failedTests - graphData.skippedTests) + ' passed, ' + graphData.failedTests + ' failed, ' + graphData.skippedTests + ' skipped');
                    }
                    lines.push('- *Horizon View*: ' + window.location.href.split('#')[0]);

                    var markdownText = lines.join('\n');
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(markdownText).then(function() {
                            showToast("Copied Markdown summary to clipboard!", "success");
                        }).catch(function() {
                            promptCopyText(markdownText);
                        });
                    } else {
                        promptCopyText(markdownText);
                    }
                }

                var stepTerminalVirtualizers = {};
                window._stepWrapLines = true;
                window._stepTallView = false;

                function toggleStepWordWrap(stepId) {
                    window._stepWrapLines = (window._stepWrapLines === false);
                    var allTerms = document.querySelectorAll('.inline-terminal-view');
                    for (var i = 0; i < allTerms.length; i++) {
                        allTerms[i].classList.toggle('nowrap-mode', !window._stepWrapLines);
                    }
                    var allBtns = document.querySelectorAll('[id^="btn-wrap-step-"]');
                    for (var j = 0; j < allBtns.length; j++) {
                        allBtns[j].classList.toggle('is-active', window._stepWrapLines);
                    }
                    var v = stepTerminalVirtualizers[stepId];
                    if (v) {
                        v.forceNextRender = true;
                        renderVirtualSlice(v);
                    }
                }

                function toggleStepTallView(stepId) {
                    window._stepTallView = !window._stepTallView;
                    var allTerms = document.querySelectorAll('.inline-terminal-view');
                    for (var i = 0; i < allTerms.length; i++) {
                        allTerms[i].classList.toggle('tall-view', window._stepTallView);
                    }
                    var allBtns = document.querySelectorAll('[id^="btn-tall-step-"]');
                    for (var j = 0; j < allBtns.length; j++) {
                        allBtns[j].classList.toggle('is-active', window._stepTallView);
                    }
                    var allLabels = document.querySelectorAll('[id^="label-tall-step-"]');
                    for (var k = 0; k < allLabels.length; k++) {
                        allLabels[k].innerText = window._stepTallView ? 'Compact' : 'Expand';
                    }
                    var v = stepTerminalVirtualizers[stepId];
                    if (v) {
                        v.forceNextRender = true;
                        renderVirtualSlice(v);
                    }
                }

                function scrollStepTerminalEdge(stepId, edge) {
                    var terminal = document.getElementById('terminal-' + stepId);
                    var v = stepTerminalVirtualizers[stepId];
                    if (!terminal) return;
                    if (edge === 'top') {
                        terminal.scrollTop = 0;
                        if (v) {
                            v.forceNextRender = true;
                            renderVirtualSlice(v, 0);
                        }
                    } else {
                        if (v) {
                            var totalItems = v.filteredIndices ? v.filteredIndices.length : v.rawLines.length;
                            var approxEnd = totalItems * (v.lineHeight || 24);
                            v.forceNextRender = true;
                            renderVirtualSlice(v, approxEnd);
                        }
                        terminal.scrollTop = terminal.scrollHeight;
                    }
                }

                function filterSingleStepLog(stepId, query) {
                    var v = stepTerminalVirtualizers[stepId];
                    var countEl = document.getElementById('log-count-' + stepId);
                    if (!v) return;
                    var q = (query || '').trim().toLowerCase();
                    v.localFilterQuery = q;
                    var effectiveQuery = q || currentStageSearchQuery;
                    if (!effectiveQuery) {
                        v.filteredIndices = null;
                        if (countEl) {
                            countEl.innerText = v.rawLines.length + (v.rawLines.length === 1 ? ' line' : ' lines');
                        }
                    } else {
                        var matches = [];
                        for (var i = 0; i < v.rawLines.length; i++) {
                            if (v.rawLines[i].toLowerCase().indexOf(effectiveQuery) !== -1) {
                                matches.push(i);
                            }
                        }
                        v.filteredIndices = matches;
                        if (countEl) {
                            countEl.innerText = matches.length + ' of ' + v.rawLines.length + ' lines';
                        }
                    }
                    v.forceNextRender = true;
                    renderVirtualSlice(v, 0);
                }

                function renderVirtualSlice(vState, forcedScrollTop) {
                    var stepId = vState.stepId;
                    var terminal = document.getElementById('terminal-' + stepId);
                    var topSpacer = document.getElementById('v-top-' + stepId);
                    var sliceContainer = document.getElementById('v-slice-' + stepId);
                    var bottomSpacer = document.getElementById('v-bottom-' + stepId);
                    if (!terminal || !topSpacer || !sliceContainer || !bottomSpacer) return;

                    var totalItems = vState.filteredIndices ? vState.filteredIndices.length : vState.rawLines.length;
                    if (totalItems === 0) {
                        topSpacer.style.height = '0px';
                        bottomSpacer.style.height = '0px';
                        sliceContainer.innerHTML = '<div class="log-placeholder" style="padding:1rem 1.25rem;">No matching log lines found.</div>';
                        vState.lastStartIndex = -1;
                        vState.lastEndIndex = -1;
                        return;
                    }

                    // Render directly without virtual windowing for logs <= 2500 lines (or when word-wrap is active on <= 3000 lines)
                    // so scrolling never replaces DOM nodes mid-scroll or breaks multi-line text selection!
                    var useDirectRender = (totalItems <= 2500) || (window._stepWrapLines !== false && totalItems <= 3500);
                    var startIndex = 0;
                    var endIndex = totalItems - 1;

                    if (!useDirectRender) {
                        var scrollTop = (forcedScrollTop !== undefined && forcedScrollTop !== null) ? forcedScrollTop : terminal.scrollTop;
                        var clientHeight = terminal.clientHeight || 480;
                        var lineHeight = vState.lineHeight || 24;

                        var firstVisible = Math.floor(scrollTop / lineHeight);
                        var visibleCount = Math.ceil(clientHeight / lineHeight);
                        var OVERSCAN = 60;

                        startIndex = Math.max(0, firstVisible - OVERSCAN);
                        endIndex = Math.min(totalItems - 1, firstVisible + visibleCount + OVERSCAN);
                    }

                    if (vState.lastStartIndex === startIndex && vState.lastEndIndex === endIndex && !vState.forceNextRender) {
                        return;
                    }
                    vState.lastStartIndex = startIndex;
                    vState.lastEndIndex = endIndex;
                    vState.forceNextRender = false;

                    var topHeight = useDirectRender ? 0 : (startIndex * (vState.lineHeight || 24));
                    var bottomHeight = useDirectRender ? 0 : Math.max(0, (totalItems - 1 - endIndex) * (vState.lineHeight || 24));

                    topSpacer.style.height = topHeight + 'px';
                    bottomSpacer.style.height = bottomHeight + 'px';

                    var html = [];
                    for (var k = startIndex; k <= endIndex; k++) {
                        var rawIdx = vState.filteredIndices ? vState.filteredIndices[k] : k;
                        var lineNum = rawIdx + 1;
                        var lineText = vState.rawLines[rawIdx];
                        var sevClass = getLogLineSeverityClass(lineText);
                        var formattedText = formatLogLineText(lineText);

                        var isSelected = (selectedStepId === stepId && selectedLineStart !== null && selectedLineEnd !== null && lineNum >= selectedLineStart && lineNum <= selectedLineEnd);
                        var isMatch = (vState.activeMatchLineNum === lineNum);

                        var extraClasses = sevClass;
                        if (isSelected) extraClasses += ' selected';
                        if (isMatch) extraClasses += ' active-search-match';

                        html.push(
                            '<div class="log-line' + extraClasses + '" id="log-line-' + stepId + '-' + lineNum + '" data-step="' + stepId + '" data-line="' + lineNum + '">' +
                            '<span class="log-line-gutter" onclick="handleLineGutterClick(event, \'' + stepId + '\', ' + lineNum + ')" title="Click to share line #' + lineNum + ' (Shift+click for range)">' +
                            '<span class="log-line-num">' + lineNum + '</span>' +
                            '</span>' +
                            '<span class="log-line-text">' + formattedText + '</span>' +
                            '</div>'
                        );
                    }
                    sliceContainer.innerHTML = html.join('');
                }

                function scrollVirtualTerminalToLine(stepId, lineNum, pulseType) {
                    var v = stepTerminalVirtualizers[stepId];
                    var terminal = document.getElementById('terminal-' + stepId);
                    if (!v || !terminal) return;

                    var rawIdx = lineNum - 1;
                    var itemIdx = rawIdx;
                    if (v.filteredIndices) {
                        itemIdx = v.filteredIndices.indexOf(rawIdx);
                        if (itemIdx === -1) return;
                    }

                    v.forceNextRender = true;
                    var lineHeight = v.lineHeight || 24;
                    var clientHeight = terminal.clientHeight || 480;
                    var approxScrollTop = Math.max(0, (itemIdx * lineHeight) - Math.floor(clientHeight / 3));
                    renderVirtualSlice(v, approxScrollTop);

                    setTimeout(function() {
                        var lineEl = document.getElementById('log-line-' + stepId + '-' + lineNum);
                        if (lineEl) {
                            var lineTop = lineEl.offsetTop;
                            terminal.scrollTop = Math.max(0, lineTop - Math.floor((terminal.clientHeight || 480) / 3));
                            var className = (pulseType === 'error') ? 'error-pulse-highlight' : 'pulse-highlight';
                            lineEl.classList.remove(className);
                            void lineEl.offsetWidth;
                            lineEl.classList.add(className);
                            setTimeout(function() {
                                lineEl.classList.remove(className);
                            }, 2800);
                        } else {
                            terminal.scrollTop = approxScrollTop;
                        }
                    }, 30);
                }

                function renderStepLogLines(stepId, text, initialLineRange, updateOpts) {
                    var terminal = document.getElementById('terminal-' + stepId);
                    var countEl = document.getElementById('log-count-' + stepId);
                    if (!terminal) return;

                    var rawLines = text.split('\n');
                    if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
                        rawLines.pop();
                    }

                    if (countEl) {
                        countEl.innerText = rawLines.length + (rawLines.length === 1 ? ' line' : ' lines');
                    }

                    var vState = stepTerminalVirtualizers[stepId];
                    if (!vState) {
                        vState = {
                            stepId: stepId,
                            rawLines: rawLines,
                            filteredIndices: null,
                            lineHeight: 24,
                            ticking: false,
                            activeMatchLineNum: -1,
                            activeMatchIndex: -1,
                            lastStartIndex: -1,
                            lastEndIndex: -1,
                            forceNextRender: true
                        };
                        stepTerminalVirtualizers[stepId] = vState;
                    } else {
                        vState.rawLines = rawLines;
                        vState.forceNextRender = true;
                    }

                    if (currentStageSearchQuery) {
                        var stageMatches = [];
                        for (var mIdx = 0; mIdx < rawLines.length; mIdx++) {
                            if (rawLines[mIdx].toLowerCase().indexOf(currentStageSearchQuery) !== -1) {
                                stageMatches.push(mIdx);
                            }
                        }
                        vState.filteredIndices = stageMatches;
                        if (countEl) {
                            countEl.innerText = stageMatches.length + ' matching of ' + rawLines.length;
                        }
                    }

                    var sliceContainer = document.getElementById('v-slice-' + stepId);
                    if (!sliceContainer) {
                        terminal.innerHTML =
                            '<div class="virtual-spacer-top" id="v-top-' + stepId + '" style="height:0px;"></div>' +
                            '<div class="virtual-slice" id="v-slice-' + stepId + '"></div>' +
                            '<div class="virtual-spacer-bottom" id="v-bottom-' + stepId + '" style="height:0px;"></div>';
                    }

                    if (!terminal._virtualScrollAttached) {
                        terminal.addEventListener('scroll', function() {
                            var v = stepTerminalVirtualizers[stepId];
                            if (v && !v.ticking) {
                                v.ticking = true;
                                window.requestAnimationFrame(function() {
                                    v.ticking = false;
                                    renderVirtualSlice(v);
                                });
                            }
                            var tailBtn = document.getElementById('btn-tail-step-' + stepId);
                            if (tailBtn) {
                                var atBottom = (terminal.scrollHeight - terminal.scrollTop - terminal.clientHeight <= 35);
                                setStepLiveTailState(stepId, atBottom);
                            }
                        });
                        terminal._virtualScrollAttached = true;
                    }

                    var itemForStatus = document.getElementById('step-item-' + stepId);
                    var stepIsRunning = !!(itemForStatus && itemForStatus.getAttribute('data-status') === 'IN_PROGRESS');
                    var isLiveUpdate = !!(updateOpts && updateOpts.isUpdate);

                    if (isLiveUpdate) {
                        // Live poll refresh: never yank the reader around. Keep the exact reading
                        // position unless the user is following the tail (parked at the bottom).
                        var liveTailBtn = document.getElementById('btn-tail-step-' + stepId);
                        var followingTail = !!liveTailBtn && (activeLiveTailSteps[stepId] !== false);
                        var keepTop = terminal.scrollTop;
                        vState.forceNextRender = true;
                        renderVirtualSlice(vState, keepTop);
                        if (followingTail) {
                            terminal.scrollTop = terminal.scrollHeight;
                            vState.forceNextRender = true;
                            renderVirtualSlice(vState);
                        } else if (terminal.scrollTop !== keepTop) {
                            terminal.scrollTop = keepTop;
                        }
                    } else if (initialLineRange) {
                        selectStepLineRange(stepId, initialLineRange.start, initialLineRange.end, false, false);
                        scrollVirtualTerminalToLine(stepId, initialLineRange.start, 'line');
                    } else if (pendingLineRange) {
                        var r = pendingLineRange;
                        pendingLineRange = null;
                        selectStepLineRange(stepId, r.start, r.end, false, false);
                        scrollVirtualTerminalToLine(stepId, r.start, 'line');
                    } else {
                        clearLineSelection(false);
                        var tailBtn = document.getElementById('btn-tail-step-' + stepId);
                        var shouldTail = tailBtn && (activeLiveTailSteps[stepId] !== false);

                        var firstErrIdx = -1;
                        if (!stepIsRunning) {
                            for (var eIdx = 0; eIdx < vState.rawLines.length; eIdx++) {
                                if (getLogLineSeverityClass(vState.rawLines[eIdx]).indexOf('log-line-error') !== -1) {
                                    firstErrIdx = eIdx;
                                    break;
                                }
                            }
                        }

                        if (firstErrIdx !== -1) {
                            var errLineNum = firstErrIdx + 1;
                            scrollVirtualTerminalToLine(stepId, errLineNum, 'error');
                        } else if (shouldTail) {
                            terminal.scrollTop = terminal.scrollHeight;
                            renderVirtualSlice(vState);
                            terminal.scrollTop = terminal.scrollHeight;
                        } else {
                            terminal.scrollTop = 0;
                            renderVirtualSlice(vState, 0);
                        }
                    }
                }

                var currentStageSearchQuery = '';
                var stageSearchMatches = [];
                var stageSearchActiveIndex = -1;

                function filterStageLogs(query) {
                    currentStageSearchQuery = (query || '').trim().toLowerCase();
                    runStageLogFilter(currentStageSearchQuery);
                }

                function runStageLogFilter(query) {
                    var stepper = document.getElementById('stage-log-match-stepper');
                    var stepperCount = document.getElementById('stage-match-count');
                    var currentStage = selectedStageId && graphData ? findStage(graphData.stages, selectedStageId) : null;
                    var steps = (currentStage && currentStage.steps) ? currentStage.steps : [];

                    stageSearchMatches = [];

                    if (!query) {
                        stageSearchActiveIndex = -1;
                        if (stepper) stepper.style.display = 'none';

                        for (var i = 0; i < steps.length; i++) {
                            var step = steps[i];
                            var stepId = step.id;
                            var v = stepTerminalVirtualizers[stepId];
                            var countEl = document.getElementById('log-count-' + stepId);
                            var rowBadge = document.getElementById('step-row-match-' + stepId);
                            var pillBadge = document.getElementById('step-match-pill-' + stepId);
                            if (rowBadge) rowBadge.style.display = 'none';
                            if (pillBadge) pillBadge.style.display = 'none';

                            if (v) {
                                v.filteredIndices = null;
                                v.activeMatchLineNum = -1;
                                v.activeMatchIndex = -1;
                                v.forceNextRender = true;
                                if (countEl) countEl.innerText = v.rawLines.length + (v.rawLines.length === 1 ? ' line' : ' lines');
                                renderVirtualSlice(v, 0);
                            }
                        }
                        return;
                    }

                    var pendingFetches = 0;

                    for (var j = 0; j < steps.length; j++) {
                        var stp = steps[j];
                        var sId = stp.id;
                        if (isStepGroup(stp)) continue;

                        if (stepLogsCache[sId] === undefined) {
                            pendingFetches++;
                            (function(targetId, qRef) {
                                fetch(horizonBaseUrl + 'apiLog?nodeId=' + encodeURIComponent(targetId))
                                    .then(function(res) { return res.text(); })
                                    .then(function(txt) {
                                        var proc = fixMojibake(txt);
                                        stepLogsCache[targetId] = proc;
                                        if (currentStageSearchQuery === qRef) {
                                            runStageLogFilter(qRef);
                                        }
                                    })
                                    .catch(function() {});
                            })(sId, query);
                            continue;
                        }

                        var text = stepLogsCache[sId] || '';
                        var rawLines = text.split('\n');
                        if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') rawLines.pop();

                        var stepMatches = [];
                        for (var lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
                            if (rawLines[lineIdx].toLowerCase().indexOf(query) !== -1) {
                                stepMatches.push(lineIdx);
                                stageSearchMatches.push({
                                    stepId: sId,
                                    stepName: stp.displayName || stp.name || 'Step',
                                    lineIndex: lineIdx,
                                    lineNumber: lineIdx + 1,
                                    text: rawLines[lineIdx]
                                });
                            }
                        }

                        var sRowBadge = document.getElementById('step-row-match-' + sId);
                        var sPillBadge = document.getElementById('step-match-pill-' + sId);
                        var sCountEl = document.getElementById('log-count-' + sId);

                        if (stepMatches.length > 0) {
                            var badgeText = stepMatches.length + (stepMatches.length === 1 ? ' match' : ' matches');
                            if (sRowBadge) {
                                sRowBadge.innerText = badgeText;
                                sRowBadge.style.display = 'inline-flex';
                            }
                            if (sPillBadge) {
                                sPillBadge.innerText = badgeText;
                                sPillBadge.style.display = 'inline-flex';
                            }
                            if (sCountEl) {
                                sCountEl.innerText = stepMatches.length + ' matching of ' + rawLines.length;
                            }
                        } else {
                            if (sRowBadge) sRowBadge.style.display = 'none';
                            if (sPillBadge) sPillBadge.style.display = 'none';
                            if (sCountEl) sCountEl.innerText = '0 matching of ' + rawLines.length;
                        }

                        var sVirt = stepTerminalVirtualizers[sId];
                        if (sVirt) {
                            sVirt.filteredIndices = stepMatches;
                            sVirt.activeMatchIndex = stepMatches.length > 0 ? 0 : -1;
                            sVirt.activeMatchLineNum = stepMatches.length > 0 ? (stepMatches[0] + 1) : -1;
                            sVirt.forceNextRender = true;
                            renderVirtualSlice(sVirt, 0);
                        }
                    }

                    var total = stageSearchMatches.length;
                    if (stepper) stepper.style.display = 'inline-flex';

                    if (total > 0) {
                        if (stageSearchActiveIndex < 0 || stageSearchActiveIndex >= total) {
                            stageSearchActiveIndex = 0;
                        }
                        var uniqueSteps = {};
                        for (var u = 0; u < total; u++) uniqueSteps[stageSearchMatches[u].stepId] = true;
                        var uniqueCount = Object.keys(uniqueSteps).length;
                        var stepSuffix = (uniqueCount > 1) ? (' (' + uniqueCount + ' steps)') : '';

                        if (stepperCount) {
                            stepperCount.innerText = (stageSearchActiveIndex + 1) + ' of ' + total + stepSuffix;
                        }
                        jumpToStageMatch(stageSearchActiveIndex, false);
                    } else {
                        stageSearchActiveIndex = -1;
                        if (stepperCount) {
                            stepperCount.innerText = pendingFetches > 0 ? 'Searching...' : '0 of 0';
                        }
                    }
                }

                function jumpToStageMatch(matchIdx, scrollPage) {
                    if (!stageSearchMatches || stageSearchMatches.length === 0) return;
                    if (matchIdx < 0 || matchIdx >= stageSearchMatches.length) return;

                    stageSearchActiveIndex = matchIdx;
                    var m = stageSearchMatches[matchIdx];

                    var item = document.getElementById('step-item-' + m.stepId);
                    if (item && !item.classList.contains('expanded')) {
                        toggleStepAccordion(m.stepId, null, true, true);
                    }

                    var v = stepTerminalVirtualizers[m.stepId];
                    if (v) {
                        v.activeMatchLineNum = m.lineNumber;
                        if (v.filteredIndices) {
                            v.activeMatchIndex = v.filteredIndices.indexOf(m.lineIndex);
                        }
                        v.forceNextRender = true;
                    }

                    setTimeout(function() {
                        scrollVirtualTerminalToLine(m.stepId, m.lineNumber);
                        if (scrollPage) {
                            var row = document.getElementById('step-row-' + m.stepId);
                            if (row && !isElementComfortablyInView(row)) {
                                scrollWindowToElement(row, 'nearest');
                            }
                        }
                    }, 40);

                    var total = stageSearchMatches.length;
                    var uniqueSteps = {};
                    for (var u = 0; u < total; u++) uniqueSteps[stageSearchMatches[u].stepId] = true;
                    var uniqueCount = Object.keys(uniqueSteps).length;
                    var stepSuffix = (uniqueCount > 1) ? (' (' + uniqueCount + ' steps)') : '';

                    var stepperCount = document.getElementById('stage-match-count');
                    if (stepperCount) {
                        stepperCount.innerText = (matchIdx + 1) + ' of ' + total + stepSuffix;
                    }
                }

                function stageSearchMatch(direction) {
                    if (!stageSearchMatches || stageSearchMatches.length === 0) return;
                    var total = stageSearchMatches.length;
                    stageSearchActiveIndex = (stageSearchActiveIndex + direction + total) % total;
                    jumpToStageMatch(stageSearchActiveIndex, true);
                }

                function handleStageSearchKey(event) {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        stageSearchMatch(event.shiftKey ? -1 : 1);
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        var input = document.getElementById('stage-log-search');
                        if (input) {
                            input.value = '';
                            filterStageLogs('');
                            input.blur();
                        }
                    }
                }

                function focusStageLogSearch() {
                    var input = document.getElementById('stage-log-search');
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }

                function filterStepLog(stepId, query) {
                    filterStageLogs(query);
                }
                function stepSearchMatch(stepId, direction) {
                    stageSearchMatch(direction);
                }
                function handleStepSearchKey(event, stepId) {
                    handleStageSearchKey(event);
                }
                function focusStepLogSearch(stepId) {
                    focusStageLogSearch();
                }

                function openShortcutsModal() {
                    var modal = document.getElementById('shortcuts-modal');
                    if (modal) modal.classList.add('active');
                }

                function closeShortcutsModal() {
                    var modal = document.getElementById('shortcuts-modal');
                    if (modal) modal.classList.remove('active');
                }

                function toggleShortcutsModal() {
                    var modal = document.getElementById('shortcuts-modal');
                    if (modal && modal.classList.contains('active')) {
                        closeShortcutsModal();
                    } else {
                        openShortcutsModal();
                    }
                }

                function navigateStageByArrow(direction) {
                    if (!graphData || !graphData.stages) return;
                    var allStages = Array.from(document.querySelectorAll('.stage-node'));
                    if (allStages.length === 0) return;
                    var currentIdx = allStages.findIndex(function(el) { return el.id === 'stage-card-' + selectedStageId; });
                    var nextIdx;
                    if (currentIdx === -1) {
                        nextIdx = (direction > 0) ? 0 : (allStages.length - 1);
                    } else {
                        nextIdx = Math.max(0, Math.min(allStages.length - 1, currentIdx + direction));
                    }
                    var nextEl = allStages[nextIdx];
                    if (nextEl) {
                        nextEl.focus();
                        selectStage(nextEl.id.replace('stage-card-', ''));
                    }
                }

                function toggleStagePicker(event) {
                    if (event) event.stopPropagation();
                    var menu = document.getElementById('stage-picker-menu');
                    if (!menu) return;
                    var isOpen = menu.style.display !== 'none';
                    if (isOpen) {
                        closeStagePicker();
                    } else {
                        openStagePicker();
                    }
                }

                function openStagePicker() {
                    var menu = document.getElementById('stage-picker-menu');
                    var btn = document.getElementById('btn-stage-picker');
                    if (!menu) return;
                    renderStagePickerList();
                    menu.style.display = 'flex';
                    if (btn) btn.setAttribute('aria-expanded', 'true');
                    var searchInput = document.getElementById('stage-picker-search-input');
                    if (searchInput) {
                        searchInput.value = '';
                        setTimeout(function() { searchInput.focus(); }, 40);
                    }
                }

                function closeStagePicker() {
                    var menu = document.getElementById('stage-picker-menu');
                    var btn = document.getElementById('btn-stage-picker');
                    if (menu) menu.style.display = 'none';
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }

                /* Phase 4: Canvas Snapshot (PNG/SVG) and Build Telemetry JSON Export */
                function toggleExportMenu(event) {
                    if (event) event.stopPropagation();
                    var menu = document.getElementById('graph-export-menu');
                    var btn = document.getElementById('btn-graph-export');
                    if (!menu) return;
                    var isOpen = menu.style.display !== 'none';
                    if (isOpen) {
                        closeExportMenu();
                    } else {
                        closeStagePicker();
                        menu.style.display = 'flex';
                        if (btn) btn.setAttribute('aria-expanded', 'true');
                    }
                }

                function closeExportMenu() {
                    var menu = document.getElementById('graph-export-menu');
                    var btn = document.getElementById('btn-graph-export');
                    if (menu) menu.style.display = 'none';
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }

                function formatExportStatusLabel(status) {
                    var s = (status || '').toUpperCase();
                    if (s.indexOf('SKIPPED') !== -1 || s === 'NOT_EXECUTED') return 'SKIPPED';
                    if (s === 'IN_PROGRESS' || s === 'RUNNING') return 'RUNNING';
                    if (s === 'PAUSED_INPUT' || s === 'PAUSED') return 'PAUSED';
                    if (s === 'FAILURE') return 'FAILED';
                    return s || 'UNKNOWN';
                }

                function getStageExportColors(status, isDark) {
                    var st = (status || 'SUCCESS').toUpperCase();
                    if (st === 'SUCCESS') {
                        return {
                            pillBg: isDark ? '#064e3b' : '#d1fae5',
                            pillText: isDark ? '#34d399' : '#065f46',
                            border: isDark ? '#059669' : '#10b981',
                            path: '#10b981'
                        };
                    }
                    if (st === 'FAILED' || st === 'FAILURE') {
                        return {
                            pillBg: isDark ? '#450a0a' : '#fee2e2',
                            pillText: isDark ? '#f87171' : '#991b1b',
                            border: isDark ? '#ef4444' : '#ef4444',
                            path: '#ef4444'
                        };
                    }
                    if (st === 'UNSTABLE') {
                        return {
                            pillBg: isDark ? '#451a03' : '#fef3c7',
                            pillText: isDark ? '#fbbf24' : '#92400e',
                            border: isDark ? '#f59e0b' : '#f59e0b',
                            path: '#f59e0b'
                        };
                    }
                    if (st === 'IN_PROGRESS' || st === 'RUNNING') {
                        return {
                            pillBg: isDark ? '#172554' : '#dbeafe',
                            pillText: isDark ? '#60a5fa' : '#1e40af',
                            border: isDark ? '#3b82f6' : '#3b82f6',
                            path: '#3b82f6'
                        };
                    }
                    if (st === 'PAUSED_INPUT' || st === 'PAUSED') {
                        return {
                            pillBg: isDark ? '#2e1065' : '#ede9fe',
                            pillText: isDark ? '#a78bfa' : '#5b21b6',
                            border: isDark ? '#8b5cf6' : '#8b5cf6',
                            path: '#8b5cf6'
                        };
                    }
                    if (st === 'ABORTED') {
                        return {
                            pillBg: isDark ? '#334155' : '#f1f5f9',
                            pillText: isDark ? '#94a3b8' : '#475569',
                            border: isDark ? '#64748b' : '#94a3b8',
                            path: '#64748b'
                        };
                    }
                    if (st.indexOf('SKIPPED') !== -1 || st === 'NOT_EXECUTED') {
                        return {
                            pillBg: isDark ? '#1e293b' : '#f1f5f9',
                            pillText: isDark ? '#64748b' : '#94a3b8',
                            border: isDark ? '#334155' : '#cbd5e1',
                            path: '#475569'
                        };
                    }
                    return {
                        pillBg: isDark ? '#1e293b' : '#f1f5f9',
                        pillText: isDark ? '#94a3b8' : '#64748b',
                        border: isDark ? '#475569' : '#cbd5e1',
                        path: '#64748b'
                    };
                }

                function getConnectorPathColor(cls) {
                    if (!cls) return '#64748b';
                    if (cls.indexOf('flow-failed') !== -1) return '#ef4444';
                    if (cls.indexOf('flow-success') !== -1) return '#10b981';
                    if (cls.indexOf('flow-unstable') !== -1) return '#f59e0b';
                    if (cls.indexOf('flow-in-progress') !== -1) return '#3b82f6';
                    if (cls.indexOf('flow-paused-input') !== -1) return '#8b5cf6';
                    return '#64748b';
                }

                function exportPipelineCanvas(format) {
                    closeExportMenu();
                    var flow = document.getElementById('pipeline-flow');
                    var canvas = document.getElementById('pipeline-flow-canvas');
                    if (!flow || !canvas || !graphData) {
                        showToast("Pipeline canvas not available to export", "error");
                        return;
                    }

                    function escapeXml(str) {
                        if (!str) return "";
                        return String(str)
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&apos;');
                    }

                    try {
                        var svgEl = document.getElementById('pipeline-flow-svg');
                        var zoom = currentZoom || 1.0;
                        var canvasRect = canvas.getBoundingClientRect();

                        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        function updateBounds(x, y, w, h) {
                            if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return;
                            if (x < minX) minX = x;
                            if (y < minY) minY = y;
                            if (x + w > maxX) maxX = x + w;
                            if (y + h > maxY) maxY = y + h;
                        }

                        var startNode = document.getElementById('terminal-node-start');
                        if (startNode) {
                            var sr = startNode.getBoundingClientRect();
                            var sx = (sr.left - canvasRect.left) / zoom;
                            var sy = (sr.top - canvasRect.top) / zoom;
                            var sw = sr.width / zoom;
                            var sh = sr.height / zoom;
                            updateBounds(sx - 10, sy - 24, sw + 20, sh + 28);
                        }

                        var endNode = document.getElementById('terminal-node-end');
                        if (endNode) {
                            var er = endNode.getBoundingClientRect();
                            var ex = (er.left - canvasRect.left) / zoom;
                            var ey = (er.top - canvasRect.top) / zoom;
                            var ew = er.width / zoom;
                            var eh = er.height / zoom;
                            updateBounds(ex - 10, ey - 24, ew + 20, eh + 28);
                        }

                        var pLabels = canvas.querySelectorAll('.parallel-label');
                        for (var pl = 0; pl < pLabels.length; pl++) {
                            var plr = pLabels[pl].getBoundingClientRect();
                            updateBounds((plr.left - canvasRect.left) / zoom, (plr.top - canvasRect.top) / zoom, plr.width / zoom, plr.height / zoom);
                        }

                        var cards = canvas.querySelectorAll('.stage-node');
                        for (var c = 0; c < cards.length; c++) {
                            var cr = cards[c].getBoundingClientRect();
                            updateBounds((cr.left - canvasRect.left) / zoom, (cr.top - canvasRect.top) / zoom, cr.width / zoom, cr.height / zoom);
                        }

                        if (minX === Infinity || maxX <= minX) {
                            minX = 0;
                            minY = 0;
                            maxX = Math.max(800, canvas.scrollWidth || 800);
                            maxY = Math.max(400, canvas.scrollHeight || 400);
                        }

                        var pad = 36;
                        var headerH = 48;
                        var contentW = Math.ceil(maxX - minX);
                        var contentH = Math.ceil(maxY - minY);
                        var totalW = Math.max(contentW + (pad * 2), 620);
                        var totalH = contentH + headerH + (pad * 2);
                        var offsetX = minX;
                        var offsetY = minY;

                        var isDark = document.querySelector('.horizon-container.theme-dark') !== null;
                        var bgColor = isDark ? '#0b1120' : '#f8fafc';
                        var textPrimary = isDark ? '#f8fafc' : '#0f172a';
                        var textSecondary = isDark ? '#94a3b8' : '#64748b';
                        var buildNum = graphData.number || 'run';
                        var rawRunStatus = (graphData.status || 'SUCCESS').toUpperCase();
                        var runStatus = formatExportStatusLabel(rawRunStatus);
                        var statusCol = getStageExportColors(rawRunStatus, isDark);
                        var titleStr = (graphData.fullName || graphData.name || 'Pipeline') + ' #' + buildNum;
                        var durationStr = graphData.durationFormatted || formatDuration(graphData.duration || 0);

                        // -------------------------------------------------------------
                        // EXPORT FORMAT: SVG (Pure Native Vector SVG)
                        // -------------------------------------------------------------
                        if (format === 'svg') {
                            var headerPillW = Math.max(56, runStatus.length * 7 + 16);
                            var approxTitleW = titleStr.length * 9;

                            var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + totalW + '" height="' + totalH + '" viewBox="0 0 ' + totalW + ' ' + totalH + '">\n';
                            svg += '  <defs>\n';
                            svg += '    <style type="text/css">\n';
                            svg += '      text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }\n';
                            svg += '    </style>\n';
                            svg += '  </defs>\n';
                            svg += '  <rect width="100%" height="100%" fill="' + bgColor + '"/>\n';

                            // Title & Telemetry Header
                            svg += '  <g transform="translate(' + pad + ',' + (pad - 8) + ')">\n';
                            svg += '    <text x="0" y="24" fill="' + textPrimary + '" font-size="16" font-weight="700">' + escapeXml(titleStr) + '</text>\n';
                            svg += '    <rect x="' + (approxTitleW + 12) + '" y="10" width="' + headerPillW + '" height="18" rx="9" fill="' + statusCol.pillBg + '"/>\n';
                            svg += '    <text x="' + (approxTitleW + 12 + headerPillW / 2) + '" y="23" fill="' + statusCol.pillText + '" font-size="10" font-weight="bold" text-anchor="middle">' + runStatus + '</text>\n';
                            svg += '    <text x="' + (approxTitleW + headerPillW + 26) + '" y="23" fill="' + textSecondary + '" font-size="12">Duration: ' + escapeXml(durationStr) + '</text>\n';
                            svg += '  </g>\n';

                            svg += '  <g transform="translate(' + (pad - offsetX) + ',' + (pad + headerH - offsetY) + ')">\n';

                            // Connecting lines
                            if (svgEl) {
                                var paths = svgEl.querySelectorAll('path');
                                for (var p = 0; p < paths.length; p++) {
                                    var path = paths[p];
                                    var d = path.getAttribute('d');
                                    if (!d) continue;
                                    var cls = path.getAttribute('class') || '';
                                    var col = getConnectorPathColor(cls);
                                    svg += '    <path d="' + d + '" stroke="' + col + '" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n';
                                }
                                var circles = svgEl.querySelectorAll('circle');
                                for (var ci = 0; ci < circles.length; ci++) {
                                    var dot = circles[ci];
                                    var dotCls = dot.getAttribute('class') || '';
                                    var dotCol = getConnectorPathColor(dotCls);
                                    var dcx = parseFloat(dot.getAttribute('cx') || 0);
                                    var dcy = parseFloat(dot.getAttribute('cy') || 0);
                                    var dr = parseFloat(dot.getAttribute('r') || 3.5);
                                    svg += '    <circle cx="' + dcx + '" cy="' + dcy + '" r="' + dr + '" fill="' + dotCol + '"/>\n';
                                }
                            }

                            // Start Terminal Node
                            if (startNode) {
                                var scx = (sr.left - canvasRect.left) / zoom + sr.width / (zoom * 2);
                                var scy = (sr.top - canvasRect.top) / zoom + sr.height / (zoom * 2);
                                svg += '    <circle cx="' + scx + '" cy="' + scy + '" r="11" fill="rgba(16, 185, 129, 0.2)"/>\n';
                                svg += '    <circle cx="' + scx + '" cy="' + scy + '" r="7" fill="#10b981"/>\n';
                                svg += '    <text x="' + scx + '" y="' + (scy - 14) + '" fill="' + textSecondary + '" font-size="11" font-weight="bold" text-anchor="middle">Start</text>\n';
                            }

                            // Parallel Headers
                            for (var pl = 0; pl < pLabels.length; pl++) {
                                var plEl = pLabels[pl];
                                var plr = plEl.getBoundingClientRect();
                                var plx = (plr.left - canvasRect.left) / zoom;
                                var ply = (plr.top - canvasRect.top) / zoom;
                                var plw = plr.width / zoom;
                                var plh = plr.height / zoom;
                                var plNameEl = plEl.querySelector('.parallel-label-name') || plEl;
                                var rawPlName = plNameEl ? plNameEl.textContent.trim() : 'Parallel';
                                var xmlPlName = escapeXml(rawPlName);
                                var plBg = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.08)';
                                var plBorder = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.25)';
                                var plTextCol = isDark ? '#38bdf8' : '#0284c7';

                                svg += '    <g transform="translate(' + plx + ',' + ply + ')">\n';
                                svg += '      <rect width="' + plw + '" height="' + plh + '" rx="6" fill="' + plBg + '" stroke="' + plBorder + '" stroke-width="1"/>\n';
                                svg += '      <text x="8" y="16" fill="' + plTextCol + '" font-size="11" font-weight="600">' + xmlPlName + '</text>\n';
                                svg += '    </g>\n';
                            }

                            // Stage Cards (.stage-node)
                            for (var c = 0; c < cards.length; c++) {
                                var card = cards[c];
                                var cr = card.getBoundingClientRect();
                                var cx = (cr.left - canvasRect.left) / zoom;
                                var cy = (cr.top - canvasRect.top) / zoom;
                                var cw = cr.width / zoom;
                                var ch = cr.height / zoom;
                                var rawSt = (card.getAttribute('data-status') || 'SUCCESS').toUpperCase();
                                var cSt = formatExportStatusLabel(rawSt);
                                var cCol = getStageExportColors(rawSt, isDark);

                                var nameEl = card.querySelector('.stage-name');
                                var rawTitle = nameEl ? nameEl.textContent.trim() : 'Stage';
                                var durEl = card.querySelector('.stage-duration-val');
                                var rawDuration = durEl ? durEl.textContent.trim() : '';
                                var agentEl = card.querySelector('.stage-agent-badge');
                                var rawAgent = agentEl ? agentEl.textContent.trim() : '';

                                var pillW = Math.max(50, Math.min(68, cSt.length * 6.5 + 14));
                                var cardBg = isDark ? '#1e293b' : '#ffffff';
                                var dividerCol = isDark ? '#334155' : '#e2e8f0';
                                var agentCol = isDark ? '#38bdf8' : '#0284c7';

                                var displayTitle = rawTitle;
                                var maxTitleChars = Math.max(8, Math.floor((cw - pillW - 30) / 7.5));
                                if (displayTitle.length > maxTitleChars) {
                                    displayTitle = displayTitle.slice(0, maxTitleChars) + '...';
                                }

                                svg += '    <g transform="translate(' + cx + ',' + cy + ')">\n';
                                svg += '      <rect width="' + cw + '" height="' + ch + '" rx="10" fill="' + cardBg + '" stroke="' + cCol.border + '" stroke-width="1.5"/>\n';
                                svg += '      <rect x="2" y="2" width="4" height="' + (ch - 4) + '" rx="2" fill="' + cCol.path + '"/>\n';
                                svg += '      <text x="14" y="22" fill="' + textPrimary + '" font-size="12" font-weight="600">' + escapeXml(displayTitle) + '</text>\n';
                                svg += '      <rect x="' + (cw - pillW - 10) + '" y="10" width="' + pillW + '" height="16" rx="8" fill="' + cCol.pillBg + '"/>\n';
                                svg += '      <text x="' + (cw - 10 - pillW / 2) + '" y="22" fill="' + cCol.pillText + '" font-size="9" font-weight="bold" text-anchor="middle">' + cSt + '</text>\n';
                                svg += '      <line x1="10" y1="34" x2="' + (cw - 10) + '" y2="34" stroke="' + dividerCol + '" stroke-width="1"/>\n';
                                svg += '      <text x="14" y="50" fill="' + textSecondary + '" font-size="11">Duration:</text>\n';
                                svg += '      <text x="68" y="50" fill="' + textPrimary + '" font-size="11" font-weight="600">' + escapeXml(rawDuration) + '</text>\n';
                                if (rawAgent) {
                                    var displayAgent = rawAgent;
                                    var maxAgentChars = Math.max(8, Math.floor((cw - 70) / 7));
                                    if (displayAgent.length > maxAgentChars) {
                                        displayAgent = displayAgent.slice(0, maxAgentChars) + '...';
                                    }
                                    svg += '      <text x="14" y="66" fill="' + textSecondary + '" font-size="11">Agent:</text>\n';
                                    svg += '      <text x="56" y="66" fill="' + agentCol + '" font-size="10" font-weight="500">' + escapeXml(displayAgent) + '</text>\n';
                                }
                                svg += '    </g>\n';
                            }

                            // End Terminal Node
                            if (endNode) {
                                var ecx = (er.left - canvasRect.left) / zoom + er.width / (zoom * 2);
                                var ecy = (er.top - canvasRect.top) / zoom + er.height / (zoom * 2);
                                var endStatus = (endNode.getAttribute('data-status') || rawRunStatus).toUpperCase();
                                var endCol = getStageExportColors(endStatus, isDark);
                                svg += '    <circle cx="' + ecx + '" cy="' + ecy + '" r="13" fill="' + endCol.pillBg + '"/>\n';
                                svg += '    <circle cx="' + ecx + '" cy="' + ecy + '" r="9" fill="' + endCol.path + '"/>\n';
                                svg += '    <circle cx="' + ecx + '" cy="' + ecy + '" r="3.5" fill="#ffffff"/>\n';
                                svg += '    <text x="' + ecx + '" y="' + (ecy - 16) + '" fill="' + textSecondary + '" font-size="11" font-weight="bold" text-anchor="middle">End</text>\n';
                            }

                            svg += '  </g>\n</svg>';

                            var svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                            var svgUrl = URL.createObjectURL(svgBlob);
                            var downloadLink = document.createElement('a');
                            downloadLink.href = svgUrl;
                            downloadLink.download = 'pipeline-build-' + buildNum + '-dag.svg';
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);
                            setTimeout(function() { URL.revokeObjectURL(svgUrl); }, 15000);
                            showToast("Exported pipeline DAG as pure Vector SVG!", "success");
                            return;
                        }

                        // -------------------------------------------------------------
                        // EXPORT FORMAT: PNG (Direct Canvas 2D 2x Retina Rendering)
                        // -------------------------------------------------------------
                        var scale = 2;
                        var offscreenCanvas = document.createElement('canvas');
                        offscreenCanvas.width = totalW * scale;
                        offscreenCanvas.height = totalH * scale;
                        var ctx = offscreenCanvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.scale(scale, scale);

                        // Background fill
                        ctx.fillStyle = bgColor;
                        ctx.fillRect(0, 0, totalW, totalH);

                        // Title & Telemetry Header
                        ctx.fillStyle = textPrimary;
                        ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                        ctx.textAlign = 'left';
                        ctx.fillText(titleStr, pad, pad + 16);

                        var titleMetrics = ctx.measureText(titleStr);
                        var headerPillX = pad + titleMetrics.width + 12;
                        var headerPillW = Math.max(56, runStatus.length * 7 + 16);

                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(headerPillX, pad + 2, headerPillW, 18, 9);
                        else ctx.rect(headerPillX, pad + 2, headerPillW, 18);
                        ctx.fillStyle = statusCol.pillBg;
                        ctx.fill();

                        ctx.fillStyle = statusCol.pillText;
                        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(runStatus, headerPillX + headerPillW / 2, pad + 15);

                        ctx.textAlign = 'left';
                        ctx.fillStyle = textSecondary;
                        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                        ctx.fillText('Duration: ' + durationStr, headerPillX + headerPillW + 14, pad + 15);

                        // Connecting paths and cards translated into cropped view
                        ctx.save();
                        ctx.translate(pad - offsetX, pad + headerH - offsetY);

                        if (svgEl) {
                            var paths = svgEl.querySelectorAll('path');
                            for (var p = 0; p < paths.length; p++) {
                                var path = paths[p];
                                var d = path.getAttribute('d');
                                if (!d) continue;
                                var cls = path.getAttribute('class') || '';
                                var col = getConnectorPathColor(cls);
                                ctx.beginPath();
                                ctx.strokeStyle = col;
                                ctx.lineWidth = 2.5;
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                ctx.stroke(new Path2D(d));
                            }
                            var circles = svgEl.querySelectorAll('circle');
                            for (var ci = 0; ci < circles.length; ci++) {
                                var dot = circles[ci];
                                var dotCls = dot.getAttribute('class') || '';
                                var dotCol = getConnectorPathColor(dotCls);
                                var dcx = parseFloat(dot.getAttribute('cx') || 0);
                                var dcy = parseFloat(dot.getAttribute('cy') || 0);
                                var dr = parseFloat(dot.getAttribute('r') || 3.5);
                                ctx.beginPath();
                                ctx.arc(dcx, dcy, dr, 0, Math.PI * 2);
                                ctx.fillStyle = dotCol;
                                ctx.fill();
                            }
                        }

                        // Start Node
                        if (startNode) {
                            var scx = (sr.left - canvasRect.left) / zoom + sr.width / (zoom * 2);
                            var scy = (sr.top - canvasRect.top) / zoom + sr.height / (zoom * 2);
                            ctx.beginPath();
                            ctx.arc(scx, scy, 11, 0, Math.PI * 2);
                            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
                            ctx.fill();

                            ctx.beginPath();
                            ctx.arc(scx, scy, 7, 0, Math.PI * 2);
                            ctx.fillStyle = '#10b981';
                            ctx.fill();

                            ctx.fillStyle = textSecondary;
                            ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('Start', scx, scy - 14);
                        }

                        // Parallel labels
                        for (var pl = 0; pl < pLabels.length; pl++) {
                            var plEl = pLabels[pl];
                            var plr = plEl.getBoundingClientRect();
                            var plx = (plr.left - canvasRect.left) / zoom;
                            var ply = (plr.top - canvasRect.top) / zoom;
                            var plw = plr.width / zoom;
                            var plh = plr.height / zoom;
                            var plNameEl = plEl.querySelector('.parallel-label-name') || plEl;
                            var rawPlName = plNameEl ? plNameEl.textContent.trim() : 'Parallel';

                            ctx.beginPath();
                            if (ctx.roundRect) ctx.roundRect(plx, ply, plw, plh, 6);
                            else ctx.rect(plx, ply, plw, plh);
                            ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.08)';
                            ctx.fill();
                            ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.25)';
                            ctx.lineWidth = 1;
                            ctx.stroke();

                            ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
                            ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                            ctx.textAlign = 'left';
                            ctx.fillText(rawPlName, plx + 8, ply + 16);
                        }

                        // Stage Cards (.stage-node)
                        for (var c = 0; c < cards.length; c++) {
                            var card = cards[c];
                            var cr = card.getBoundingClientRect();
                            var cx = (cr.left - canvasRect.left) / zoom;
                            var cy = (cr.top - canvasRect.top) / zoom;
                            var cw = cr.width / zoom;
                            var ch = cr.height / zoom;
                            var rawSt = (card.getAttribute('data-status') || 'SUCCESS').toUpperCase();
                            var cSt = formatExportStatusLabel(rawSt);
                            var cCol = getStageExportColors(rawSt, isDark);

                            var nameEl = card.querySelector('.stage-name');
                            var rawTitle = nameEl ? nameEl.textContent.trim() : 'Stage';
                            var durEl = card.querySelector('.stage-duration-val');
                            var rawDuration = durEl ? durEl.textContent.trim() : '';
                            var agentEl = card.querySelector('.stage-agent-badge');
                            var rawAgent = agentEl ? agentEl.textContent.trim() : '';

                            var pillW = Math.max(50, Math.min(68, cSt.length * 6.5 + 14));
                            var pillX = cx + cw - pillW - 10;
                            var pillY = cy + 10;

                            // Card background & border
                            ctx.beginPath();
                            if (ctx.roundRect) ctx.roundRect(cx, cy, cw, ch, 10);
                            else ctx.rect(cx, cy, cw, ch);
                            ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
                            ctx.fill();
                            ctx.strokeStyle = cCol.border;
                            ctx.lineWidth = 1.5;
                            ctx.stroke();

                            // Accent strip
                            ctx.beginPath();
                            if (ctx.roundRect) ctx.roundRect(cx + 2, cy + 2, 4, ch - 4, 2);
                            else ctx.rect(cx + 2, cy + 2, 4, ch - 4);
                            ctx.fillStyle = cCol.path;
                            ctx.fill();

                            // Stage title
                            ctx.textAlign = 'left';
                            ctx.fillStyle = textPrimary;
                            ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                            var maxTitleW = cw - pillW - 26;
                            var displayTitle = rawTitle;
                            if (ctx.measureText(displayTitle).width > maxTitleW) {
                                while (displayTitle.length > 3 && ctx.measureText(displayTitle + '...').width > maxTitleW) {
                                    displayTitle = displayTitle.slice(0, -1);
                                }
                                displayTitle += '...';
                            }
                            ctx.fillText(displayTitle, cx + 14, cy + 22);

                            // Status pill
                            ctx.beginPath();
                            if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, 16, 8);
                            else ctx.rect(pillX, pillY, pillW, 16);
                            ctx.fillStyle = cCol.pillBg;
                            ctx.fill();

                            ctx.fillStyle = cCol.pillText;
                            ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText(cSt, pillX + pillW / 2, pillY + 11.5);

                            // Divider
                            ctx.beginPath();
                            ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0';
                            ctx.lineWidth = 1;
                            ctx.moveTo(cx + 10, cy + 34);
                            ctx.lineTo(cx + cw - 10, cy + 34);
                            ctx.stroke();

                            // Duration
                            ctx.textAlign = 'left';
                            ctx.fillStyle = textSecondary;
                            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                            ctx.fillText('Duration:', cx + 14, cy + 50);
                            ctx.fillStyle = textPrimary;
                            ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                            ctx.fillText(rawDuration, cx + 68, cy + 50);

                            // Agent
                            if (rawAgent) {
                                ctx.fillStyle = textSecondary;
                                ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                                ctx.fillText('Agent:', cx + 14, cy + 66);
                                ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
                                ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                                var maxAgentW = cw - 70;
                                var displayAgent = rawAgent;
                                if (ctx.measureText(displayAgent).width > maxAgentW) {
                                    while (displayAgent.length > 3 && ctx.measureText(displayAgent + '...').width > maxAgentW) {
                                        displayAgent = displayAgent.slice(0, -1);
                                    }
                                    displayAgent += '...';
                                }
                                ctx.fillText(displayAgent, cx + 56, cy + 66);
                            }
                        }

                        // End Node
                        if (endNode) {
                            var ecx = (er.left - canvasRect.left) / zoom + er.width / (zoom * 2);
                            var ecy = (er.top - canvasRect.top) / zoom + er.height / (zoom * 2);
                            var endStatus = (endNode.getAttribute('data-status') || rawRunStatus).toUpperCase();
                            var endCol = getStageExportColors(endStatus, isDark);

                            ctx.beginPath();
                            ctx.arc(ecx, ecy, 13, 0, Math.PI * 2);
                            ctx.fillStyle = endCol.pillBg;
                            ctx.fill();

                            ctx.beginPath();
                            ctx.arc(ecx, ecy, 9, 0, Math.PI * 2);
                            ctx.fillStyle = endCol.path;
                            ctx.fill();

                            ctx.beginPath();
                            ctx.arc(ecx, ecy, 3.5, 0, Math.PI * 2);
                            ctx.fillStyle = '#ffffff';
                            ctx.fill();

                            ctx.fillStyle = textSecondary;
                            ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.fillText('End', ecx, ecy - 16);
                        }

                        ctx.restore();

                        // Save PNG
                        if (offscreenCanvas.toBlob) {
                            offscreenCanvas.toBlob(function(pngBlob) {
                                if (!pngBlob) {
                                    showToast("Failed generating PNG image", "error");
                                    return;
                                }
                                var pngUrl = URL.createObjectURL(pngBlob);
                                var pngLink = document.createElement('a');
                                pngLink.href = pngUrl;
                                pngLink.download = 'pipeline-build-' + buildNum + '-dag.png';
                                document.body.appendChild(pngLink);
                                pngLink.click();
                                document.body.removeChild(pngLink);
                                setTimeout(function() { URL.revokeObjectURL(pngUrl); }, 15000);
                                showToast("Exported high-resolution PNG snapshot!", "success");
                            }, 'image/png');
                        } else {
                            var dataUrl = offscreenCanvas.toDataURL('image/png');
                            var pngLink = document.createElement('a');
                            pngLink.href = dataUrl;
                            pngLink.download = 'pipeline-build-' + buildNum + '-dag.png';
                            document.body.appendChild(pngLink);
                            pngLink.click();
                            document.body.removeChild(pngLink);
                            showToast("Exported high-resolution PNG snapshot!", "success");
                        }
                    } catch (err) {
                        console.error("Canvas export exception:", err);
                        showToast("Error exporting canvas: " + err.message, "error");
                    }
                }

                function exportPipelineJson() {
                    closeExportMenu();
                    if (!graphData) {
                        showToast("No pipeline telemetry data available to export", "error");
                        return;
                    }
                    var exportPayload = {
                        metadata: {
                            exportedAt: new Date().toISOString(),
                            horizonVersion: "999999-SNAPSHOT",
                            pageUrl: window.location.href.split('#')[0]
                        },
                        pipeline: graphData
                    };
                    var jsonText = JSON.stringify(exportPayload, null, 2);
                    var blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
                    var url = URL.createObjectURL(blob);
                    var link = document.createElement('a');
                    link.href = url;
                    link.download = 'pipeline-build-' + (graphData.number || 'run') + '-telemetry.json';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(function() { URL.revokeObjectURL(url); }, 15000);
                    showToast("Exported build telemetry JSON (" + (graphData.stages ? graphData.stages.length : 0) + " stages)!", "success");
                }

                function copyPipelineJsonToClipboard() {
                    closeExportMenu();
                    if (!graphData) {
                        showToast("No pipeline telemetry data available to copy", "error");
                        return;
                    }
                    var exportPayload = {
                        metadata: {
                            exportedAt: new Date().toISOString(),
                            horizonVersion: "999999-SNAPSHOT",
                            pageUrl: window.location.href.split('#')[0]
                        },
                        pipeline: graphData
                    };
                    var jsonText = JSON.stringify(exportPayload, null, 2);
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(jsonText).then(function() {
                            showToast("Copied full telemetry JSON to clipboard!", "success");
                        }).catch(function() {
                            promptCopyText(jsonText);
                        });
                    } else {
                        promptCopyText(jsonText);
                    }
                }

                function renderStagePickerList(filterQuery) {
                    var listContainer = document.getElementById('stage-picker-items');
                    if (!listContainer || !graphData || !graphData.stages) return;

                    var allStages = getAllStagesFlat(graphData.stages);
                    var q = (filterQuery || '').trim().toLowerCase();
                    var html = '';

                    for (var i = 0; i < allStages.length; i++) {
                        var st = allStages[i];
                        if (st.name === 'Declarative: Post Actions') continue;
                        if (q && st.name.toLowerCase().indexOf(q) === -1) continue;

                        var stat = (st.status || 'SUCCESS').toUpperCase();
                        var dotCls = 'dot-success';
                        if (stat === 'FAILED' || stat === 'FAILURE') dotCls = 'dot-failed';
                        else if (stat === 'UNSTABLE') dotCls = 'dot-unstable';
                        else if (stat === 'IN_PROGRESS') dotCls = 'dot-in-progress';
                        else if (stat === 'PAUSED_INPUT') dotCls = 'dot-paused-input';
                        else if (stat.indexOf('SKIPPED') !== -1 || stat === 'NOT_EXECUTED') dotCls = 'dot-skipped';

                        var isAct = (st.id === selectedStageId);
                        var durStr = st.durationMillis ? formatStepDuration(st.durationMillis) : '';

                        html += '<div class="stage-picker-item' + (isAct ? ' active' : '') + '" role="option" aria-selected="' + (isAct ? 'true' : 'false') + '" tabindex="0" onclick="selectStageFromPicker(\'' + st.id + '\')" onkeydown="handleStagePickerItemKey(event, \'' + st.id + '\')">';
                        html += '<div class="stage-picker-item-left">';
                        html += '<span class="stage-picker-dot ' + dotCls + '" aria-hidden="true"></span>';
                        html += '<span class="stage-picker-name" title="' + escapeHtml(st.name) + '">' + escapeHtml(st.name) + '</span>';
                        html += '</div>';
                        if (durStr) {
                            html += '<span class="stage-picker-dur">' + durStr + '</span>';
                        }
                        html += '</div>';
                    }

                    if (!html) {
                        html = '<div style="padding:0.75rem; text-align:center; color:#94a3b8; font-size:0.75rem;">No stages match filter</div>';
                    }
                    listContainer.innerHTML = html;
                }

                function filterStagePickerItems(query) {
                    renderStagePickerList(query);
                }

                function selectStageFromPicker(stageId) {
                    closeStagePicker();
                    selectStage(stageId, false);
                    setTimeout(function() {
                        scrollStageIntoPipelineView(stageId, true);
                    }, 50);
                }

                function handleStagePickerKey(event) {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closeStagePicker();
                        var btn = document.getElementById('btn-stage-picker');
                        if (btn) btn.focus();
                    } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        var firstItem = document.querySelector('.stage-picker-item');
                        if (firstItem) firstItem.focus();
                    }
                }

                function handleStagePickerItemKey(event, stageId) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectStageFromPicker(stageId);
                    } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        var next = event.target.nextElementSibling;
                        if (next && next.classList.contains('stage-picker-item')) next.focus();
                    } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        var prev = event.target.previousElementSibling;
                        if (prev && prev.classList.contains('stage-picker-item')) {
                            prev.focus();
                        } else {
                            var search = document.getElementById('stage-picker-search-input');
                            if (search) search.focus();
                        }
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        closeStagePicker();
                        var btn = document.getElementById('btn-stage-picker');
                        if (btn) btn.focus();
                    }
                }

                // Pick the step a reader actually wants: the leaf that failed / is running, rather than the
                // closure (withCredentials, dir, ...) wrapped around it, which only inherits that status.
                function pickLeafStepByStatus(steps, statuses) {
                    if (!steps || steps.length === 0) return null;
                    var firstAny = null;
                    for (var s = 0; s < steps.length; s++) {
                        var stat = (steps[s].status || '').toUpperCase();
                        if (statuses.indexOf(stat) === -1) continue;
                        if (!firstAny) firstAny = steps[s];
                        if (!isStepGroup(steps[s])) return steps[s];
                    }
                    return firstAny;
                }

                function findAutoJumpTarget(data) {
                    if (!data || !data.stages || data.stages.length === 0) return null;
                    var allStages = getAllStagesFlat(data.stages);

                    // 1. First look for FAILED or FAILURE on selectable leaf stages (skipping parallel/matrix wrapper containers)
                    for (var i = 0; i < allStages.length; i++) {
                        var st = allStages[i];
                        if (st.children && st.children.length > 0) continue;
                        var status = (st.status || '').toUpperCase();
                        if (status === 'FAILED' || status === 'FAILURE') {
                            var failStep = pickLeafStepByStatus(st.steps, ['FAILED', 'FAILURE']);
                            if (!failStep && st.steps && st.steps.length > 0) failStep = st.steps[st.steps.length - 1];
                            return { stage: st, step: failStep, type: 'failure' };
                        }
                    }

                    // 2. Next look for UNSTABLE on selectable leaf stages
                    for (var i = 0; i < allStages.length; i++) {
                        var st = allStages[i];
                        if (st.children && st.children.length > 0) continue;
                        var status = (st.status || '').toUpperCase();
                        if (status === 'UNSTABLE') {
                            return { stage: st, step: pickLeafStepByStatus(st.steps, ['UNSTABLE']), type: 'unstable' };
                        }
                    }

                    // 3. Next look for PAUSED_INPUT on selectable leaf stages
                    for (var i = 0; i < allStages.length; i++) {
                        var st = allStages[i];
                        if (st.children && st.children.length > 0) continue;
                        if ((st.status || '').toUpperCase() === 'PAUSED_INPUT') {
                            return { stage: st, step: pickLeafStepByStatus(st.steps, ['PAUSED_INPUT']), type: 'paused_input' };
                        }
                    }

                    // 4. If build is active, look for IN_PROGRESS on selectable leaf stages
                    if (data.building || data.result === 'IN_PROGRESS') {
                        for (var i = 0; i < allStages.length; i++) {
                            var st = allStages[i];
                            if (st.children && st.children.length > 0) continue;
                            if ((st.status || '').toUpperCase() === 'IN_PROGRESS') {
                                var runtime = computeStepRuntime(st);
                                var progStep = runtime.current || pickLeafStepByStatus(st.steps, ['IN_PROGRESS']);
                                return { stage: st, step: progStep, type: 'in_progress' };
                            }
                        }
                    }

                    return null;
                }

                function showAutoJumpNotice(autoTarget) {
                    var noticeBar = document.getElementById('autojump-notice-bar');
                    var badge = document.getElementById('stage-banner-autojump-badge');
                    var badgeText = document.getElementById('stage-banner-autojump-text');
                    if (noticeBar) noticeBar.style.display = 'none';

                    var stName = autoTarget.stage ? autoTarget.stage.name : '';
                    var spName = autoTarget.step ? (autoTarget.step.displayName || autoTarget.step.name) : '';
                    var targetDesc = spName ? ('step "' + spName + '" in stage "' + stName + '"') : ('stage "' + stName + '"');

                    if (badge) {
                        badge.style.display = 'inline-flex';
                        badge.title = 'Failure Auto-Jump: Landed directly on failed ' + targetDesc;
                        if (badgeText) badgeText.innerText = 'AUTO-JUMP';
                    }
                }

                function dismissAutoJumpNotice() {
                    var noticeBar = document.getElementById('autojump-notice-bar');
                    if (noticeBar) noticeBar.style.display = 'none';
                    var badge = document.getElementById('stage-banner-autojump-badge');
                    if (badge) badge.style.display = 'none';
                }

                function resetPipelineViewToStart() {
                    dismissAutoJumpNotice();
                    if (!graphData || !graphData.stages || graphData.stages.length === 0) return;
                    var firstStage = graphData.stages[0];
                    if (firstStage.children && firstStage.children.length > 0) {
                        firstStage = firstStage.children[0];
                    }
                    selectStage(firstStage.id, false);
                    var flow = document.getElementById('pipeline-flow');
                    if (flow) {
                        flow.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
                    }
                    showToast("Reset view to first stage: " + firstStage.name, "info");
                }

                function copyStepConsoleLog(stepId) {
                    var text = stepLogsCache[stepId] || "";
                    if (selectedStepId === stepId && selectedLineStart !== null) {
                        var rawLines = text.split('\n');
                        var selectedText = [];
                        var startIdx = Math.max(0, selectedLineStart);
                        var endIdx = Math.min(rawLines.length - 1, selectedLineEnd);
                        for (var i = startIdx; i <= endIdx; i++) {
                            selectedText.push(rawLines[i]);
                        }
                        var result = selectedText.join('\n');
                        var label = (selectedLineStart === selectedLineEnd) ? ("Line " + selectedLineStart) : ("Lines " + selectedLineStart + "-" + selectedLineEnd);
                        copyTextToClipboard(result, label + " copied to clipboard!");
                    } else {
                        copyTextToClipboard(text, "Step console log copied to clipboard!");
                    }
                }

                function toggleStageActionsMenu(event) {
                    if (event) event.stopPropagation();
                    var menu = document.getElementById('stage-actions-menu');
                    var btn = document.getElementById('btn-stage-menu');
                    if (!menu) return;
                    var isOpen = menu.classList.contains('show');
                    if (isOpen) {
                        menu.classList.remove('show');
                        if (btn) btn.setAttribute('aria-expanded', 'false');
                    } else {
                        menu.classList.add('show');
                        if (btn) btn.setAttribute('aria-expanded', 'true');
                    }
                }

                document.addEventListener('click', function(e) {
                    var stageMenu = document.getElementById('stage-actions-menu');
                    var stageBtn = document.getElementById('btn-stage-menu');
                    if (stageMenu && stageMenu.classList.contains('show') && (!stageBtn || !stageBtn.contains(e.target)) && !stageMenu.contains(e.target)) {
                        stageMenu.classList.remove('show');
                        if (stageBtn) stageBtn.setAttribute('aria-expanded', 'false');
                    }
                    var pickerWrap = document.getElementById('stage-picker-wrap');
                    if (pickerWrap && !pickerWrap.contains(e.target)) {
                        closeStagePicker();
                    }
                    var exportWrap = document.getElementById('graph-export-wrap');
                    if (exportWrap && !exportWrap.contains(e.target)) {
                        closeExportMenu();
                    }
                });

                function handleStepRowKey(event, stepId) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleStepAccordion(stepId);
                    } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        var allRows = Array.from(document.querySelectorAll('.accordion-step-row')).filter(function(r) { return r.offsetParent !== null; });
                        var idx = allRows.findIndex(function(r) { return r.id === 'step-row-' + stepId; });
                        if (idx !== -1 && idx < allRows.length - 1) {
                            allRows[idx + 1].focus();
                        }
                    } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        var allRows = Array.from(document.querySelectorAll('.accordion-step-row')).filter(function(r) { return r.offsetParent !== null; });
                        var idx = allRows.findIndex(function(r) { return r.id === 'step-row-' + stepId; });
                        if (idx > 0) {
                            allRows[idx - 1].focus();
                        }
                    }
                }

                function fixMojibake(str) {
                    if (!str || typeof str !== 'string') return str;
                    if (!/[\u00C2-\u00F4]/.test(str)) return str;
                    try {
                        return str.replace(/([\u00C2-\u00F4][\u0080-\u00BF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]+)/g, function(chunk) {
                            var cp1252 = {
                                0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86,
                                0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
                                0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95,
                                0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
                                0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
                            };
                            var bytes = [];
                            for (var i = 0; i < chunk.length; i++) {
                                var code = chunk.charCodeAt(i);
                                var b = code < 256 ? code : cp1252[code];
                                if (b === undefined) return chunk;
                                bytes.push(b);
                            }
                            try {
                                var decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
                                if (decoded && !decoded.includes('\uFFFD')) {
                                    return decoded;
                                }
                            } catch (e) {}
                            return chunk;
                        });
                    } catch (e) {
                        return str;
                    }
                }

                function escapeHtml(str) {
                    if (!str) return "";
                    var fixed = fixMojibake(str);
                    var div = document.createElement('div');
                    div.textContent = fixed;
                    return div.innerHTML;
                }

                function selectStep(stepId, stepName, skipHistoryUpdate, targetLineRange) {
                    toggleStepAccordion(stepId, targetLineRange, true);
                    if (!skipHistoryUpdate) {
                        updateUrlHash(selectedStageId, stepId, targetLineRange ? targetLineRange.start : null, targetLineRange ? targetLineRange.end : null, true);
                    }
                }

                function renderLogLines(text, initialLineRange) {
                    if (selectedStepId) {
                        renderStepLogLines(selectedStepId, text, initialLineRange);
                    }
                }

                function filterLog() {
                    if (selectedStepId) {
                        var searchInput = document.getElementById('log-search-' + selectedStepId);
                        var query = searchInput ? searchInput.value : '';
                        filterStepLog(selectedStepId, query);
                    }
                }

                function showToast(message, type) {
                    var container = document.getElementById('horizon-toast-container');
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'horizon-toast-container';
                        container.className = 'horizon-toast-container';
                        document.body.appendChild(container);
                    }
                    var toast = document.createElement('div');
                    toast.className = 'horizon-toast toast-' + (type || 'info');

                    var iconSvg = (type === 'success') 
                        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
                        : (type === 'error')
                        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

                    toast.innerHTML = iconSvg + '<span>' + message + '</span>';
                    container.appendChild(toast);

                    setTimeout(function() {
                        toast.classList.add('show');
                    }, 10);

                    setTimeout(function() {
                        toast.classList.remove('show');
                        setTimeout(function() {
                            if (toast.parentNode) {
                                toast.parentNode.removeChild(toast);
                            }
                        }, 300);
                    }, 4000);
                }

                function copyLog() {
                    if (selectedLineStart !== null) {
                        var rawLines = fullLogText.split('\n');
                        var selectedText = [];
                        var startIdx = Math.max(0, selectedLineStart - 1);
                        var endIdx = Math.min(rawLines.length, selectedLineEnd);
                        for (var i = startIdx; i < endIdx; i++) {
                            selectedText.push(rawLines[i]);
                        }
                        var result = selectedText.join('\n');
                        var label = (selectedLineStart === selectedLineEnd) ? ("Line " + selectedLineStart) : ("Lines " + selectedLineStart + "-" + selectedLineEnd);
                        copyTextToClipboard(result, label + " copied to clipboard!");
                    } else {
                        copyTextToClipboard(fullLogText, "Full step console log copied to clipboard!");
                    }
                }

                function getCrumbHeaders() {
                    var headers = {};
                    var headerName = document.head.getAttribute('data-crumb-header');
                    var headerValue = document.head.getAttribute('data-crumb-value');
                    if (headerName && headerValue) {
                        headers[headerName] = headerValue;
                    }
                    return headers;
                }

                function findStageAndParent(stages, id) {
                    if (!stages || !id) return { stage: null, parent: null };
                    for (var i = 0; i < stages.length; i++) {
                        if (stages[i].id === id) return { stage: stages[i], parent: null };
                        if (stages[i].children) {
                            for (var c = 0; c < stages[i].children.length; c++) {
                                if (stages[i].children[c].id === id) return { stage: stages[i].children[c], parent: stages[i] };
                            }
                        }
                    }
                    return { stage: null, parent: null };
                }

                function renderPipelineActionsRestartList() {
                    var restartSection = document.getElementById('menu-restart-section');
                    var restartStagesList = document.getElementById('menu-restart-stages-list');
                    var restartCountEl = document.getElementById('menu-restart-count');
                    if (!restartSection || !restartStagesList) return;
                    if (!graphData || !graphData.restartEnabled || !graphData.stages || graphData.stages.length === 0) {
                        restartSection.style.display = "none";
                        return;
                    }

                    var restartableList = graphData.restartableStages || [];
                    if (restartableList.length === 0) {
                        restartSection.style.display = "none";
                        return;
                    }

                    restartSection.style.display = "block";
                    var curStageInfo = findStageAndParent(graphData.stages, selectedStageId);
                    var curStage = curStageInfo.stage;
                    var parentStage = curStageInfo.parent;

                    var activeStageName = curStage ? curStage.name : null;
                    var parentStageName = parentStage ? parentStage.name : null;

                    // Collect all top-level stages from the pipeline execution (excluding synthetic post actions)
                    var topLevelStages = (graphData.stages || []).filter(function(st) {
                        return st.name !== 'Declarative: Post Actions';
                    });

                    if (restartCountEl) {
                        if (restartableList.length < topLevelStages.length) {
                            restartCountEl.innerText = '(' + restartableList.length + ' of ' + topLevelStages.length + ' available)';
                        } else {
                            restartCountEl.innerText = '(' + restartableList.length + ')';
                        }
                    }

                    var stageHtml = "";
                    for (var s = 0; s < topLevelStages.length; s++) {
                        var st = topLevelStages[s];
                        var sName = st.name;
                        var isRestartable = restartableList.indexOf(sName) !== -1;

                        var isCurrentActive = (activeStageName && activeStageName === sName);
                        var isParentActive = (!isCurrentActive && parentStageName && parentStageName === sName);
                        var isHighlighted = isCurrentActive || isParentActive;

                        var escapedSName = sName.replace(/'/g, "\\'");
                        var activeClass = isHighlighted ? " active-stage" : "";
                        var ariaAttr = isHighlighted ? ' aria-current="true"' : '';

                        if (isRestartable) {
                            var titleAttr = isHighlighted
                                ? ' title="Restart pipeline from actively selected stage: ' + escapeHtml(sName) + '"'
                                : ' title="Restart pipeline from stage: ' + escapeHtml(sName) + '"';

                            stageHtml += '<button type="button" class="restart-stage-menu-item' + activeClass + '" role="menuitem"' + ariaAttr + titleAttr + ' onclick="triggerRestartStageFromMenu(\'' + escapedSName + '\')">';
                            stageHtml += '<span class="restart-stage-icon-wrap" aria-hidden="true">';
                            stageHtml += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
                            stageHtml += '</span>';
                            stageHtml += '<span class="restart-stage-name">' + escapeHtml(sName) + '</span>';
                            if (isHighlighted) {
                                stageHtml += '<span class="restart-stage-badge-selected" aria-label="Currently selected stage"><span class="badge-dot" aria-hidden="true"></span>Selected</span>';
                            }
                            stageHtml += '</button>';
                        } else {
                            var disabledTitle = 'Cannot restart from this stage: Jenkins Declarative Pipeline only allows restarting from stages executed prior to failure (this stage was not reached in this build).';
                            stageHtml += '<button type="button" class="restart-stage-menu-item is-disabled' + activeClass + '" role="menuitem" disabled="disabled" title="' + disabledTitle + '">';
                            stageHtml += '<span class="restart-stage-icon-wrap" aria-hidden="true">';
                            stageHtml += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
                            stageHtml += '</span>';
                            stageHtml += '<span class="restart-stage-name">' + escapeHtml(sName) + '</span>';
                            if (isHighlighted) {
                                stageHtml += '<span class="restart-stage-badge-disabled">Selected \u2022 Not Reached</span>';
                            } else {
                                stageHtml += '<span class="restart-stage-badge-disabled">Not Reached</span>';
                            }
                            stageHtml += '</button>';
                        }
                    }
                    restartStagesList.innerHTML = stageHtml;
                }

                function togglePipelineActionsDropdown(event) {
                    if (event) event.stopPropagation();
                    var menu = document.getElementById('pipeline-actions-menu');
                    var btn = document.getElementById('btn-pipeline-actions');
                    if (!menu) return;
                    var isOpen = menu.classList.contains('show');
                    if (isOpen) {
                        menu.classList.remove('show');
                        if (btn) btn.setAttribute('aria-expanded', 'false');
                    } else {
                        renderPipelineActionsRestartList();
                        menu.classList.add('show');
                        if (btn) btn.setAttribute('aria-expanded', 'true');
                    }
                }

                function closePipelineActionsDropdown() {
                    var menu = document.getElementById('pipeline-actions-menu');
                    var btn = document.getElementById('btn-pipeline-actions');
                    if (menu && menu.classList.contains('show')) {
                        menu.classList.remove('show');
                        if (btn) btn.setAttribute('aria-expanded', 'false');
                    }
                }

                function handleMenuAbort() {
                    closePipelineActionsDropdown();
                    triggerAbortRun();
                }

                function triggerAbortRun() {
                    if (!graphData || !graphData.building) return;
                    if (!confirm("Are you sure you want to stop / cancel Build #" + graphData.number + "?")) {
                        return;
                    }
                    var btn = document.getElementById('btn-abort-run');
                    if (btn) btn.disabled = true;
                    showToast("Stopping Build #" + graphData.number + "...", "info");

                    fetch(horizonBaseUrl + 'apiAbort', {
                        method: 'POST',
                        headers: getCrumbHeaders()
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (btn) btn.disabled = false;
                        if (data.status === 'ok') {
                            showToast(data.message || "Build cancellation requested.", "success");
                            setTimeout(fetchGraph, 1200);
                        } else {
                            showToast("Stop build failed: " + (data.message || "Unknown error"), "error");
                        }
                    })
                    .catch(function(err) {
                        if (btn) btn.disabled = false;
                        showToast("Stop build request error: " + err, "error");
                    });
                }

                function renderPendingInputBanner(data) {
                    var banner = document.getElementById('pending-input-banner');
                    var content = document.getElementById('pending-input-content');
                    if (!banner || !content) return;

                    var inputs = (data && data.pendingInputs) ? data.pendingInputs : [];
                    if (!inputs || inputs.length === 0) {
                        banner.style.display = 'none';
                        return;
                    }

                    var inp = inputs[0];
                    var msg = inp.message || "Pipeline is paused awaiting user input approval";
                    var hasParams = inp.parameters && inp.parameters.length > 0;
                    var okLabel = inp.okLabel || "Proceed";
                    var countBadge = inputs.length > 1 ? (' <span class="horizon-badge badge-paused_input" style="font-size:0.65rem; padding:1px 6px;">' + inputs.length + ' pending</span>') : '';

                    var html = '<div class="pending-input-header">';
                    html += '<div class="pending-input-info">';
                    html += '<div class="pending-input-title">';
                    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>';
                    html += '<span>Pipeline Awaiting Input Approval</span>' + countBadge;
                    html += '</div>';
                    html += '<div class="pending-input-message">' + escapeHtml(msg) + (hasParams ? (' <span style="opacity:0.75; font-size:0.76rem;">(' + inp.parameters.length + ' parameter' + (inp.parameters.length === 1 ? '' : 's') + ' required)</span>') : '') + '</div>';
                    html += '</div>';
                    html += '<div class="pending-input-actions">';
                    if (hasParams) {
                        html += '<button type="button" class="btn-input-proceed" onclick="openInputApprovalModal(0)">';
                        html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> ';
                        html += 'Configure &amp; ' + escapeHtml(okLabel);
                        html += '</button>';
                    } else {
                        html += '<button type="button" class="btn-input-proceed" onclick="triggerQuickInputProceed(0)">';
                        html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> ';
                        html += escapeHtml(okLabel);
                        html += '</button>';
                        html += '<button type="button" class="btn-modal-cancel" style="padding:0.42rem 0.75rem; font-size:0.78rem;" onclick="openInputApprovalModal(0)">Details...</button>';
                    }
                    html += '<button type="button" class="btn-input-abort" onclick="triggerQuickInputAbort(0)">';
                    html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> ';
                    html += 'Abort';
                    html += '</button>';
                    html += '</div>';
                    html += '</div>';

                    content.innerHTML = html;
                    banner.style.display = 'block';
                }

                function openInputApprovalModal(index) {
                    if (!graphData || !graphData.pendingInputs || !graphData.pendingInputs.length) return;
                    currentActiveInputIndex = (typeof index === 'number' && index >= 0 && index < graphData.pendingInputs.length) ? index : 0;
                    var inp = graphData.pendingInputs[currentActiveInputIndex];
                    var modal = document.getElementById('input-approval-modal');
                    var body = document.getElementById('input-approval-body');
                    var proceedBtn = document.getElementById('btn-modal-input-proceed');
                    if (!modal || !body) return;

                    if (proceedBtn) {
                        proceedBtn.innerText = inp.okLabel || 'Proceed';
                        proceedBtn.disabled = false;
                    }

                    var html = '';
                    if (graphData.pendingInputs.length > 1) {
                        html += '<div style="display:flex; gap:0.4rem; margin-bottom:0.85rem; flex-wrap:wrap;">';
                        for (var k = 0; k < graphData.pendingInputs.length; k++) {
                            var activeCls = (k === currentActiveInputIndex) ? ' active' : '';
                            html += '<button type="button" class="tests-filter-tab' + activeCls + '" onclick="openInputApprovalModal(' + k + ')">Input #' + (k + 1) + ' (' + escapeHtml(graphData.pendingInputs[k].id) + ')</button>';
                        }
                        html += '</div>';
                    }

                    html += '<div style="background:rgba(139, 92, 246, 0.1); border:1px solid rgba(139, 92, 246, 0.28); border-radius:8px; padding:0.85rem 1rem; margin-bottom:0.85rem;">';
                    html += '<div style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#a78bfa; margin-bottom:0.25rem;">Prompt Message</div>';
                    html += '<div style="font-size:0.95rem; font-weight:600; color:var(--text-primary, #f8fafc);">' + escapeHtml(inp.message || 'Proceed with pipeline execution?') + '</div>';
                    if (inp.submitter) {
                        html += '<div style="font-size:0.74rem; color:#94a3b8; margin-top:0.35rem;">Allowed submitters: <strong>' + escapeHtml(inp.submitter) + '</strong></div>';
                    }
                    html += '</div>';

                    var params = inp.parameters || [];
                    if (params.length > 0) {
                        html += '<div style="display:flex; flex-direction:column; gap:0.75rem;">';
                        for (var i = 0; i < params.length; i++) {
                            var p = params[i];
                            var pName = p.name || ('param_' + i);
                            var pType = (p.type || '').toLowerCase();
                            var defVal = (p.defaultValue !== undefined && p.defaultValue !== null) ? String(p.defaultValue) : '';
                            html += '<div class="input-param-group">';
                            html += '<label class="input-param-label" for="horizon-input-param-' + i + '">' + escapeHtml(pName) + '</label>';
                            if (p.description) {
                                html += '<div class="input-param-desc">' + escapeHtml(p.description) + '</div>';
                            }
                            if (p.choices && p.choices.length > 0) {
                                html += '<select class="input-param-control" id="horizon-input-param-' + i + '" data-param-name="' + escapeHtml(pName) + '" data-param-type="choice">';
                                for (var c = 0; c < p.choices.length; c++) {
                                    var ch = p.choices[c];
                                    var sel = (ch === defVal) ? ' selected="selected"' : '';
                                    html += '<option value="' + escapeHtml(ch) + '"' + sel + '>' + escapeHtml(ch) + '</option>';
                                }
                                html += '</select>';
                            } else if (pType.indexOf('boolean') !== -1) {
                                var isChecked = (defVal === 'true') ? ' checked="checked"' : '';
                                html += '<label style="display:inline-flex; align-items:center; gap:0.5rem; font-size:0.84rem; cursor:pointer; margin-top:0.2rem;">';
                                html += '<input type="checkbox" id="horizon-input-param-' + i + '" data-param-name="' + escapeHtml(pName) + '" data-param-type="boolean"' + isChecked + ' />';
                                html += '<span>Enabled / True</span></label>';
                            } else if (pType.indexOf('text') !== -1) {
                                html += '<textarea class="input-param-control" rows="3" id="horizon-input-param-' + i + '" data-param-name="' + escapeHtml(pName) + '" data-param-type="text">' + escapeHtml(defVal) + '</textarea>';
                            } else if (pType.indexOf('password') !== -1) {
                                html += '<input type="password" class="input-param-control" id="horizon-input-param-' + i + '" data-param-name="' + escapeHtml(pName) + '" data-param-type="password" value="' + escapeHtml(defVal) + '" />';
                            } else {
                                html += '<input type="text" class="input-param-control" id="horizon-input-param-' + i + '" data-param-name="' + escapeHtml(pName) + '" data-param-type="string" value="' + escapeHtml(defVal) + '" />';
                            }
                            html += '</div>';
                        }
                        html += '</div>';
                    } else {
                        html += '<div style="font-size:0.82rem; color:#94a3b8;">No additional parameters are required for this input step. Click <strong>' + escapeHtml(inp.okLabel || 'Proceed') + '</strong> to resume pipeline execution, or <strong>Abort Pipeline</strong> to cancel the build.</div>';
                    }

                    body.innerHTML = html;
                    modal.classList.add('active');
                }

                function closeInputApprovalModal() {
                    var modal = document.getElementById('input-approval-modal');
                    if (modal) modal.classList.remove('active');
                }

                function submitModalInputProceed() {
                    if (!graphData || !graphData.pendingInputs || !graphData.pendingInputs[currentActiveInputIndex]) return;
                    var inp = graphData.pendingInputs[currentActiveInputIndex];
                    var paramMap = {};
                    var controls = document.querySelectorAll('#input-approval-body [data-param-name]');
                    controls.forEach(function(el) {
                        var name = el.getAttribute('data-param-name');
                        var type = el.getAttribute('data-param-type');
                        if (type === 'boolean') {
                            paramMap[name] = el.checked;
                        } else {
                            paramMap[name] = el.value;
                        }
                    });
                    sendInputStepAction('apiInputSubmit', inp.id, JSON.stringify(paramMap));
                }

                function submitModalInputAbort() {
                    if (!graphData || !graphData.pendingInputs || !graphData.pendingInputs[currentActiveInputIndex]) return;
                    var inp = graphData.pendingInputs[currentActiveInputIndex];
                    sendInputStepAction('apiInputAbort', inp.id, null);
                }

                function triggerQuickInputProceed(index) {
                    if (!graphData || !graphData.pendingInputs || !graphData.pendingInputs[index]) return;
                    var inp = graphData.pendingInputs[index];
                    sendInputStepAction('apiInputSubmit', inp.id, "{}");
                }

                function triggerQuickInputAbort(index) {
                    if (!graphData || !graphData.pendingInputs || !graphData.pendingInputs[index]) return;
                    var inp = graphData.pendingInputs[index];
                    if (!confirm("Abort pipeline execution at input step '" + (inp.message || inp.id) + "'?")) return;
                    sendInputStepAction('apiInputAbort', inp.id, null);
                }

                function sendInputStepAction(endpoint, inputId, parametersJson) {
                    var proceedBtn = document.getElementById('btn-modal-input-proceed');
                    var abortBtn = document.getElementById('btn-modal-input-abort');
                    if (proceedBtn) proceedBtn.disabled = true;
                    if (abortBtn) abortBtn.disabled = true;

                    var formData = new FormData();
                    formData.append("inputId", inputId);
                    if (parametersJson) {
                        formData.append("parametersJson", parametersJson);
                    }

                    fetch(horizonBaseUrl + endpoint, {
                        method: 'POST',
                        headers: getCrumbHeaders(),
                        body: formData
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (proceedBtn) proceedBtn.disabled = false;
                        if (abortBtn) abortBtn.disabled = false;
                        if (data.status === 'ok') {
                            closeInputApprovalModal();
                            showToast(data.message || "Input step processed!", "success");
                            setTimeout(fetchGraph, 1000);
                        } else {
                            showToast("Input step error: " + (data.message || "Failed"), "error");
                        }
                    })
                    .catch(function(err) {
                        if (proceedBtn) proceedBtn.disabled = false;
                        if (abortBtn) abortBtn.disabled = false;
                        showToast("Input step request error: " + err, "error");
                    });
                }

                /* Build Parameters Modal */
                var currentParametersList = [];
                var currentRenderedParams = [];

                function openParametersModal() {
                    var modal = document.getElementById('parameters-modal');
                    if (!modal) return;

                    if (graphData && graphData.buildParameters && graphData.buildParameters.length > 0) {
                        currentParametersList = graphData.buildParameters;
                    } else if (graphData && graphData.parameters) {
                        currentParametersList = Object.keys(graphData.parameters).map(function(k) {
                            return {
                                name: k,
                                value: graphData.parameters[k],
                                type: 'String',
                                description: '',
                                sensitive: false
                            };
                        });
                    } else {
                        currentParametersList = [];
                    }

                    var searchInput = document.getElementById('params-search-input');
                    if (searchInput) searchInput.value = '';

                    renderBuildParameters(currentParametersList);
                    modal.classList.add('active');
                    if (searchInput) {
                        setTimeout(function() { searchInput.focus(); }, 50);
                    }
                }

                function closeParametersModal() {
                    var modal = document.getElementById('parameters-modal');
                    if (modal) modal.classList.remove('active');
                }

                function filterBuildParameters() {
                    var searchInput = document.getElementById('params-search-input');
                    var q = (searchInput ? searchInput.value : '').trim().toLowerCase();
                    if (!q) {
                        renderBuildParameters(currentParametersList);
                        return;
                    }
                    var filtered = currentParametersList.filter(function(p) {
                        var nameMatch = p.name && p.name.toLowerCase().indexOf(q) !== -1;
                        var valMatch = p.value && String(p.value).toLowerCase().indexOf(q) !== -1;
                        var typeMatch = p.type && p.type.toLowerCase().indexOf(q) !== -1;
                        var descMatch = p.description && p.description.toLowerCase().indexOf(q) !== -1;
                        return nameMatch || valMatch || typeMatch || descMatch;
                    });
                    renderBuildParameters(filtered);
                }

                function getParamTypeBadgeClass(type) {
                    var t = (type || '').toLowerCase();
                    if (t.indexOf('bool') !== -1) return 'badge-type-bool';
                    if (t.indexOf('choice') !== -1) return 'badge-type-choice';
                    if (t.indexOf('pass') !== -1 || t.indexOf('secret') !== -1 || t.indexOf('credential') !== -1) return 'badge-type-password';
                    if (t.indexOf('file') !== -1) return 'badge-type-file';
                    if (t.indexOf('text') !== -1) return 'badge-type-text';
                    return 'badge-type-string';
                }

                function renderBuildParameters(params) {
                    currentRenderedParams = params || [];
                    var container = document.getElementById('params-cards-container');
                    var statsEl = document.getElementById('params-stats-text');
                    if (!container) return;

                    var totalCount = currentParametersList.length;
                    var count = currentRenderedParams.length;

                    if (statsEl) {
                        if (count === totalCount) {
                            statsEl.innerText = count + (count === 1 ? ' parameter' : ' parameters');
                        } else {
                            statsEl.innerText = count + ' of ' + totalCount + ' parameters';
                        }
                    }

                    if (currentRenderedParams.length === 0) {
                        if (totalCount === 0) {
                            container.innerHTML = '<div class="params-empty-state">' +
                                '<div style="font-size:1.8rem; margin-bottom:0.5rem; opacity:0.6;">\u2699</div>' +
                                '<div style="font-weight:600; margin-bottom:0.25rem;">No Build Parameters</div>' +
                                '<div style="font-size:0.8rem; color:#94a3b8;">This build was run without any parameters.</div>' +
                            '</div>';
                        } else {
                            container.innerHTML = '<div class="params-empty-state">' +
                                '<div style="font-size:1.8rem; margin-bottom:0.5rem; opacity:0.6;">\ud83d\udd0d</div>' +
                                '<div style="font-weight:600; margin-bottom:0.25rem;">No Matching Parameters</div>' +
                                '<div style="font-size:0.8rem; color:#94a3b8;">No parameters matched your search filter.</div>' +
                            '</div>';
                        }
                        return;
                    }

                    var html = '';
                    for (var i = 0; i < currentRenderedParams.length; i++) {
                        var p = currentRenderedParams[i];
                        var isSensitive = !!p.sensitive;
                        var pType = p.type || 'String';
                        var isBool = (pType.toLowerCase().indexOf('bool') !== -1) || (typeof p.value === 'boolean');
                        var isMultiLine = (pType.toLowerCase().indexOf('text') !== -1) || (typeof p.value === 'string' && p.value.indexOf('\n') !== -1);

                        html += '<div class="param-card" id="param-card-' + i + '">';
                        html += '<div class="param-card-header">';
                        html += '<div class="param-card-title-group">';
                        html += '<span class="param-card-name">' + escapeHtml(p.name || '') + '</span>';
                        html += '<span class="param-type-badge ' + getParamTypeBadgeClass(pType) + '">' + escapeHtml(pType) + '</span>';
                        if (isSensitive) {
                            html += '<span class="param-sensitive-badge" title="Sensitive / Secret parameter (value masked)">Sensitive</span>';
                        }
                        html += '</div>';
                        html += '<div class="param-card-actions">';
                        html += '<button type="button" class="param-copy-btn" onclick="copySingleParam(' + i + ')" title="Copy parameter value" aria-label="Copy parameter ' + escapeHtml(p.name || '') + '">';
                        html += '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
                        html += '</button>';
                        html += '</div>';
                        html += '</div>';

                        if (p.description) {
                            html += '<div class="param-card-desc">' + escapeHtml(p.description) + '</div>';
                        }

                        html += '<div class="param-val-wrap">';
                        if (isSensitive) {
                            html += '<span class="param-single-val val-masked" title="Masked sensitive value">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</span>';
                        } else if (isBool) {
                            var bVal = (p.value === true || p.value === 'true' || p.value === 'TRUE' || p.value === '1');
                            html += '<span class="param-bool-val ' + (bVal ? 'bool-true' : 'bool-false') + '">' + (bVal ? 'TRUE' : 'FALSE') + '</span>';
                        } else if (isMultiLine) {
                            html += '<pre class="param-multiline-val">' + escapeHtml(p.value != null ? String(p.value) : '') + '</pre>';
                        } else {
                            var rawVal = (p.value != null ? String(p.value) : '');
                            if (rawVal === '') {
                                html += '<span class="param-single-val" style="color:#94a3b8; font-style:italic;">(empty string)</span>';
                            } else {
                                html += '<span class="param-single-val">' + escapeHtml(rawVal) + '</span>';
                            }
                        }
                        html += '</div>';
                        html += '</div>';
                    }

                    container.innerHTML = html;
                }

                function copySingleParam(idx) {
                    var p = currentRenderedParams && currentRenderedParams[idx];
                    if (!p) return;
                    var textToCopy = (p.value != null) ? String(p.value) : '';
                    copyTextToClipboard(textToCopy, "Copied '" + (p.name || 'parameter') + "' value to clipboard!");
                }

                function copyParameters(format) {
                    if (!currentParametersList || currentParametersList.length === 0) {
                        showToast("No parameters to copy", "info");
                        return;
                    }

                    if (format === 'json') {
                        var obj = {};
                        for (var i = 0; i < currentParametersList.length; i++) {
                            var item = currentParametersList[i];
                            if (item.name) {
                                obj[item.name] = (item.value != null ? item.value : "");
                            }
                        }
                        var jsonText = JSON.stringify(obj, null, 2);
                        copyTextToClipboard(jsonText, "Copied " + Object.keys(obj).length + " parameters as JSON!");
                    } else if (format === 'env') {
                        var lines = [];
                        for (var j = 0; j < currentParametersList.length; j++) {
                            var p = currentParametersList[j];
                            if (p.name) {
                                var val = (p.value != null ? String(p.value) : "");
                                if (val.indexOf('\n') !== -1 || val.indexOf(' ') !== -1 || val.indexOf('"') !== -1) {
                                    val = '"' + val.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
                                }
                                lines.push(p.name + '=' + val);
                            }
                        }
                        var envText = lines.join('\n');
                        copyTextToClipboard(envText, "Copied " + lines.length + " parameters as KEY=VAL!");
                    }
                }

                /* Interactive Test Results Modal */
                function openTestsModal(initialFilter) {
                    var modal = document.getElementById('tests-modal');
                    if (!modal || !graphData) return;

                    var total = graphData.totalTests || 0;
                    var failed = graphData.failedTests || 0;
                    var skipped = graphData.skippedTests || 0;
                    var passed = Math.max(0, total - failed - skipped);

                    var summaryEl = document.getElementById('tests-summary-cards');
                    if (summaryEl) {
                        summaryEl.innerHTML =
                            '<div class="tests-stat-card"><span class="tests-stat-label">Total Tests</span><span class="tests-stat-value">' + total + '</span></div>' +
                            '<div class="tests-stat-card"><span class="tests-stat-label">Passed</span><span class="tests-stat-value stat-passed">' + passed + '</span></div>' +
                            '<div class="tests-stat-card"><span class="tests-stat-label">Failed</span><span class="tests-stat-value stat-failed">' + failed + '</span></div>' +
                            '<div class="tests-stat-card"><span class="tests-stat-label">Skipped</span><span class="tests-stat-value stat-skipped">' + skipped + '</span></div>';
                    }

                    var defaultFilter = initialFilter || (failed > 0 ? 'FAILED' : 'ALL');
                    if (!graphData.testCasesLoaded && total > 0 && !deferredTestsPending) {
                        deferredTestsPending = true;
                        fetch(horizonBaseUrl + 'apiDetails?section=tests')
                            .then(function(r) { return r.ok ? r.json() : null; })
                            .then(function(sec) {
                                deferredTestsPending = false;
                                if (sec && graphData) {
                                    graphData.testCases = sec.testCases || [];
                                    graphData.testCasesLoaded = true;
                                }
                                renderTestsModalList();
                            })
                            .catch(function() {
                                deferredTestsPending = false;
                                renderTestsModalList();
                            });
                    }
                    setTestsFilter(defaultFilter);
                    modal.classList.add('active');
                }

                function closeTestsModal() {
                    var modal = document.getElementById('tests-modal');
                    if (modal) modal.classList.remove('active');
                }

                function setTestsFilter(filter) {
                    currentTestsFilter = filter || 'ALL';
                    var tabs = {
                        'ALL': document.getElementById('tests-tab-all'),
                        'FAILED': document.getElementById('tests-tab-failed'),
                        'SKIPPED': document.getElementById('tests-tab-skipped'),
                        'PASSED': document.getElementById('tests-tab-passed')
                    };
                    Object.keys(tabs).forEach(function(k) {
                        if (tabs[k]) {
                            if (k === currentTestsFilter) tabs[k].classList.add('active');
                            else tabs[k].classList.remove('active');
                        }
                    });
                    renderTestsModalList();
                }

                function renderTestsModalList() {
                    var listEl = document.getElementById('tests-cases-list');
                    if (!listEl || !graphData) return;

                    var cases = graphData.testCases || [];
                    if (cases.length === 0) {
                        if (deferredTestsPending) {
                            listEl.innerHTML = '<div style="padding:2rem; text-align:center; color:#94a3b8;">Loading JUnit test case details...</div>';
                            return;
                        }
                        if ((graphData.totalTests || 0) > 0) {
                            listEl.innerHTML = '<div style="padding:2rem; text-align:center; color:#94a3b8;">Summary test counts were recorded (' + graphData.totalTests + ' total), but individual JUnit case details were not exposed by the test action. Use <strong>Classic Report</strong> above to view details.</div>';
                        } else {
                            listEl.innerHTML = '<div style="padding:2rem; text-align:center; color:#94a3b8;">No JUnit test results were recorded for this pipeline run.</div>';
                        }
                        return;
                    }

                    var searchInput = document.getElementById('tests-search-input');
                    var query = (searchInput ? searchInput.value : '').trim().toLowerCase();

                    var filtered = [];
                    for (var i = 0; i < cases.length; i++) {
                        var tc = cases[i];
                        var st = (tc.status || 'PASSED').toUpperCase();
                        if (currentTestsFilter !== 'ALL' && st !== currentTestsFilter) continue;
                        if (query) {
                            var hay = ((tc.name || '') + ' ' + (tc.className || '') + ' ' + (tc.suiteName || '') + ' ' + (tc.errorDetails || '')).toLowerCase();
                            if (hay.indexOf(query) === -1) continue;
                        }
                        filtered.push({ tc: tc, idx: i });
                    }

                    if (filtered.length === 0) {
                        listEl.innerHTML = '<div style="padding:2rem; text-align:center; color:#94a3b8;">No test cases match the active filter.</div>';
                        return;
                    }

                    var html = '';
                    for (var j = 0; j < filtered.length; j++) {
                        var item = filtered[j];
                        var tc = item.tc;
                        var idx = item.idx;
                        var st = (tc.status || 'PASSED').toUpperCase();
                        var hasTrace = !!(tc.errorDetails || tc.errorStackTrace);
                        var autoExpand = (st === 'FAILED' && filtered.length <= 10) ? ' expanded' : '';

                        var badgeCls = st === 'FAILED' ? 'badge-failed' : (st === 'SKIPPED' ? 'badge-unstable' : 'badge-success');
                        var durSec = tc.durationSeconds ? (tc.durationSeconds.toFixed(3) + 's') : '0.000s';
                        var ageBadge = (tc.age && tc.age > 1) ? ('<span class="stage-banner-badge stage-badge-optional" title="Failing for ' + tc.age + ' consecutive builds">Age: ' + tc.age + '</span>') : '';

                        html += '<div class="test-case-card' + autoExpand + '" id="test-case-card-' + idx + '">';
                        html += '<div class="test-case-header" onclick="toggleTestCaseDetails(' + idx + ')">';
                        html += '<span class="horizon-badge ' + badgeCls + '" style="font-size:0.65rem; padding:2px 7px;">' + escapeHtml(st) + '</span>';
                        html += '<span class="test-case-name" title="' + escapeHtml(tc.name || '') + '">' + escapeHtml(tc.name || 'Test') + '</span>';
                        if (tc.className) {
                            html += '<span class="test-case-class" title="' + escapeHtml(tc.className) + '">' + escapeHtml(tc.className) + '</span>';
                        }
                        html += ageBadge;
                        html += '<span class="test-case-duration">' + durSec + '</span>';
                        html += '</div>';

                        if (hasTrace) {
                            html += '<div class="test-case-details">';
                            html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">';
                            html += '<span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:#f87171;">Failure Details &amp; Stacktrace</span>';
                            html += '<button type="button" class="inline-log-btn" onclick="event.stopPropagation(); copyTestStacktrace(' + idx + ')">Copy Stacktrace</button>';
                            html += '</div>';
                            if (tc.errorDetails) {
                                html += '<div class="test-error-msg">' + escapeHtml(tc.errorDetails) + '</div>';
                            }
                            if (tc.errorStackTrace) {
                                html += '<pre class="test-stacktrace" style="margin:0;">' + escapeHtml(tc.errorStackTrace) + '</pre>';
                            }
                            html += '</div>';
                        }
                        html += '</div>';
                    }
                    listEl.innerHTML = html;
                }

                function toggleTestCaseDetails(idx) {
                    var card = document.getElementById('test-case-card-' + idx);
                    if (card) {
                        card.classList.toggle('expanded');
                    }
                }

                function copyTestStacktrace(idx) {
                    if (!graphData || !graphData.testCases || !graphData.testCases[idx]) return;
                    var tc = graphData.testCases[idx];
                    var text = (tc.className ? (tc.className + '.' + tc.name + '\n') : '') +
                        (tc.errorDetails ? (tc.errorDetails + '\n\n') : '') +
                        (tc.errorStackTrace || '');
                    copyTextToClipboard(text, "Test stacktrace copied to clipboard!");
                }

                function handleMenuRebuild() {
                    closePipelineActionsDropdown();
                    triggerRebuild();
                }

                function handleMenuReplay() {
                    closePipelineActionsDropdown();
                    openReplayModal();
                }

                function triggerRestartStageFromMenu(stageName) {
                    closePipelineActionsDropdown();
                    triggerRestartStage(stageName);
                }

                function triggerRebuild() {
                    var btn = document.getElementById('btn-pipeline-actions') || document.getElementById('btn-rebuild');
                    if (btn) btn.disabled = true;
                    showToast("Triggering rebuild with original parameters...", "info");

                    fetch(horizonBaseUrl + 'apiRebuild', {
                        method: 'POST',
                        headers: getCrumbHeaders()
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (btn) btn.disabled = false;
                        if (data.status === 'ok') {
                            showToast(data.message || "Rebuild scheduled successfully!", "success");
                            setTimeout(fetchGraph, 2000);
                        } else {
                            showToast("Rebuild failed: " + (data.message || "Unknown error"), "error");
                        }
                    })
                    .catch(function(err) {
                        if (btn) btn.disabled = false;
                        showToast("Rebuild request error: " + err, "error");
                    });
                }

                var replayLintTimer = null;
                var replayErrorLine = null;

                function updateReplayGutter(errLine) {
                    var editor = document.getElementById('replay-script-editor');
                    var gutter = document.getElementById('replay-editor-gutter');
                    if (!editor || !gutter) return;
                    if (typeof errLine !== 'undefined') {
                        replayErrorLine = errLine;
                    }
                    var lines = editor.value.split('\n');
                    var lineCount = Math.max(1, lines.length);
                    var html = '';
                    for (var i = 1; i <= lineCount; i++) {
                        var isErr = (replayErrorLine && replayErrorLine === i);
                        var cls = isErr ? 'gutter-line has-error' : 'gutter-line';
                        var title = isErr ? ('Syntax error on line ' + i) : ('Line ' + i);
                        html += '<span class="' + cls + '" data-line="' + i + '" title="' + title + '" onclick="jumpToReplayLine(' + i + ')">' + i + '</span>';
                    }
                    gutter.innerHTML = html;
                    gutter.scrollTop = editor.scrollTop;
                }

                function jumpToReplayLine(lineNum) {
                    var editor = document.getElementById('replay-script-editor');
                    if (!editor) return;
                    var lines = editor.value.split('\n');
                    if (lineNum < 1 || lineNum > lines.length) return;
                    var charStart = 0;
                    for (var i = 0; i < lineNum - 1; i++) {
                        charStart += lines[i].length + 1; // +1 for \n
                    }
                    var charEnd = charStart + lines[lineNum - 1].length;
                    editor.focus();
                    editor.setSelectionRange(charStart, charEnd);

                    var approxLineHeight = 19.68;
                    editor.scrollTop = Math.max(0, (lineNum - 3) * approxLineHeight);
                    var gutter = document.getElementById('replay-editor-gutter');
                    if (gutter) gutter.scrollTop = editor.scrollTop;
                }

                function clearReplayValidation() {
                    if (replayLintTimer) {
                        clearTimeout(replayLintTimer);
                        replayLintTimer = null;
                    }
                    replayErrorLine = null;
                    var banner = document.getElementById('replay-validation-banner');
                    if (banner) {
                        banner.style.display = 'none';
                        banner.className = 'replay-validation-banner';
                        banner.innerHTML = '';
                    }
                    var pill = document.getElementById('replay-linter-pill');
                    if (pill) {
                        pill.className = 'replay-linter-pill idle';
                        pill.onclick = null;
                        pill.innerHTML = '<span id="replay-linter-text">Ready</span>';
                    }
                    updateReplayGutter();
                }

                function onReplayEditorInput() {
                    updateReplayGutter();
                    scheduleReplayLint();
                }

                function scheduleReplayLint() {
                    if (replayLintTimer) {
                        clearTimeout(replayLintTimer);
                    }
                    var pill = document.getElementById('replay-linter-pill');
                    if (pill) {
                        pill.className = 'replay-linter-pill checking';
                        pill.onclick = null;
                        pill.innerHTML = '<svg class="horizon-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Checking...</span>';
                    }
                    replayLintTimer = setTimeout(function() {
                        validateReplayScript(false);
                    }, 450);
                }

                function openReplayModal() {
                    clearReplayValidation();
                    var modal = document.getElementById('replay-modal');
                    var editor = document.getElementById('replay-script-editor');
                    var needsReplayFetch = !!(graphData && !graphData.replayScriptLoaded && !graphData.originalScript && graphData.replayEnabled);
                    if (graphData && graphData.originalScript) {
                        editor.value = fixMojibake(graphData.originalScript);
                    } else if (needsReplayFetch) {
                        editor.value = "// Loading original Jenkinsfile script...";
                    } else {
                        editor.value = "// No original Jenkinsfile script captured for this run.";
                    }
                    modal.classList.add('active');
                    var isMac = (navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0);
                    var modKey = isMac ? '⌘' : 'Ctrl';
                    var kbdVal = document.getElementById('replay-kbd-validate');
                    if (kbdVal) kbdVal.innerText = modKey + '+S';
                    var kbdRep = document.getElementById('replay-kbd-replay');
                    if (kbdRep) kbdRep.innerText = modKey + '+Enter';
                    updateReplayGutter();
                    if (!editor._gutterScrollAttached) {
                        editor.addEventListener('scroll', function() {
                            var gutter = document.getElementById('replay-editor-gutter');
                            if (gutter) gutter.scrollTop = editor.scrollTop;
                        });
                        editor._gutterScrollAttached = true;
                    }
                    if (needsReplayFetch && !deferredReplayPending) {
                        deferredReplayPending = true;
                        fetch(horizonBaseUrl + 'apiDetails?section=replay')
                            .then(function(r) { return r.ok ? r.json() : null; })
                            .then(function(sec) {
                                deferredReplayPending = false;
                                if (sec && graphData) {
                                    graphData.originalScript = sec.originalScript;
                                    graphData.replayScriptLoaded = true;
                                }
                                if (graphData && graphData.originalScript) {
                                    editor.value = fixMojibake(graphData.originalScript);
                                } else {
                                    editor.value = "// No original Jenkinsfile script captured for this run.";
                                }
                                updateReplayGutter();
                                validateReplayScript(false);
                            })
                            .catch(function() {
                                deferredReplayPending = false;
                                editor.value = "// No original Jenkinsfile script captured for this run.";
                                updateReplayGutter();
                            });
                    }
                    setTimeout(function() {
                        editor.focus();
                        if (!needsReplayFetch) {
                            validateReplayScript(false);
                        }
                    }, 60);
                }

                function closeReplayModal() {
                    clearReplayValidation();
                    var modal = document.getElementById('replay-modal');
                    if (modal) modal.classList.remove('active');
                }

                function validateReplayScript(isManualClick) {
                    if (typeof isManualClick === 'undefined') isManualClick = true;
                    var btn = document.getElementById('btn-validate-replay');
                    var editor = document.getElementById('replay-script-editor');
                    var banner = document.getElementById('replay-validation-banner');
                    var pill = document.getElementById('replay-linter-pill');
                    if (!editor) return;
                    var scriptContent = editor.value;

                    if (!scriptContent || !scriptContent.trim()) {
                        if (pill) {
                            pill.className = 'replay-linter-pill invalid';
                            pill.onclick = null;
                            pill.innerHTML = '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Empty Script</span>';
                        }
                        if (banner && isManualClick) {
                            banner.className = 'replay-validation-banner invalid';
                            banner.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div><strong>Validation Failed:</strong> Pipeline script cannot be empty.</div>';
                            banner.style.display = 'flex';
                        }
                        updateReplayGutter();
                        return;
                    }

                    if (btn && isManualClick) {
                        btn.disabled = true;
                        btn.innerHTML = '<svg class="horizon-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Validating...</span>';
                    }
                    if (pill) {
                        pill.className = 'replay-linter-pill checking';
                        pill.onclick = null;
                        pill.innerHTML = '<svg class="horizon-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Validating...</span>';
                    }

                    var formData = new FormData();
                    formData.append("script", scriptContent);

                    fetch(horizonBaseUrl + 'apiValidatePipeline', {
                        method: 'POST',
                        headers: getCrumbHeaders(),
                        body: formData
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (btn && isManualClick) {
                            btn.disabled = false;
                            btn.innerHTML = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Validate Syntax</span>';
                        }
                        if (data.valid) {
                            var pipeType = data.type ? (data.type.charAt(0).toUpperCase() + data.type.slice(1) + ' Pipeline') : 'Pipeline';
                            if (pill) {
                                pill.className = 'replay-linter-pill valid';
                                pill.onclick = null;
                                pill.title = data.message || (pipeType + ' syntax is valid.');
                                pill.innerHTML = '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Valid (' + (data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : 'Syntax') + ')</span>';
                            }
                            if (banner) {
                                if (isManualClick) {
                                    banner.className = 'replay-validation-banner valid';
                                    banner.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:2px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><div><strong>Syntax Valid:</strong> ' + escapeHtml(data.message || (pipeType + ' definition parsed successfully.')) + '</div>';
                                    banner.style.display = 'flex';
                                } else {
                                    banner.style.display = 'none';
                                }
                            }
                            updateReplayGutter(null);
                        } else {
                            var errDetail = data.message || "Pipeline syntax validation failed.";
                            var lineInfo = data.line ? ('Line ' + data.line + (data.column ? (':' + data.column) : '')) : null;
                            if (pill) {
                                pill.className = 'replay-linter-pill invalid';
                                pill.title = (lineInfo ? (lineInfo + ': ') : '') + errDetail + ' (Click to jump to line)';
                                pill.innerHTML = '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>' + (lineInfo ? lineInfo : 'Syntax Error') + '</span>';
                                if (data.line) {
                                    pill.onclick = function() { jumpToReplayLine(data.line); };
                                } else {
                                    pill.onclick = null;
                                }
                            }
                            if (banner) {
                                banner.className = 'replay-validation-banner invalid';
                                var actionHtml = '';
                                if (data.line) {
                                    actionHtml = '<button type="button" class="replay-jump-btn" onclick="jumpToReplayLine(' + data.line + ')"><svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Jump to Line ' + data.line + '</button>';
                                }
                                banner.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div style="min-width:0; flex:1;"><strong>' + (lineInfo ? ('Syntax Error on ' + lineInfo + ':') : 'Syntax Error:') + '</strong> <span style="word-break:break-word;">' + escapeHtml(errDetail) + '</span>' + actionHtml + '</div>';
                                banner.style.display = 'flex';
                            }
                            updateReplayGutter(data.line || null);
                        }
                    })
                    .catch(function(err) {
                        if (btn && isManualClick) {
                            btn.disabled = false;
                            btn.innerHTML = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Validate Syntax</span>';
                        }
                        if (pill) {
                            pill.className = 'replay-linter-pill invalid';
                            pill.onclick = null;
                            pill.innerHTML = '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Lint Failed</span>';
                        }
                        if (banner && isManualClick) {
                            banner.className = 'replay-validation-banner invalid';
                            banner.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><div><strong>Validation Request Error:</strong> ' + escapeHtml(err.toString()) + '</div>';
                            banner.style.display = 'flex';
                        }
                    });
                }

                function submitReplayRun() {
                    var submitBtn = document.getElementById('btn-submit-replay');
                    var editor = document.getElementById('replay-script-editor');
                    var scriptContent = editor.value;

                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerText = "Scheduling Replay...";
                    }

                    var formData = new FormData();
                    formData.append("script", scriptContent);

                    fetch(horizonBaseUrl + 'apiReplayRun', {
                        method: 'POST',
                        headers: getCrumbHeaders(),
                        body: formData
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Replay';
                        }
                        if (data.status === 'ok') {
                            closeReplayModal();
                            showToast(data.message || "Replay pipeline run scheduled successfully!", "success");
                            setTimeout(fetchGraph, 2000);
                        } else {
                            showToast("Replay failed: " + (data.message || "Unknown error"), "error");
                        }
                    })
                    .catch(function(err) {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Replay';
                        }
                        showToast("Replay request error: " + err, "error");
                    });
                }

                function toggleRestartDropdown() {
                    var menu = document.getElementById('restart-stage-menu');
                    var btn = document.getElementById('btn-restart-dropdown');
                    if (!menu) return;
                    var isOpen = menu.classList.contains('show');
                    if (isOpen) {
                        menu.classList.remove('show');
                        if (btn) btn.setAttribute('aria-expanded', 'false');
                    } else {
                        menu.classList.add('show');
                        if (btn) btn.setAttribute('aria-expanded', 'true');
                    }
                }

                document.addEventListener('click', function(e) {
                    var actWrap = document.getElementById('pipeline-actions-dropdown-wrap');
                    if (actWrap && !actWrap.contains(e.target)) {
                        closePipelineActionsDropdown();
                    }
                    var wrap = document.getElementById('restart-stage-dropdown-wrap');
                    if (wrap && !wrap.contains(e.target)) {
                        var menu = document.getElementById('restart-stage-menu');
                        if (menu && menu.classList.contains('show')) {
                            menu.classList.remove('show');
                            var btn = document.getElementById('btn-restart-dropdown');
                            if (btn) btn.setAttribute('aria-expanded', 'false');
                        }
                    }
                });

                function triggerRestartStage(stageName) {
                    closePipelineActionsDropdown();
                    var menu = document.getElementById('restart-stage-menu');
                    if (menu) menu.classList.remove('show');
                    showToast("Restarting pipeline from stage: " + stageName + "...", "info");

                    var formData = new FormData();
                    formData.append("stageName", stageName);

                    fetch(horizonBaseUrl + 'apiRestartStage', {
                        method: 'POST',
                        headers: getCrumbHeaders(),
                        body: formData
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.status === 'ok') {
                            showToast(data.message || ("Restarted pipeline from stage: " + stageName), "success");
                            setTimeout(fetchGraph, 2500);
                        } else {
                            showToast("Stage restart failed: " + (data.message || "Unknown error"), "error");
                        }
                    })
                    .catch(function(err) {
                        showToast("Stage restart request error: " + err, "error");
                    });
                }

                function triggerRestartSelectedStage() {
                    if (!graphData || !selectedStageId) return;
                    var curStageInfo = findStageAndParent(graphData.stages, selectedStageId);
                    var stage = curStageInfo.stage;
                    var parent = curStageInfo.parent;
                    if (!stage) return;
                    var targetName = stage.name;
                    if (graphData.restartableStages && graphData.restartableStages.indexOf(targetName) === -1) {
                        if (parent && graphData.restartableStages.indexOf(parent.name) !== -1) {
                            targetName = parent.name;
                        }
                    }
                    if (targetName) {
                        triggerRestartStage(targetName);
                    }
                }

                // Modal dialog keyboard shortcuts (Escape and Tab trapping)
                document.addEventListener('keydown', function(e) {
                    var actMenu = document.getElementById('pipeline-actions-menu');
                    if (actMenu && actMenu.classList.contains('show')) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closePipelineActionsDropdown();
                            var actBtn = document.getElementById('btn-pipeline-actions');
                            if (actBtn) actBtn.focus();
                            return;
                        }
                    }
                    var stagePicker = document.getElementById('stage-picker-menu');
                    if (stagePicker && stagePicker.style.display !== 'none') {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeStagePicker();
                            var btn = document.getElementById('btn-stage-picker');
                            if (btn) btn.focus();
                            return;
                        }
                    }
                    var exportMenu = document.getElementById('graph-export-menu');
                    if (exportMenu && exportMenu.style.display !== 'none') {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeExportMenu();
                            var btn = document.getElementById('btn-graph-export');
                            if (btn) btn.focus();
                            return;
                        }
                    }
                    var shortcutsModal = document.getElementById('shortcuts-modal');
                    if (shortcutsModal && shortcutsModal.classList.contains('active')) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeShortcutsModal();
                            return;
                        }
                    }
                    var inputModal = document.getElementById('input-approval-modal');
                    if (inputModal && inputModal.classList.contains('active')) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeInputApprovalModal();
                            return;
                        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            submitModalInputProceed();
                            return;
                        }
                    }
                    var testsModal = document.getElementById('tests-modal');
                    if (testsModal && testsModal.classList.contains('active')) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeTestsModal();
                            return;
                        }
                    }
                    var paramsModal = document.getElementById('parameters-modal');
                    if (paramsModal && paramsModal.classList.contains('active')) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeParametersModal();
                            return;
                        }
                    }
                    var artPreviewModal = document.getElementById('artifact-preview-modal');
                    if (artPreviewModal && artPreviewModal.classList.contains('active')) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeArtifactPreviewModal();
                            return;
                        }
                    }

                    var artModal = document.getElementById('artifacts-modal');
                    if (artModal && artModal.classList.contains('active')) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeArtifactsModal();
                            return;
                        }
                    }

                    var agentModal = document.getElementById('agent-modal');
                    if (agentModal && agentModal.classList.contains('active')) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeAgentModal();
                            return;
                        }
                    }

                    var replayModal = document.getElementById('replay-modal');
                    var isReplayOpen = replayModal && replayModal.classList.contains('active');
                    if (isReplayOpen) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeReplayModal();
                            return;
                        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            submitReplayRun();
                            return;
                        } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                            e.preventDefault();
                            validateReplayScript(true);
                            return;
                        } else if (e.key === 'Tab') {
                            var editor = document.getElementById('replay-script-editor');
                            if (document.activeElement === editor) {
                                // Support indentation inside the script editor
                                e.preventDefault();
                                var start = editor.selectionStart;
                                var end = editor.selectionEnd;
                                editor.value = editor.value.substring(0, start) + "    " + editor.value.substring(end);
                                editor.selectionStart = editor.selectionEnd = start + 4;
                                updateReplayGutter();
                                scheduleReplayLint();
                                return;
                            }
                        }
                        return;
                    }

                    // Guard: Never trigger global single-key shortcuts while typing in inputs/textareas
                    var targetTag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
                    var isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (e.target && e.target.isContentEditable);
                    if (isInput) return;

                    // Guard: Avoid overriding modifier keys (e.g. Ctrl+F, Ctrl+T, Alt+Left)
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    if (e.defaultPrevented) return;

                    // Global hotkeys
                    if (e.key === '?') {
                        e.preventDefault();
                        toggleShortcutsModal();
                        return;
                    }

                    if (e.key === '1') {
                        e.preventDefault();
                        setLayoutMode('scroll');
                        return;
                    }

                    if (e.key === '2') {
                        e.preventDefault();
                        setLayoutMode('wrap');
                        return;
                    }

                    if (e.key === 'f' || e.key === 'F') {
                        e.preventDefault();
                        fitFlowToScreen();
                        return;
                    }

                    if (e.key === '/') {
                        e.preventDefault();
                        focusStepLogSearch();
                        return;
                    }

                    if (e.key === 't' || e.key === 'T') {
                        var targetStep = selectedStepId;
                        if (!targetStep) {
                            var firstExp = document.querySelector('.step-accordion-item.expanded');
                            if (firstExp) targetStep = firstExp.id.replace('step-item-', '');
                        }
                        if (targetStep) {
                            e.preventDefault();
                            toggleStepLiveTail(targetStep);
                        }
                        return;
                    }

                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        navigateStageByArrow(-1);
                        return;
                    }

                    if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        navigateStageByArrow(1);
                        return;
                    }

                    if (e.key === 's' || e.key === 'S') {
                        e.preventDefault();
                        toggleStagePicker();
                        return;
                    }

                    if (e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                        toggleExportMenu();
                        return;
                    }

                    if (e.key === 'p' || e.key === 'P') {
                        e.preventDefault();
                        var pModal = document.getElementById('parameters-modal');
                        if (pModal && pModal.classList.contains('active')) {
                            closeParametersModal();
                        } else {
                            openParametersModal();
                        }
                        return;
                    }
                });

                // Initial layout & fetch
                applyScreenMode();
                applyViewPreferences();
                fetchGraph();
