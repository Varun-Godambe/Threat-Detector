// --- ui.js ---
// This module manages all UI interactions and dynamic HTML rendering.
// It now includes logic to display the PII anonymization map.

let donutChart = null;

// --- Theme Management ---
export function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.getElementById('theme-icon-sun').classList.toggle('hidden', theme === 'dark');
    document.getElementById('theme-icon-moon').classList.toggle('hidden', theme !== 'dark');
    if (donutChart) {
        const isDark = document.documentElement.classList.contains('dark');
        donutChart.options.plugins.legend.labels.color = isDark ? '#e5e7eb' : '#1f2937';
        donutChart.update();
    }
}

export function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
}

// --- Mobile Navigation ---
export function openSidebar() {
    document.getElementById('sidebar').classList.remove('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.remove('hidden');
}

export function closeSidebar() {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.add('hidden');
}

// --- Tab Management ---
export function switchTab(activeTab) {
    const isFileTab = activeTab === 'file';
    document.getElementById('tab-file').classList.toggle('active-tab', isFileTab);
    document.getElementById('tab-file').classList.toggle('inactive-tab', !isFileTab);
    document.getElementById('pane-file').classList.toggle('hidden', !isFileTab);

    document.getElementById('tab-url').classList.toggle('active-tab', !isFileTab);
    document.getElementById('tab-url').classList.toggle('inactive-tab', isFileTab);
    document.getElementById('pane-url').classList.toggle('hidden', isFileTab);
    
    document.getElementById('analysis-section').classList.add('hidden');
    document.getElementById('results-container').innerHTML = '';
}

// --- File List UI ---
export function updateFileListUI(files) {
    const fileListContainer = document.getElementById('file-list-container');
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    if (files.length > 0) {
        fileListContainer.classList.remove('hidden');
        files.forEach(file => {
            const li = document.createElement('li');
            li.className = 'text-sm text-muted-foreground truncate';
            li.textContent = file.name;
            fileList.appendChild(li);
        });
    } else {
        fileListContainer.classList.add('hidden');
    }
}

// =================================================================================
// --- DYNAMIC UI RENDERING ---
// =================================================================================

export function displayAiLogReport(fullReportData, resultsContainer) {
    resultsContainer.innerHTML = '';
    const { piiMap, analysis } = fullReportData;
    
    if (analysis.analysisResult === "No security issues or notable events found.") {
        const card = document.createElement('div');
        card.className = 'p-6 rounded-lg bg-card border border-border shadow-md';
        card.innerHTML = `
            <div class="text-center">
                <div class="flex justify-center text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 class="mt-4 text-2xl font-bold text-foreground">Analysis Complete</h3>
                <p class="mt-4 text-muted-foreground">The AI Forensics Agent analyzed the file(s) and found no security issues or notable events.</p>
            </div>
        `;
        resultsContainer.appendChild(card);
    } else {
        const { summaryStats, findings } = analysis.analysisResult;
        
        resultsContainer.appendChild(createDashboardHeader(summaryStats, findings.length));
        
        const dashboardContainer = document.createElement('div');
        dashboardContainer.className = 'p-6 rounded-lg bg-card border border-border shadow-md';
        
        const categories = [...new Set(findings.map(f => f.category))];
        
        let tabsHTML = '<div class="border-b border-border"><nav class="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">';
        tabsHTML += `<button data-category="all" class="ai-tab-btn active-tab group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap">All Findings (${findings.length})</button>`;
        categories.forEach(cat => {
            const count = findings.filter(f => f.category === cat).length;
            tabsHTML += `<button data-category="${cat}" class="ai-tab-btn inactive-tab group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap">${cat.replace(/ and /g, ' & ')} (${count})</button>`;
        });
        tabsHTML += '</nav></div>';
        
        dashboardContainer.innerHTML = tabsHTML;
        
        const findingsContainer = document.createElement('div');
        findingsContainer.className = 'mt-6 space-y-4';
        findings.forEach(finding => {
            findingsContainer.appendChild(createFindingCard(finding));
        });
        
        dashboardContainer.appendChild(findingsContainer);
        resultsContainer.appendChild(dashboardContainer);

        // Add the Anonymization Key card if the map exists and is not empty
        if (piiMap && Object.keys(piiMap).length > 0) {
            resultsContainer.appendChild(createAnonymizationKeyCard(piiMap));
        }

        dashboardContainer.querySelectorAll('.ai-tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                dashboardContainer.querySelectorAll('.ai-tab-btn').forEach(btn => btn.classList.remove('active-tab', 'inactive-tab') || btn.classList.add('inactive-tab'));
                button.classList.add('active-tab');
                button.classList.remove('inactive-tab');
                
                const selectedCategory = button.dataset.category;
                findingsContainer.querySelectorAll('.finding-card').forEach(card => {
                    card.classList.toggle('hidden', !(selectedCategory === 'all' || card.dataset.category === selectedCategory));
                });
            });
        });

        renderDonutChart(summaryStats);
    }
}

