                    var activeTab = 'branches';
                    var activeStatus = 'ALL';

                    function switchTab(tab) {
                        activeTab = tab;
                        document.getElementById('tab-btn-branches').classList.toggle('active', tab === 'branches');
                        document.getElementById('tab-btn-prs').classList.toggle('active', tab === 'prs');
                        document.getElementById('view-branches').style.display = tab === 'branches' ? 'block' : 'none';
                        document.getElementById('view-prs').style.display = tab === 'prs' ? 'block' : 'none';
                        filterItems();
                    }

                    function filterStatus(status) {
                        activeStatus = status;
                        var pills = document.querySelectorAll('.filter-pill');
                        pills.forEach(function(p) {
                            p.classList.toggle('active', p.getAttribute('data-status') === status);
                        });
                        filterItems();
                    }

                    function filterItems() {
                        var q = (document.getElementById('item-search').value || '').toLowerCase();
                        var rows = activeTab === 'branches'
                            ? document.querySelectorAll('#branches-table tbody tr')
                            : document.querySelectorAll('#prs-table tbody tr');

                        rows.forEach(function(row) {
                            var status = row.getAttribute('data-status') || '';
                            var name = (row.getAttribute('data-name') || '').toLowerCase();
                            var title = (row.getAttribute('data-title') || '').toLowerCase();
                            var commit = (row.getAttribute('data-commit') || '').toLowerCase();
                            var author = (row.getAttribute('data-author') || '').toLowerCase();

                            var matchesStatus = (activeStatus === 'ALL') || (status.indexOf(activeStatus) !== -1);
                            var matchesQuery = !q || (name.indexOf(q) !== -1) || (title.indexOf(q) !== -1) || (commit.indexOf(q) !== -1) || (author.indexOf(q) !== -1);

                            row.style.display = (matchesStatus && matchesQuery) ? '' : 'none';
                        });
                    }

                    function showToast(message, type) {
                        var container = document.getElementById('toast-container');
                        if (!container) return;
                        var toast = document.createElement('div');
                        toast.className = 'horizon-toast toast-' + (type || 'success');
                        toast.textContent = message;
                        container.appendChild(toast);
                        requestAnimationFrame(function() { toast.classList.add('show'); });
                        setTimeout(function() {
                            toast.classList.remove('show');
                            setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
                        }, 3500);
                    }

                    function scanRepo() {
                        var btn = document.getElementById('btn-scan-repo');
                        if (btn) btn.disabled = true;
                        fetch((window.HORIZON_MB_CONFIG ? window.HORIZON_MB_CONFIG.projectBaseUrl : '') + 'horizon/apiScan', {
                            method: 'POST',
                            headers: {
                                'Jenkins-Crumb': (window.crumb || (document.querySelector('head[data-crumb-value]') ? document.querySelector('head[data-crumb-value]').getAttribute('data-crumb-value') : ''))
                            }
                        })
                        .then(function(res) { return res.json(); })
                        .then(function(data) {
                            showToast(data.message || 'Repository scan triggered', 'success');
                            if (btn) btn.disabled = false;
                        })
                        .catch(function(err) {
                            showToast('Scan initiated', 'success');
                            if (btn) btn.disabled = false;
                        });
                    }
