                var jobData = null;
                var currentFilter = 'ALL';
                var jobPollTimer = null;
                var _cfg = window.HORIZON_JOB_CONFIG || {};
                var jobBaseUrl = _cfg.jobBaseUrl || "";
                if (!jobBaseUrl.endsWith("/")) {
                    jobBaseUrl += "/";
                }
                var horizonBaseUrl = jobBaseUrl + "horizon/";

                function getCrumbHeaders() {
                    var headers = {};
                    var headerName = document.head.getAttribute('data-crumb-header');
                    var headerValue = document.head.getAttribute('data-crumb-value');
                    if (headerName && headerValue) {
                        headers[headerName] = headerValue;
                    }
                    return headers;
                }

                function formatDuration(ms) {
                    if (!ms || ms <= 0) return "0s";
                    var sec = Math.floor(ms / 1000);
                    if (sec < 60) return sec + "s";
                    var min = Math.floor(sec / 60);
                    sec = sec % 60;
                    if (min < 60) return min + "m " + sec + "s";
                    var hr = Math.floor(min / 60);
                    min = min % 60;
                    return hr + "h " + min + "m";
                }

                function formatTimeAgo(ts) {
                    if (!ts) return "--";
                    var diffSec = Math.floor((Date.now() - ts) / 1000);
                    if (diffSec < 60) return "Just now";
                    var diffMin = Math.floor(diffSec / 60);
                    if (diffMin < 60) return diffMin + " min ago";
                    var diffHr = Math.floor(diffMin / 60);
                    if (diffHr < 24) return diffHr + " hr ago";
                    var diffDays = Math.floor(diffHr / 24);
                    return diffDays + " days ago";
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

                function updateQueuedUI(queueItems) {
                    var hasQueued = queueItems && queueItems.length > 0;
                    var pillQueued = document.getElementById('pill-filter-queued');
                    var pillQueuedCount = document.getElementById('pill-queued-count');
                    if (pillQueued && pillQueuedCount) {
                        if (hasQueued) {
                            pillQueued.style.display = '';
                            pillQueuedCount.innerText = queueItems.length;
                        } else {
                            pillQueued.style.display = 'none';
                            if (currentFilter === 'QUEUED') {
                                currentFilter = 'ALL';
                                var pills = document.querySelectorAll('.filter-pill');
                                pills.forEach(function(p) { p.classList.remove('active'); p.setAttribute('aria-selected', 'false'); });
                                var allPill = document.querySelector('.filter-pill');
                                if (allPill) {
                                    allPill.classList.add('active');
                                    allPill.setAttribute('aria-selected', 'true');
                                }
                            }
                        }
                    }

                    var banner = document.getElementById('job-queued-banner');
                    var bannerText = document.getElementById('job-queued-banner-text');
                    var bannerActions = document.getElementById('job-queued-banner-actions');
                    if (banner && bannerText && bannerActions) {
                        if (hasQueued) {
                            var count = queueItems.length;
                            var firstQ = queueItems[0];
                            var txt = (count === 1 ? '1 build currently waiting in queue' : (count + ' builds currently waiting in queue'));
                            if (firstQ.why) {
                                txt += ': ' + firstQ.why;
                            }
                            bannerText.innerText = txt;
                            var actionsHtml = '';
                            for (var qIdx = 0; qIdx < queueItems.length; qIdx++) {
                                var q = queueItems[qIdx];
                                if (q.canCancel !== false) {
                                    actionsHtml += '<button type="button" class="action-link-btn action-stop-btn btn-cancel-queued" style="margin-left:6px; font-size:0.75rem; padding:0.25rem 0.6rem;" onclick="cancelQueueItem(' + q.id + ')" title="Cancel queued build #' + q.id + '"><svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px;"><rect x="5" y="5" width="14" height="14" rx="2"/></svg> Cancel #' + q.id + '</button>';
                                }
                            }
                            bannerActions.innerHTML = actionsHtml;
                            banner.style.display = 'flex';
                        } else {
                            banner.style.display = 'none';
                        }
                    }
                }

                function loadJobRuns() {
                    fetch(horizonBaseUrl + 'apiRuns')
                        .then(function(res) { return res.json(); })
                        .then(function(data) {
                            jobData = data;
                            var runs = data.runs || [];
                            var queueItems = data.queueItems || [];
                            updateQueuedUI(queueItems);
                            renderRunsTable(runs, queueItems);
                            var anyBuilding = runs.some(function(r) { return r.building === true; });
                            var anyQueued = queueItems.length > 0;
                            if (anyBuilding || anyQueued) {
                                var isHidden = (typeof document.hidden !== 'undefined' && document.hidden);
                                if (!isHidden) {
                                    if (!jobPollTimer) {
                                        jobPollTimer = setInterval(loadJobRuns, 3000);
                                    }
                                } else if (jobPollTimer) {
                                    clearInterval(jobPollTimer);
                                    jobPollTimer = null;
                                }
                            } else if (jobPollTimer) {
                                clearInterval(jobPollTimer);
                                jobPollTimer = null;
                            }
                        })
                        .catch(function(err) {
                            console.error("Failed to load runs:", err);
                        });
                }

                document.addEventListener('visibilitychange', function() {
                    if (document.hidden) {
                        if (jobPollTimer) {
                            clearInterval(jobPollTimer);
                            jobPollTimer = null;
                        }
                    } else {
                        if (jobData && ((jobData.runs && jobData.runs.some(function(r) { return r.building === true; })) || (jobData.queueItems && jobData.queueItems.length > 0))) {
                            loadJobRuns();
                        }
                    }
                });

                function renderRunsTable(runs, queueItems) {
                    var tbody = document.getElementById('runs-tbody');
                    if (!tbody) return;
                    runs = runs || (jobData ? jobData.runs : []) || [];
                    queueItems = queueItems || (jobData ? jobData.queueItems : []) || [];

                    var search = document.getElementById('run-search') ? document.getElementById('run-search').value.toLowerCase() : '';

                    var filteredQueued = [];
                    if (currentFilter === 'ALL' || currentFilter === 'QUEUED' || currentFilter === 'IN_PROGRESS') {
                        filteredQueued = queueItems.filter(function(q) {
                            if (!search) return true;
                            var text = ("queue #" + q.id + " " + (q.causes ? q.causes.join(" ") : "") + " " + (q.why || "")).toLowerCase();
                            if (q.parameters) {
                                for (var k in q.parameters) {
                                    text += " " + k.toLowerCase() + "=" + String(q.parameters[k]).toLowerCase();
                                }
                            }
                            return text.indexOf(search) !== -1;
                        });
                    }

                    var filteredRuns = [];
                    if (currentFilter !== 'QUEUED') {
                        filteredRuns = runs.filter(function(r) {
                            var status = r.result || "IN_PROGRESS";
                            var statusUpper = status.toUpperCase();
                            if (currentFilter !== 'ALL') {
                                if (currentFilter === 'FAILED') {
                                    if (statusUpper !== 'FAILED' && statusUpper !== 'FAILURE') return false;
                                } else if (statusUpper !== currentFilter) {
                                    return false;
                                }
                            }
                            if (search) {
                                var text = ("#" + r.number + " " + (r.causes ? r.causes.join(" ") : "") + " " + (r.commitMessage || "") + " " + (r.branch || "")).toLowerCase();
                                return text.indexOf(search) !== -1;
                            }
                            return true;
                        });
                    }

                    if (filteredQueued.length === 0 && filteredRuns.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" class="run-empty-msg" style="text-align:center; padding:2rem; color:#94a3b8;">' +
                            (search ? 'No builds matching filters.' : (currentFilter === 'QUEUED' ? 'No builds currently in queue.' : 'No builds found.')) +
                            '</td></tr>';
                        return;
                    }

                    var html = "";

                    // Render queued rows first!
                    for (var qI = 0; qI < filteredQueued.length; qI++) {
                        var q = filteredQueued[qI];
                        var qCause = (q.causes && q.causes.length) ? q.causes[0] : "Direct trigger";
                        var whyText = q.why ? escapeHtml(q.why) : "Waiting for next available executor";
                        var qParamsHtml = '';
                        if (q.parameters && Object.keys(q.parameters).length > 0) {
                            var pKeys = Object.keys(q.parameters);
                            var pChips = pKeys.map(function(k) {
                                return '<span class="queue-param-chip" title="' + escapeHtml(k + '=' + q.parameters[k]) + '">' + escapeHtml(k) + '=' + escapeHtml(q.parameters[k]) + '</span>';
                            }).join(' ');
                            qParamsHtml = '<div style="margin-top:3px; display:flex; flex-wrap:wrap; gap:3px;">' + pChips + '</div>';
                        }

                        html += '<tr class="run-row-queued">';
                        html += '<td><span class="queued-item-badge" title="Waiting in Jenkins build queue"><span class="queued-pulse-dot"></span>Queue #' + q.id + '</span></td>';
                        html += '<td><span class="run-status-pill pill-queued" role="status"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>QUEUED</span></td>';
                        html += '<td>';
                        html += '<strong>' + escapeHtml(qCause) + '</strong>';
                        html += '<div class="queued-why-text" title="' + whyText + '"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' + whyText + '</div>';
                        html += qParamsHtml;
                        html += '</td>';
                        html += '<td class="run-duration-col">' + (q.timeInQueue ? ('Queued ' + escapeHtml(q.timeInQueue)) : 'Just queued') + '</td>';
                        html += '<td class="run-subtext">Waiting in queue</td>';
                        html += '<td>';
                        if (q.canCancel !== false) {
                            html += '<button type="button" class="action-link-btn action-stop-btn btn-cancel-queued" onclick="cancelQueueItem(' + q.id + ')" title="Cancel queued build #' + q.id + '" aria-label="Cancel queued build #' + q.id + '"><svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px;"><rect x="5" y="5" width="14" height="14" rx="2"/></svg> Cancel</button>';
                        }
                        html += '</td>';
                        html += '</tr>';
                    }

                    // Render runs
                    for (var i = 0; i < filteredRuns.length; i++) {
                        var r = filteredRuns[i];
                        var status = r.result || "IN_PROGRESS";
                        var statusLabel = r.pausedForInput ? "AWAITING INPUT" : status;
                        var statusLower = r.pausedForInput ? "paused_input" : status.toLowerCase();
                        var pillClass = "pill-" + (statusLower === 'failure' ? 'failed' : statusLower);
                        var causeStr = (r.causes && r.causes.length) ? r.causes[0] : "Direct trigger";
                        var scmBadges = '';
                        if (r.branch) {
                            var bSvg = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px; margin-right:2px;"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>';
                            if (r.branchUrl) {
                                scmBadges += '<a href="' + escapeHtml(r.branchUrl) + '" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; background:rgba(56,189,248,0.12); color:#0284c7; border:1px solid rgba(56,189,248,0.3); border-radius:4px; padding:1px 5px; font-size:0.75rem; text-decoration:none; margin-right:6px; font-weight:600;" title="Open branch in SCM">' + bSvg + escapeHtml(r.branch) + ' ↗</a>';
                            } else {
                                scmBadges += '<span style="display:inline-flex; align-items:center; background:rgba(56,189,248,0.12); color:#0284c7; border:1px solid rgba(56,189,248,0.3); border-radius:4px; padding:1px 5px; font-size:0.75rem; margin-right:6px; font-weight:600;">' + bSvg + escapeHtml(r.branch) + '</span>';
                            }
                        }
                        if (r.commitMessage) {
                            var commitText = escapeHtml(r.commitMessage);
                            if (r.commitUrl) {
                                commitText = '<a href="' + escapeHtml(r.commitUrl) + '" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:underline;" title="Open commit in SCM">' + commitText + ' ↗</a>';
                            }
                            causeStr = '<strong>' + commitText + '</strong><br/>' + (scmBadges ? (scmBadges + ' ') : '') + '<span class="run-subtext" style="font-size:0.75rem;">' + escapeHtml(causeStr) + '</span>';
                        } else if (r.commitSha) {
                            var shortSha = escapeHtml(r.commitSha.length > 7 ? r.commitSha.substring(0, 7) : r.commitSha);
                            var shaHtml = r.commitUrl ? ('<a href="' + escapeHtml(r.commitUrl) + '" target="_blank" rel="noopener noreferrer" style="font-family:monospace; color:#2563eb; text-decoration:underline;" title="Open commit in SCM">' + shortSha + ' ↗</a>') : ('<span style="font-family:monospace;">' + shortSha + '</span>');
                            causeStr = '<strong>Commit ' + shaHtml + '</strong><br/>' + (scmBadges ? (scmBadges + ' ') : '') + '<span class="run-subtext" style="font-size:0.75rem;">' + escapeHtml(causeStr) + '</span>';
                        } else if (scmBadges) {
                            causeStr = scmBadges + '<br/><span class="run-subtext">' + escapeHtml(causeStr) + '</span>';
                        } else {
                            causeStr = '<span class="run-subtext">' + escapeHtml(causeStr) + '</span>';
                        }

                        html += '<tr>';
                        html += '<td><a class="run-number-link" href="' + jobBaseUrl + r.number + '/horizon/" aria-label="Open Horizon graph for build #' + r.number + '">#' + r.number + '</a></td>';
                        html += '<td><span class="run-status-pill ' + pillClass + '" role="status">' + statusLabel + '</span></td>';
                        html += '<td>' + causeStr + '</td>';
                        html += '<td class="run-duration-col">' + formatDuration(r.duration) + '</td>';
                        html += '<td class="run-subtext">' + (r.building ? 'In progress' : formatTimeAgo(r.timestamp)) + '</td>';
                        html += '<td>';
                        html += '<a href="' + jobBaseUrl + r.number + '/horizon/" class="action-link-btn" aria-label="Open Horizon graph for build #' + r.number + '">' + (r.pausedForInput ? 'Review Input &rarr;' : 'Open Graph &rarr;') + '</a> ';
                        if (r.building) {
                            html += '<button class="action-link-btn action-stop-btn" onclick="quickAbortRun(' + r.number + ')" title="Stop running build #' + r.number + '" aria-label="Stop running build #' + r.number + '"><svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px;"><rect x="5" y="5" width="14" height="14" rx="2"/></svg> Stop</button> ';
                        } else {
                            html += '<button class="action-link-btn" onclick="quickRebuildRun(' + r.number + ')" title="Rebuild #' + r.number + ' with same parameters" aria-label="Rebuild run #' + r.number + '"><svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Rebuild</button> ';
                        }
                        html += '<a href="' + jobBaseUrl + r.number + '/console" class="action-link-btn" target="_blank" aria-label="Open raw console log for build #' + r.number + '">Console</a>';
                        html += '</td>';
                        html += '</tr>';
                    }

                    tbody.innerHTML = html;
                }

                function cancelQueueItem(queueId) {
                    showToast("Cancelling queued build #" + queueId + "...", "info");
                    fetch(horizonBaseUrl + 'apiCancelQueueItem?queueId=' + encodeURIComponent(queueId), {
                        method: 'POST',
                        headers: getCrumbHeaders()
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.status === 'ok') {
                            showToast(data.message || ("Queued build #" + queueId + " cancelled."), "success");
                            setTimeout(loadJobRuns, 500);
                        } else {
                            showToast("Cancel failed: " + (data.message || "Unknown error"), "error");
                        }
                    })
                    .catch(function(err) {
                        showToast("Error cancelling queued build: " + err, "error");
                    });
                }

                function quickAbortRun(runNum) {
                    showToast("Stopping build #" + runNum + "...", "info");
                    fetch(horizonBaseUrl + 'apiAbortRun?number=' + encodeURIComponent(runNum), {
                        method: 'POST',
                        headers: getCrumbHeaders()
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.status === 'ok') {
                            showToast(data.message || ("Build #" + runNum + " aborted."), "success");
                            setTimeout(loadJobRuns, 1200);
                        } else {
                            showToast("Stop failed: " + (data.message || "Unknown error"), "error");
                        }
                    })
                    .catch(function(err) {
                        showToast("Error stopping build: " + err, "error");
                    });
                }

                function filterRuns() {
                    if (jobData) {
                        renderRunsTable(jobData.runs || [], jobData.queueItems || []);
                    }
                }

                function setStatusFilter(status, elem) {
                    currentFilter = status;
                    var pills = document.querySelectorAll('.filter-pill');
                    pills.forEach(function(p) {
                        p.classList.remove('active');
                        p.setAttribute('aria-selected', 'false');
                    });
                    elem.classList.add('active');
                    elem.setAttribute('aria-selected', 'true');
                    filterRuns();
                }

                function handleFilterKeyNav(e, status, elem) {
                    if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        var allPills = Array.from(document.querySelectorAll('.filter-pill'));
                        var idx = allPills.indexOf(elem);
                        if (idx !== -1 && idx < allPills.length - 1) {
                            allPills[idx + 1].focus();
                            allPills[idx + 1].click();
                        }
                    } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        var allPills = Array.from(document.querySelectorAll('.filter-pill'));
                        var idx = allPills.indexOf(elem);
                        if (idx > 0) {
                            allPills[idx - 1].focus();
                            allPills[idx - 1].click();
                        }
                    } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setStatusFilter(status, elem);
                    }
                }

                function showToast(message, type) {
                    var container = document.getElementById('horizon-toast-container');
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'horizon-toast-container';
                        container.className = 'horizon-toast-container';
                        container.setAttribute('role', 'status');
                        container.setAttribute('aria-live', 'polite');
                        document.body.appendChild(container);
                    }
                    var toast = document.createElement('div');
                    toast.className = 'horizon-toast toast-' + (type || 'info');

                    var iconSvg = (type === 'success') 
                        ? '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
                        : (type === 'error')
                        ? '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                        : '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

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

                var lastActiveElement = null;

                function openBuildModal() {
                    if (!jobData || !jobData.parameters || jobData.parameters.length === 0) {
                        // Unparameterized: directly trigger
                        executeDirectBuild();
                        return;
                    }

                    lastActiveElement = document.activeElement;

                    var body = document.getElementById('modal-params-body');
                    var html = '';
                    for (var i = 0; i < jobData.parameters.length; i++) {
                        var p = jobData.parameters[i];
                        var name = p.name;
                        var desc = p.description || '';
                        var type = p.type || 'StringParameterDefinition';
                        var defVal = p.defaultValue != null ? p.defaultValue : '';
                        var descAttr = desc ? ' aria-describedby="param-desc-' + name + '"' : '';

                        if (type === 'BooleanParameterDefinition') {
                            var checked = (defVal === 'true' || defVal === true) ? 'checked="checked"' : '';
                            html += '<div class="param-toggle-row">';
                            html += '<div class="param-toggle-left">';
                            html += '<label class="param-label" for="param-field-' + name + '">' + name + '</label>';
                            if (desc) html += '<span id="param-desc-' + name + '" class="param-desc">' + desc + '</span>';
                            html += '</div>';
                            html += '<label class="param-toggle-btn">';
                            html += '<input type="checkbox" id="param-field-' + name + '" aria-label="' + name + '" data-param-name="' + name + '" data-param-type="boolean" ' + checked + descAttr + ' />';
                            html += '<span class="param-toggle-slider" aria-hidden="true"></span>';
                            html += '</label>';
                            html += '</div>';
                        } else if (type === 'ChoiceParameterDefinition' && p.choices && p.choices.length > 0) {
                            html += '<div class="param-field">';
                            html += '<label class="param-label" for="param-field-' + name + '">' + name + '</label>';
                            html += '<select id="param-field-' + name + '" class="param-select" data-param-name="' + name + '" data-param-type="choice"' + descAttr + '>';
                            for (var c = 0; c < p.choices.length; c++) {
                                var ch = p.choices[c];
                                var sel = (ch === defVal) ? 'selected="selected"' : '';
                                html += '<option value="' + ch + '" ' + sel + '>' + ch + '</option>';
                            }
                            html += '</select>';
                            if (desc) html += '<span id="param-desc-' + name + '" class="param-desc">' + desc + '</span>';
                            html += '</div>';
                        } else {
                            html += '<div class="param-field">';
                            html += '<label class="param-label" for="param-field-' + name + '">' + name + '</label>';
                            html += '<input type="text" id="param-field-' + name + '" class="param-input-text" data-param-name="' + name + '" data-param-type="text" value="' + defVal + '"' + descAttr + ' />';
                            if (desc) html += '<span id="param-desc-' + name + '" class="param-desc">' + desc + '</span>';
                            html += '</div>';
                        }
                    }

                    body.innerHTML = html;
                    var modal = document.getElementById('horizon-build-modal');
                    modal.classList.add('active');

                    // Focus first interactive control in modal
                    setTimeout(function() {
                        var firstInput = modal.querySelector('input, select, button');
                        if (firstInput) firstInput.focus();
                    }, 50);
                }

                function closeBuildModal() {
                    var modal = document.getElementById('horizon-build-modal');
                    if (modal) modal.classList.remove('active');
                    if (lastActiveElement) {
                        lastActiveElement.focus();
                        lastActiveElement = null;
                    }
                }

                function executeDirectBuild() {
                    fetch(jobBaseUrl + 'build', {
                        method: 'POST',
                        headers: getCrumbHeaders()
                    })
                    .then(function(res) {
                        if (res.ok) {
                            showToast("Build scheduled! Checking queue...", "success");
                            setTimeout(loadJobRuns, 500);
                        } else {
                            showToast("Trigger failed (HTTP " + res.status + ")", "error");
                        }
                    })
                    .catch(function(err) {
                        showToast("Trigger failed: " + err, "error");
                    });
                }

                function quickRebuildRun(runNum) {
                    showToast("Scheduling rebuild for run #" + runNum + "...", "info");
                    fetch(jobBaseUrl + runNum + '/horizon/apiRebuild', {
                        method: 'POST',
                        headers: getCrumbHeaders()
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.status === 'ok') {
                            showToast(data.message || ("Build #" + runNum + " rebuild scheduled!"), "success");
                            setTimeout(loadJobRuns, 500);
                        } else {
                            showToast("Rebuild failed: " + (data.message || "Unknown error"), "error");
                        }
                    })
                    .catch(function(err) {
                        showToast("Error rebuilding run: " + err, "error");
                    });
                }

                function submitParameterizedBuild() {
                    var submitBtn = document.getElementById('btn-submit-build');
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerText = "Scheduling...";
                    }

                    var formData = new FormData();
                    var fields = document.querySelectorAll('#modal-params-body [data-param-name]');
                    fields.forEach(function(el) {
                        var pName = el.getAttribute('data-param-name');
                        var pType = el.getAttribute('data-param-type');
                        var pVal = (pType === 'boolean') ? (el.checked ? 'true' : 'false') : el.value;
                        formData.append(pName, pVal);
                    });

                    fetch(jobBaseUrl + 'buildWithParameters', {
                        method: 'POST',
                        headers: getCrumbHeaders(),
                        body: formData
                    })
                    .then(function(res) {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Build';
                        }
                        if (res.ok) {
                            closeBuildModal();
                            showToast("Build scheduled with custom parameters! Checking queue...", "success");
                            setTimeout(loadJobRuns, 500);
                        } else {
                            showToast("Build trigger failed (HTTP " + res.status + ")", "error");
                        }
                    })
                    .catch(function(err) {
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Build';
                        }
                        showToast("Error triggering build: " + err, "error");
                    });
                }

                function triggerBuild() {
                    if (jobData && jobData.parameterized && jobData.parameters && jobData.parameters.length > 0) {
                        openBuildModal();
                    } else if (jobData) {
                        executeDirectBuild();
                    } else {
                        // Fallback: fetch runs first then trigger
                        fetch(horizonBaseUrl + 'apiRuns')
                            .then(function(res) { return res.json(); })
                            .then(function(data) {
                                jobData = data;
                                if (data.parameterized && data.parameters && data.parameters.length > 0) {
                                    openBuildModal();
                                } else {
                                    executeDirectBuild();
                                }
                            })
                            .catch(function() {
                                executeDirectBuild();
                            });
                    }
                }

                // Modal focus trapping and Escape handling
                document.addEventListener('keydown', function(e) {
                    var modal = document.getElementById('horizon-build-modal');
                    var isModalOpen = modal && modal.classList.contains('active');
                    if (!isModalOpen) return;

                    if (e.key === 'Escape') {
                        e.preventDefault();
                        closeBuildModal();
                    } else if (e.key === 'Tab') {
                        var focusables = modal.querySelectorAll('input:not([disabled]), select:not([disabled]), button:not([disabled])');
                        if (focusables.length === 0) return;
                        var first = focusables[0];
                        var last = focusables[focusables.length - 1];
                        if (e.shiftKey && document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        } else if (!e.shiftKey && document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                });

                loadJobRuns();