function createAnonymizationKeyCard(piiMap) {
    const card = document.createElement('div');
    card.className = 'p-6 mt-6 rounded-lg bg-card border border-border shadow-md';
    card.innerHTML = `<h3 class="text-xl font-semibold mb-4 text-foreground">Anonymization Key</h3>`;

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'overflow-x-auto rounded-lg border border-border';
    const table = document.createElement('table');
    table.className = 'w-full text-left text-sm';
    table.innerHTML = `
        <thead class="bg-muted"><tr class="text-muted-foreground">
            <th class="p-4 font-medium">Placeholder</th>
            <th class="p-4 font-medium">Original Value</th>
        </tr></thead>
    `;
    const tbody = document.createElement('tbody');
    tbody.className = 'divide-y divide-border';

    for (const [placeholder, original] of Object.entries(piiMap)) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-4 font-mono text-primary">${placeholder}</td>
            <td class="p-4 font-mono text-foreground">${original}</td>
        `;
        tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    card.appendChild(tableWrapper);
    return card;
}


function createDashboardHeader(stats, totalFindings) {
    const header = document.createElement('div');
    header.className = 'p-6 rounded-lg bg-card border border-border shadow-md mb-6';
    header.innerHTML = `
        <h3 class="text-xl font-semibold mb-4 text-foreground">Analysis Overview</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div class="stat-card bg-muted p-4 rounded-lg text-center"><p class="text-sm font-medium text-muted-foreground">Total Findings</p><p class="text-3xl font-bold text-foreground">${totalFindings}</p></div>
                <div class="stat-card bg-red-100 dark:bg-red-900/50 p-4 rounded-lg text-center"><p class="text-sm font-medium text-red-600 dark:text-red-400">Critical</p><p class="text-3xl font-bold text-red-700 dark:text-red-300">${stats.critical || 0}</p></div>
                <div class="stat-card bg-orange-100 dark:bg-orange-900/50 p-4 rounded-lg text-center"><p class="text-sm font-medium text-orange-600 dark:text-orange-400">High</p><p class="text-3xl font-bold text-orange-700 dark:text-orange-300">${stats.high || 0}</p></div>
                <div class="stat-card bg-yellow-100 dark:bg-yellow-900/50 p-4 rounded-lg text-center"><p class="text-sm font-medium text-yellow-600 dark:text-yellow-400">Medium</p><p class="text-3xl font-bold text-yellow-700 dark:text-yellow-300">${stats.medium || 0}</p></div>
                <div class="stat-card bg-blue-100 dark:bg-blue-900/50 p-4 rounded-lg text-center"><p class="text-sm font-medium text-blue-600 dark:text-blue-400">Low</p><p class="text-3xl font-bold text-blue-700 dark:text-blue-300">${stats.low || 0}</p></div>
                <div class="stat-card bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg text-center"><p class="text-sm font-medium text-gray-600 dark:text-gray-400">Info</p><p class="text-3xl font-bold text-gray-700 dark:text-gray-300">${stats.informational || 0}</p></div>
            </div>
            <div class="flex items-center justify-center p-4">
                <canvas id="severity-chart"></canvas>
            </div>
        </div>
    `;
    return header;
}

function renderDonutChart(stats) {
    const ctx = document.getElementById('severity-chart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const data = {
        labels: ['Critical', 'High', 'Medium', 'Low', 'Informational'],
        datasets: [{
            label: 'Findings by Severity',
            data: [stats.critical || 0, stats.high || 0, stats.medium || 0, stats.low || 0, stats.informational || 0],
            backgroundColor: ['#dc2626', '#f97316', '#facc15', '#3b82f6', '#6b7280'],
            borderColor: isDark ? '#1f2937' : '#ffffff',
            borderWidth: 2
        }]
    };
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: isDark ? '#e5e7eb' : '#1f2937', boxWidth: 12, padding: 15 } }
            }
        }
    });
}

function createFindingCard({ category, severity, timestamp, title, details, action }) {
    const severityColors = {"Critical": "bg-red-600 text-white", "High": "bg-red-500 text-white", "Medium": "bg-yellow-500 text-black", "Low": "bg-blue-500 text-white", "Informational": "bg-gray-500 text-white" };
    const card = document.createElement('div');
    card.className = 'finding-card p-4 rounded-lg border border-border';
    card.dataset.category = category;
    card.innerHTML = `<div class="flex flex-col sm:flex-row justify-between sm:items-start gap-2"><h4 class="font-semibold text-foreground flex-1">${title}</h4><div class="flex items-center gap-2 flex-shrink-0"><span class="text-xs font-mono text-muted-foreground">${timestamp}</span><span class="text-xs font-bold uppercase px-2 py-1 rounded-full ${severityColors[severity] || 'bg-gray-400'}">${severity}</span></div></div><p class="mt-2 text-sm text-muted-foreground">${details}</p><div class="mt-3 pt-3 border-t border-border"><p class="text-sm"><strong class="font-semibold text-foreground">Recommended Action:</strong> <span class="text-muted-foreground">${action}</span></p></div>`;
    return card;
}

export function displayVirusTotalFileReport(report, fileName, resultsContainer) {
    const stats = report.attributes.stats;
    const maliciousCount = stats.malicious;
    const suspiciousCount = stats.suspicious;
    const totalVotes = stats.harmless + maliciousCount + suspiciousCount + stats.undetected;
    let verdict, color, summary;
    if (maliciousCount > 0) { verdict = "Malicious"; color = "red"; summary = `This file is flagged as malicious by ${maliciousCount} out of ${totalVotes} security vendors. It is strongly recommended to delete this file immediately.`;
    } else if (suspiciousCount > 0) { verdict = "Suspicious"; color = "yellow"; summary = `This file is flagged as suspicious by ${suspiciousCount} vendors. While not confirmed malicious, it exhibits unusual characteristics. Handle with extreme caution.`;
    } else { verdict = "Safe"; color = "green"; summary = `No security vendors flagged this file as malicious. It appears to be safe.`; }
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(createVerdictCard(verdict, color, summary, fileName));
    resultsContainer.appendChild(createDetailsTable(report.attributes.results));
}

export function displayVirusTotalUrlReport(report, url, resultsContainer) {
    const stats = report.attributes.stats;
    const maliciousCount = stats.malicious;
    const suspiciousCount = stats.suspicious;
    const totalVotes = stats.harmless + maliciousCount + suspiciousCount + stats.undetected;
    let verdict, color, summary;
    if (maliciousCount > 0) { verdict = "Malicious"; color = "red"; summary = `This URL is flagged as malicious by ${maliciousCount} out of ${totalVotes} security vendors. Do not visit this site.`;
    } else if (suspiciousCount > 0) { verdict = "Suspicious"; color = "yellow"; summary = `This URL is flagged as suspicious by ${suspiciousCount} vendors. It may be unsafe. Proceed with extreme caution.`;
    } else { verdict = "Safe"; color = "green"; summary = `No security vendors flagged this URL as malicious. It appears to be safe.`; }
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(createVerdictCard(verdict, color, summary, url));
    resultsContainer.appendChild(createDetailsTable(report.attributes.results));
}

function createVerdictCard(verdict, color, summary, subject) {
    const icons = { red: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`, yellow: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`, green: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`, };
    const card = document.createElement('div');
    card.className = `p-6 rounded-lg bg-card border border-border shadow-md text-center mb-6`;
    card.innerHTML = `<div class="flex justify-center text-${color}-500">${icons[color]}</div><h3 class="mt-4 text-2xl font-bold text-foreground">${verdict}</h3><p class="mt-2 font-mono text-sm text-muted-foreground break-all">${subject}</p><p class="mt-4 text-muted-foreground max-w-2xl mx-auto">${summary}</p>`;
    return card;
}

