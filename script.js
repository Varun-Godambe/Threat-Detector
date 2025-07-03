document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    
    // Tabs
    const tabFile = document.getElementById('tab-file');
    const tabUrl = document.getElementById('tab-url');
    const paneFile = document.getElementById('pane-file');
    const paneUrl = document.getElementById('pane-url');

    // File Analysis
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('fileName');
    const analyzeFileBtn = document.getElementById('analyzeFileBtn');
    
    // URL Analysis
    const urlInput = document.getElementById('url-input');
    const analyzeUrlBtn = document.getElementById('analyzeUrlBtn');

    // Results
    const analysisSection = document.getElementById('analysis-section');
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const resultsContainer = document.getElementById('results-container');

    let currentFileContent = '';
    let currentFileArrayBuffer = null;
    let currentFileName = '';

    // =================================================================================
    // --- THEME MANAGEMENT ---
    // =================================================================================
    const applyTheme = (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        sunIcon.classList.toggle('hidden', theme === 'dark');
        moonIcon.classList.toggle('hidden', theme !== 'dark');
    };
    const toggleTheme = () => {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    };
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    themeToggle.addEventListener('click', toggleTheme);

    // =================================================================================
    // --- TAB MANAGEMENT ---
    // =================================================================================
    function switchTab(activeTab) {
        const isFileTab = activeTab === 'file';
        
        tabFile.classList.toggle('active-tab', isFileTab);
        tabFile.classList.toggle('inactive-tab', !isFileTab);
        paneFile.classList.toggle('hidden', !isFileTab);

        tabUrl.classList.toggle('active-tab', !isFileTab);
        tabUrl.classList.toggle('inactive-tab', isFileTab);
        paneUrl.classList.toggle('hidden', isFileTab);
        
        // Clear results when switching tabs
        analysisSection.classList.add('hidden');
        resultsContainer.innerHTML = '';
    }
    tabFile.addEventListener('click', () => switchTab('file'));
    tabUrl.addEventListener('click', () => switchTab('url'));

    // =================================================================================
    // --- FILE HANDLING & ANALYSIS ---
    // =================================================================================
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFileSelect(fileInput.files));
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('highlight'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('highlight'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('highlight'); handleFileSelect(e.dataTransfer.files); });

    async function handleFileSelect(files) {
        if (!files || files.length === 0) return;
        const file = files[0];
        currentFileName = file.name;
        fileNameDisplay.textContent = `Selected: ${currentFileName}`;
        try {
            [currentFileContent, currentFileArrayBuffer] = await Promise.all([readFileAsText(file), readFileAsArrayBuffer(file)]);
            analyzeFileBtn.disabled = false;
        } catch (error) {
            console.error("Error reading file:", error);
            fileNameDisplay.textContent = "Error: Could not read file.";
            analyzeFileBtn.disabled = true;
        }
    }
    
    function readFileAsText(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = event => resolve(event.target.result); reader.onerror = error => reject(error); reader.readAsText(file); }); }
    function readFileAsArrayBuffer(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = event => resolve(event.target.result); reader.onerror = error => reject(error); reader.readAsArrayBuffer(file); }); }

    analyzeFileBtn.addEventListener('click', async () => {
        if (!currentFileContent) { alert("Please select a file first."); return; }
        await runAnalysis('file');
    });

    // =================================================================================
    // --- URL HANDLING & ANALYSIS ---
    // =================================================================================
    urlInput.addEventListener('input', () => {
        try {
            new URL(urlInput.value);
            analyzeUrlBtn.disabled = false;
        } catch (_) {
            analyzeUrlBtn.disabled = true;
        }
    });

    analyzeUrlBtn.addEventListener('click', async () => {
        if (analyzeUrlBtn.disabled) return;
        await runAnalysis('url');
    });

    // =================================================================================
    // --- ANALYSIS ORCHESTRATION ---
    // =================================================================================
    async function runAnalysis(type) {
        analysisSection.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        resultsContainer.style.opacity = 0;
        loader.style.display = 'flex';
        
        const agent = new ThreatAnalysisAgent();
        let results;

        try {
            if (type === 'file') {
                analyzeFileBtn.disabled = true;
                loaderText.textContent = 'Deploying AI analysis agents for file scan...';
                await new Promise(r => setTimeout(r, 1500));
                results = await agent.analyzeFile(currentFileName, currentFileContent, currentFileArrayBuffer);
                displayFileResults(results);
            } else { // type === 'url'
                analyzeUrlBtn.disabled = true;
                loaderText.textContent = 'Deploying AI analysis agents for URL scan...';
                await new Promise(r => setTimeout(r, 1500));
                results = await agent.analyzeUrl(urlInput.value);
                displayUrlResults(results);
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            resultsContainer.innerHTML = `<p class="text-center text-red-500 dark:text-red-400">An unexpected error occurred during analysis.</p>`;
        } finally {
            loader.style.display = 'none';
            resultsContainer.classList.remove('hidden');
            resultsContainer.classList.add('results-fade-in');
            if (type === 'file') analyzeFileBtn.disabled = false;
            if (type === 'url') analyzeUrlBtn.disabled = false;
        }
    }

    // =================================================================================
    // --- DYNAMIC UI RENDERING ---
    // =================================================================================

    function displayFileResults(results) {
        resultsContainer.innerHTML = ''; // Clear previous results
        if (results.analysis_type === 'log_analysis') {
            resultsContainer.innerHTML = `
                <div id="log-summary" class="mb-6"></div>
                <div class="mb-4 border-b border-gray-200 dark:border-gray-700">
                    <nav class="results-tabs -mb-px flex space-x-8" aria-label="Tabs">
                        <button data-tab="report" class="tab-btn-results whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">Vulnerability Report</button>
                        <button data-tab="intel" class="tab-btn-results whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">Threat Intelligence</button>
                        <button data-tab="chain" class="tab-btn-results whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">Attack Chain</button>
                    </nav>
                </div>
                <div id="report" class="tab-content-results"></div>
                <div id="intel" class="tab-content-results hidden"></div>
                <div id="chain" class="tab-content-results hidden"></div>
            `;
            document.getElementById('log-summary').appendChild(createSummaryCard(results.summary));
            document.getElementById('report').appendChild(createVulnerabilityReportCard(results.report));
            document.getElementById('intel').appendChild(createThreatIntelCard(results.threatIntel));
            document.getElementById('chain').appendChild(createAttackChainCard(results.attackChain));
            
            const tabs = document.querySelector('.results-tabs');
            tabs.addEventListener('click', (e) => {
                if (!e.target.matches('.tab-btn-results')) return;
                tabs.querySelectorAll('.tab-btn-results').forEach(btn => btn.classList.remove('active-tab', 'text-blue-600', 'border-blue-600'));
                e.target.classList.add('active-tab', 'text-blue-600', 'border-blue-600');
                resultsContainer.querySelectorAll('.tab-content-results').forEach(c => c.classList.add('hidden'));
                document.getElementById(e.target.dataset.tab).classList.remove('hidden');
            });
            tabs.querySelector('button').click();

        } else { // Generic file analysis
            resultsContainer.appendChild(createGenericFileCard(results));
        }
    }

    function displayUrlResults(results) {
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(createUrlAnalysisCard(results));
    }

    // --- Component Builder Functions (Securely create DOM elements) ---

    function createCard(title) {
        const card = document.createElement('div');
        card.className = 'p-6 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-md';
        if (title) {
            const titleEl = document.createElement('h3');
            titleEl.className = 'text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100';
            titleEl.textContent = title;
            card.appendChild(titleEl);
        }
        return card;
    }

    function createSummaryCard({title, content}) {
        const card = createCard(title);
        const p = document.createElement('p');
        p.className = 'text-gray-600 dark:text-gray-400 leading-relaxed';
        p.textContent = content;
        card.appendChild(p);
        return card;
    }

    function createVulnerabilityReportCard(report) {
        const card = createCard('Generated Vulnerability Report');
        const pre = document.createElement('pre');
        pre.className = 'whitespace-pre-wrap p-4 rounded-md bg-gray-100 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 font-mono';
        pre.textContent = report;
        
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy Report';
        copyButton.className = 'mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700';
        copyButton.onclick = () => {
            const textarea = document.createElement('textarea');
            textarea.value = report;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            copyButton.textContent = 'Copied!';
            setTimeout(() => copyButton.textContent = 'Copy Report', 2000);
        };

        card.append(pre, copyButton);
        return card;
    }

    function createThreatIntelCard(ips) {
        const card = createCard('Threat Intelligence Correlation');
        const wrapper = document.createElement('div');
        wrapper.className = 'overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800';
        const table = document.createElement('table');
        table.className = 'w-full text-left text-sm';
        table.innerHTML = `
            <thead class="bg-gray-50 dark:bg-slate-900/50">
                <tr class="text-gray-500 dark:text-gray-400">
                    <th class="p-4 font-medium">IP Address</th><th class="p-4 font-medium">Reputation</th><th class="p-4 font-medium">Status</th>
                </tr>
            </thead>
        `;
        const tbody = document.createElement('tbody');
        tbody.className = 'divide-y divide-gray-200 dark:divide-gray-700';
        ips.forEach(({ip, isThreat}) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-4 font-mono text-gray-700 dark:text-gray-300">${ip}</td>
                <td class="p-4 font-semibold ${isThreat ? 'text-red-500' : 'text-green-500'}">${isThreat ? 'Known Malicious' : 'Nominal'}</td>
                <td class="p-4"><span class="px-2 py-1 text-xs font-medium rounded-full ${isThreat ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'}">${isThreat ? 'Threat' : 'OK'}</span></td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrapper.appendChild(table);
        card.appendChild(wrapper);
        return card;
    }

    function createAttackChainCard(steps) {
        const card = createCard('Reconstructed Attack Chain');
        const wrapper = document.createElement('div');
        wrapper.className = 'relative pl-6';
        steps.forEach((step, index) => {
            const item = document.createElement('div');
            item.className = 'attack-chain-item relative flex items-start pb-8';
            item.innerHTML = `
                <div class="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">${index + 1}</div>
                <p class="ml-10 text-sm text-gray-700 dark:text-gray-300">${step}</p>
            `;
            wrapper.appendChild(item);
        });
        card.appendChild(wrapper);
        return card;
    }
    
    function createGenericFileCard({ threat_level, summary, details }) {
        const threatColors = { "Safe": "text-green-500", "Low": "text-yellow-500", "Medium": "text-orange-500", "High": "text-red-500", "Critical": "text-pink-500" };
        const card = createCard('File Analysis Report');
        card.innerHTML += `
            <div class="grid gap-2 text-sm">
                <p><strong class="w-28 inline-block text-gray-600 dark:text-gray-400">Overall Verdict:</strong> <span class="font-semibold ${threatColors[threat_level] || 'text-gray-500'}">${threat_level}</span></p>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 class="font-semibold text-gray-900 dark:text-gray-100">AI Agent Summary</h4>
                <p class="text-gray-600 dark:text-gray-400 mt-1">${summary}</p>
            </div>
        `;
        if (details && details.length > 0) {
            const detailsContainer = document.createElement('div');
            detailsContainer.className = 'mt-4 pt-4 border-t border-gray-200 dark:border-gray-700';
            detailsContainer.innerHTML = `<h4 class="font-semibold text-gray-900 dark:text-gray-100">Technical Detections</h4>`;
            const list = document.createElement('ul');
            list.className = 'mt-2 space-y-2';
            details.forEach(d => {
                const item = document.createElement('li');
                item.className = 'flex items-start';
                item.innerHTML = `
                    <span class="mr-3 mt-1 flex-shrink-0"><svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg></span>
                    <div><strong class="font-semibold text-gray-800 dark:text-gray-200">${d.title}:</strong> <span class="text-gray-600 dark:text-gray-400">${d.description}</span></div>
                `;
                list.appendChild(item);
            });
            detailsContainer.appendChild(list);
            card.appendChild(detailsContainer);
        }
        return card;
    }

    function createUrlAnalysisCard({ url, verdict, summary, details }) {
        const verdictMap = {
            "Safe": { color: "green", icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`},
            "Malicious": { color: "red", icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`},
            "Suspicious": { color: "yellow", icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`}
        };
        const v = verdictMap[verdict] || verdictMap["Suspicious"];
        const card = createCard();
        card.className += ' text-center';
        card.innerHTML = `
            <div class="flex justify-center text-${v.color}-500">${v.icon}</div>
            <h3 class="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">${verdict}</h3>
            <p class="mt-2 font-mono text-sm text-gray-500 dark:text-gray-400 break-all">${url}</p>
            <p class="mt-4 text-gray-600 dark:text-gray-300">${summary}</p>
        `;
        if (details && details.length > 0) {
            const detailsContainer = document.createElement('div');
            detailsContainer.className = 'mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-left';
            detailsContainer.innerHTML = `<h4 class="font-semibold text-gray-900 dark:text-gray-100 text-center mb-4">Reasons:</h4>`;
            const list = document.createElement('ul');
            list.className = 'space-y-2';
            details.forEach(d => {
                const item = document.createElement('li');
                item.className = 'flex items-center text-sm';
                item.innerHTML = `
                    <span class="mr-3"><svg class="w-4 h-4 text-${v.color}-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg></span>
                    <span class="text-gray-700 dark:text-gray-300">${d}</span>
                `;
                list.appendChild(item);
            });
            detailsContainer.appendChild(list);
            card.appendChild(detailsContainer);
        }
        return card;
    }

    // =================================================================================
    // --- SIMULATED THREAT ANALYSIS AGENT ---
    // =================================================================================
    class ThreatAnalysisAgent {
        async analyzeFile(fileName, fileContent, fileArrayBuffer) {
            if (fileName.endsWith('.log') || fileName.endsWith('.txt')) {
                return this._runLogAnalysis(fileContent);
            } else {
                return this._runGenericFileAnalysis(fileContent, fileArrayBuffer, fileName);
            }
        }

        async analyzeUrl(url) {
            await new Promise(r => setTimeout(r, 500)); // Simulate network call
            // Simulate different outcomes based on URL content
            if (url.includes('phishing') || url.includes('login.microsoft.bad-actor.com')) {
                return { verdict: "Malicious", summary: "This URL is on known blacklists for phishing and credential theft.", details: ["Identified as a phishing site", "Hosts known malware", "Attempts to impersonate a legitimate service"] };
            }
            if (url.includes('.xyz') || url.includes('free-stuff')) {
                return { verdict: "Suspicious", summary: "This URL exhibits characteristics common to spam or unwanted software sites.", details: ["Uses a low-reputation Top-Level Domain (TLD)", "Domain registered very recently"] };
            }
            return { verdict: "Safe", summary: "Our AI agents found no evidence of malicious activity or threats associated with this URL.", details: ["Passes all blacklist checks", "Valid SSL/TLS certificate", "Good domain reputation"] };
        }

        async _runLogAnalysis(logContent) {
            const uniqueIPs = [...new Set(logContent.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g) || [])];
            const threatIPs = ['192.168.0.101', '192.168.0.41', '10.0.5.22', '203.0.113.55'];
            const intel = uniqueIPs.map(ip => ({ip, isThreat: threatIPs.includes(ip) && Math.random() > 0.3}));
            
            const report = `
VULNERABILITY REPORT - EXECUTIVE SUMMARY
-----------------------------------------
DATE: ${new Date().toISOString().split('T')[0]}
ANALYSIS: Log File Incident Review

An automated data exfiltration attack was identified, originating from multiple suspicious IP addresses. The Logfile Forensics Agent detected a script making repetitive, hourly API calls to wildcard endpoints, successfully exfiltrating records before sessions were terminated.

KEY FINDINGS:
1.  [HIGH] T1078.001 - Valid Accounts: Initial access gained via suspicious login from USER_C.
2.  [MEDIUM] T1555.003 - Credentials from Password Stores: Simultaneous login from a near-identical account (USER_B) suggests credential compromise.
3.  [CRITICAL] T1486 - Data Encrypted for Impact: Automated script initiated hourly API calls to 'factory=*' endpoints.
4.  [HIGH] T1071.001 - Application Layer Protocol: Data exfiltration confirmed via outbound traffic spikes from IP_3.

RECOMMENDATIONS:
- Immediately rotate credentials for all involved user accounts.
- Block all identified malicious IP addresses at the firewall.
- Implement rate limiting on API endpoints to prevent scraping.
- Review access control lists for the affected data stores.
`;

            return { 
                analysis_type: 'log_analysis',
                summary: { title: "Log Analysis Executive Summary", content: "An automated data exfiltration attack was identified. The attacker utilized a script to make repetitive API calls to scrape and exfiltrate data. See the detailed report and attack chain for more information." },
                report: report,
                attackChain: ["Initial access via suspicious login from USER_C.", "Simultaneous login from a near-identical account (USER_B) to establish persistence.", "Automated script initiated hourly API calls to `factory=*` endpoints.", "Attacker re-authenticated after session expiration.", "Data exfiltration confirmed via outbound traffic spikes from IP_3."],
                threatIntel: intel
            };
        }
        
        _runGenericFileAnalysis(content, arrayBuffer, fileName) {
            let details = [];
            let threat_level = 'Safe';
            let score = 0;
            const view = new Uint8Array(arrayBuffer);

            const signatures = { '4D 5A': 'Windows Executable (MZ)', '7F 45 4C 46': 'Linux Executable (ELF)'};
            const fileSignature = Array.from(view.slice(0, 4)).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
            for (const [sig, type] of Object.entries(signatures)) {
                if (fileSignature.startsWith(sig) && !fileName.toLowerCase().endsWith('.exe') && !fileName.toLowerCase().endsWith('.dll')) {
                    details.push({ title: 'Disguised Executable', description: `File has the signature of a ${type} but a non-standard extension. (CVE-2023-36884)` });
                    score += 40;
                }
            }
            
            const entropy = this._calculateEntropy(view);
            if (entropy > 7.5) {
                details.push({ title: 'High Entropy Detected', description: `Score of ${entropy.toFixed(2)}/8.0 suggests file is packed or encrypted to hide malicious code.` });
                score += 30;
            }

            if (content.includes("Invoke-Expression") || content.includes("IEX")) {
                details.push({ title: 'Suspicious PowerShell Command', description: 'Contains `Invoke-Expression`, often used to execute malicious scripts.' });
                score += 20;
            }
            if (content.includes("rm -rf /")) {
                details.push({ title: 'Potentially Destructive Command', description: 'Contains `rm -rf /`, which can wipe the filesystem.' });
                score += 50;
            }

            if (score > 80) threat_level = 'Critical';
            else if (score > 50) threat_level = 'High';
            else if (score > 20) threat_level = 'Medium';
            else if (score > 0) threat_level = 'Low';

            let summary = details.length > 0 
                ? 'Our AI agents found several indicators of potential malicious activity. Please review the technical details.' 
                : 'Our AI agents performed a static analysis and found no significant threats based on current rules.';
                
            return { analysis_type: 'generic_file', threat_level, summary, details };
        }
        
        _calculateEntropy(data) { const l=new Array(256).fill(0);for(let i=0;i<data.length;i++){l[data[i]]++}let e=0;const n=data.length;if(n===0)return 0;for(let i=0;i<256;i++){if(l[i]===0)continue;const t=l[i]/n;e-=t*(Math.log(t)/Math.log(2))}return e }
    }
});