function createDetailsTable(results) {
    const card = document.createElement('div');
    card.className = 'p-6 rounded-lg bg-card border border-border shadow-md';
    const title = document.createElement('h3');
    title.className = 'text-xl font-semibold mb-4 text-foreground';
    title.textContent = 'Detailed Analysis Report from Security Vendors';
    const wrapper = document.createElement('div');
    wrapper.className = 'overflow-x-auto rounded-lg border border-border';
    const table = document.createElement('table');
    table.className = 'w-full text-left text-sm';
    table.innerHTML = `<thead class="bg-muted"><tr class="text-muted-foreground"><th class="p-4 font-medium">Security Vendor</th><th class="p-4 font-medium">Category</th><th class="p-4 font-medium">Result</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    tbody.className = 'divide-y divide-border';
    for (const engine in results) {
        const result = results[engine];
        const tr = document.createElement('tr');
        const category = result.category;
        let colorClass = 'text-muted-foreground';
        if (category === 'malicious') colorClass = 'text-red-600 dark:text-red-400';
        if (category === 'suspicious') colorClass = 'text-yellow-600 dark:text-yellow-400';
        tr.innerHTML = `<td class="p-4 font-semibold text-foreground">${result.engine_name}</td><td class="p-4 font-medium ${colorClass}">${category.charAt(0).toUpperCase() + category.slice(1)}</td><td class="p-4 font-mono text-xs text-muted-foreground">${result.result || 'Clean'}</td>`;
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrapper.appendChild(table);
    card.append(title, wrapper);
    return card;
}
