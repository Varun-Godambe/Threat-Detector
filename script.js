document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const splashScreen = document.getElementById('splash-screen');
    const mainApp = document.getElementById('main-app');
    const enterBtn = document.getElementById('enter-btn');
    const fileChoiceBtn = document.getElementById('file-choice-btn');
    const urlChoiceBtn = document.getElementById('url-choice-btn');
    const fileInputContainer = document.getElementById('file-input-container');
    const urlInputContainer = document.getElementById('url-input-container');
    const dropZone = document.getElementById('drop-zone');
    const logFileInput = document.getElementById('logFile');
    const fileNameDisplay = document.getElementById('fileName');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analysisSection = document.getElementById('analysis-section');
    const loader = document.getElementById('loader');
    const resultsContainer = document.getElementById('results-container');
    const errorMessage = document.getElementById('error-message');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const docsBtn = document.getElementById('docs-btn');
    const docsModal = document.getElementById('docs-modal');
    const closeDocsBtn = document.getElementById('close-docs-btn');

    let fileContent = '';
    let currentFile = null;
    let currentInputMode = 'none'; // 'file', 'url', or 'none'
    const SIMULATED_THREAT_IPS = ['192.168.0.101', '192.168.0.41'];

    // --- Theme Management ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    
    // --- Event Listeners ---
    enterBtn.addEventListener('click', () => {
        splashScreen.classList.add('hidden');
        mainApp.style.display = 'block';
        setTimeout(() => mainApp.classList.add('visible'), 50);
    });

    fileChoiceBtn.addEventListener('click', () => setInputMode('file'));
    urlChoiceBtn.addEventListener('click', () => setInputMode('url'));

    dropZone.addEventListener('click', () => logFileInput.click());
    logFileInput.addEventListener('change', () => handleFileSelect(logFileInput.files));
    analyzeBtn.addEventListener('click', startAnalysis);
    themeToggle.addEventListener('click', toggleTheme);
    
    docsBtn.addEventListener('click', () => docsModal.classList.add('visible'));
    closeDocsBtn.addEventListener('click', () => docsModal.classList.remove('visible'));
    docsModal.addEventListener('click', (e) => {
        if (e.target === docsModal) {
            docsModal.classList.remove('visible');
        }
    });
    
    document.getElementById('urlInput').addEventListener('input', (e) => {
        analyzeBtn.disabled = !e.target.value.trim();
    });

    // Drag and Drop Listeners
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-slate-50', 'dark:bg-slate-700/50'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('border-blue-500', 'bg-slate-50', 'dark:bg-slate-700/50'); });
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('border-blue-500', 'bg-slate-50', 'dark:bg-slate-700/50'); handleFileSelect(e.dataTransfer.files); });

    function setInputMode(mode) {
        currentInputMode = mode;
        fileChoiceBtn.classList.toggle('active', mode === 'file');
        urlChoiceBtn.classList.toggle('active', mode === 'url');

        fileInputContainer.classList.toggle('active', mode === 'file');
        urlInputContainer.classList.toggle('active', mode === 'url');
        
        analyzeBtn.textContent = mode === 'file' ? 'Analyze File' : 'Analyze URL';
        analyzeBtn.disabled = true; // Reset on mode change
        if (mode === 'file' && currentFile) analyzeBtn.disabled = false;
        if (mode === 'url' && document.getElementById('urlInput').value.trim()) analyzeBtn.disabled = false;
    }

    function handleFileSelect(files) {
        if (!files || files.length === 0) return;
        currentFile = files[0];
        fileNameDisplay.textContent = `File selected: ${currentFile.name}`;
        const reader = new FileReader();
        reader.onload = (e) => {
            fileContent = e.target.result;
            analyzeBtn.disabled = false;
        };
        reader.onerror = () => { displayError("Error reading file."); analyzeBtn.disabled = true; };
        reader.readAsText(currentFile);
    }

    function displayError(message) {
        errorMessage.textContent = `Error: ${message}`;
        setTimeout(() => { errorMessage.textContent = ''; }, 5000);
    }

    async function startAnalysis() {
        analysisSection.style.display = 'block';
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        loader.style.display = 'flex';
        analyzeBtn.disabled = true;
        errorMessage.textContent = '';

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (currentInputMode === 'file') {
                if (!fileContent) {
                    displayError("No file content to analyze.");
                    return;
                }
                if (currentFile && (currentFile.name.includes('log') || currentFile.name.endsWith('.txt'))) {
                    await runLogAnalysis();
                } else {
                    await runFileAnalysis();
                }
            } else if (currentInputMode === 'url') {
                const url = document.getElementById('urlInput').value;
                if (!url.trim()) {
                    displayError("Please enter a URL.");
                    return;
                }
                await runUrlAnalysis(url);
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            displayError(`Analysis failed: ${error.message}.`);
        } finally {
            loader.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    }

    async function runLogAnalysis() {
        const anonymizedLogs = anonymizeLogContent(fileContent);
        const uniqueIPs = extractUniqueIPs(fileContent);

        const [summary, anomalies, attackChainSteps] = await Promise.all([
            incidentSummarizerAgent(anonymizedLogs),
            Promise.all([
                automatedBehaviorAgent(anonymizedLogs),
                simultaneousLoginAgent(anonymizedLogs),
                unusualEndpointAgent(anonymizedLogs),
                sessionExpirationAgent(anonymizedLogs)
            ]),
            attackChainAgent(anonymizedLogs)
        ]);
        
        resultsContainer.innerHTML = `
            <div id="summary-container" class="mb-8"></div>
            <div class="tabs flex justify-center space-x-4 md:space-x-8 mb-6 border-b border-slate-200 dark:border-slate-700">
                <button data-tab="anomalies" class="py-2 px-4 font-semibold">Anomaly Report</button>
                <button data-tab="threat-intel" class="py-2 px-4 font-semibold">Threat Intelligence</button>
                <button data-tab="attack-chain" class="py-2 px-4 font-semibold">Attack Chain</button>
            </div>
            <div id="anomalies" class="tab-content results-list"></div>
            <div id="threat-intel" class="tab-content"></div>
            <div id="attack-chain" class="tab-content"></div>
        `;
        
        document.querySelector('.tabs').addEventListener('click', handleTabClick);

        if(summary) document.getElementById('summary-container').innerHTML = createSummaryCard(summary);
        
        const anomaliesContent = document.getElementById('anomalies');
        anomalies.filter(r => r).forEach((result, index) => {
            const card = createResultCard(result);
            card.style.animationDelay = `${index * 150}ms`;
            anomaliesContent.appendChild(card);
        });

        renderThreatIntel(uniqueIPs);
        renderAttackChain(attackChainSteps);
        
        resultsContainer.classList.remove('hidden');
        document.querySelector('.tabs button').click();
    }

    function handleTabClick(e) {
        if (e.target.tagName !== 'BUTTON') return;
        const tabsContainer = e.currentTarget;
        tabsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        resultsContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(e.target.dataset.tab).classList.add('active');
    }

    async function runFileAnalysis() {
        const analysisResult = await staticFileAnalysisAgent(fileContent);
        resultsContainer.innerHTML = createFileAnalysisCard(analysisResult);
        resultsContainer.classList.remove('hidden');
    }

    async function runUrlAnalysis(url) {
        const analysisResult = await maliciousLinkAgent(url);
        resultsContainer.innerHTML = createUrlAnalysisCard(analysisResult);
        resultsContainer.classList.remove('hidden');
    }

    // --- SIMULATED AI AGENTS ---
    function anonymizeLogContent(content) {
        let anonymizedContent = content;
        const ipMap = new Map();
        const userMap = new Map();
        let ipCounter = 1;
        let userCounter = 1;
        anonymizedContent = anonymizedContent.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):/g, (match, ip) => {
            if (!ipMap.has(ip)) ipMap.set(ip, `IP_ADDRESS_${ipCounter++}`);
            return `${ipMap.get(ip)}:`;
        });
        anonymizedContent = anonymizedContent.replace(/"authorizedUserId":\s*"([^"]+)"/g, (match, userId) => {
            if (!userMap.has(userId)) userMap.set(userId, `USER_${String.fromCharCode(64 + userCounter++)}`);
            return `"authorizedUserId": "${userMap.get(userId)}"`;
        });
        return anonymizedContent;
    }
    function extractUniqueIPs(content) {
        const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):/g;
        const ips = new Set();
        let match;
        while ((match = ipRegex.exec(content)) !== null) {
            ips.add(match[1]);
        }
        return Array.from(ips);
    }
    async function callSimulatedApi(prompt, content) {
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        
        if (prompt.includes("malicious link")) {
            let threat_level = "None";
            let threat_type = "Benign";
            let summary = "The URL appears to be safe. No malicious indicators found.";
            
            const knownMaliciousDomains = ["phish-site.net", "malware-distro.com", "bad-actor.io"];
            
            try {
                const urlHostname = new URL(content).hostname;
                if (knownMaliciousDomains.some(domain => urlHostname.includes(domain))) {
                    threat_level = "Critical";
                    threat_type = "Known Malicious Domain";
                    summary = "This URL is on a known threat list. It is highly likely to be malicious.";
                } else if (urlHostname.split('.').length > 3) {
                     threat_level = "High";
                    threat_type = "Suspicious Subdomain";
                    summary = "The URL uses multiple subdomains, a common tactic for obfuscating phishing sites.";
                } else if (content.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
                     threat_level = "Medium";
                    threat_type = "Direct IP Address";
                    summary = "The URL uses a direct IP address instead of a domain name, which can be a tactic to hide malicious infrastructure.";
                } else if (content.includes(".zip") || content.includes(".exe") || content.includes("download")) {
                    threat_level = "High";
                    threat_type = "Direct Download";
                    summary = "This URL appears to link to a direct file download, which is a common vector for malware distribution.";
                }
            } catch (e) {
                threat_level = "Indeterminate";
                threat_type = "Invalid URL";
                summary = "The provided input could not be parsed as a valid URL.";
            }
            return JSON.stringify({ url: content, threat_level, threat_type, summary });
        }

        if (prompt.includes("Static Analysis Security Testing")) {
            let file_type = "Unknown";
            let threat_level = "Low";
            let summary = "No immediate threats detected, but review is recommended.";

            if (content.toLowerCase().includes("powershell")) file_type = "PowerShell Script";
            else if (content.toLowerCase().includes("import") && content.toLowerCase().includes("def ")) file_type = "Python Script";
            else if (content.trim().startsWith("{") || content.trim().startsWith("[")) file_type = "JSON Configuration";

            if (content.includes("Invoke-Expression") || content.includes("IEX")) {
                threat_level = "High";
                summary = "Detected use of Invoke-Expression, which can execute arbitrary code. This is a high-risk indicator.";
            } else if (content.includes("rm -rf")) {
                threat_level = "Critical";
                summary = "Detected recursive force delete command ('rm -rf'). This is extremely dangerous and can wipe data.";
            }
            
            return JSON.stringify({ file_type, threat_level, summary });
        }
        if (prompt.includes("Executive Summary")) return "An automated data exfiltration attack was identified, originating from USER_B (IP_ADDRESS_20) and USER_C (IP_ADDRESS_21). The attacker utilized a script to make repetitive, hourly API calls to wildcard endpoints to scrape machine status data. The activity persisted across multiple sessions, indicating a determined effort to exfiltrate data over time.";
        if (prompt.includes("attack chain")) return JSON.stringify(["Initial suspicious login from USER_C at 2021-06-25T16:14:54.000Z.", "Simultaneous login from a near-identical account (USER_B) from a different IP.", "Automated script initiated hourly API calls to `factory=*` endpoints.", "Session expired, causing a series of '401 Unauthorized' errors.", "Attacker re-authenticated on 2021-06-26T16:04:54.000Z and resumed the automated script."]);
        if (prompt.includes("automated behavior")) return "Automated behavior was detected from USER_C at IP_ADDRESS_20. The user made GET requests to `/api/factory/machine/status?factory=*` at precise one-hour intervals, starting at 2021-06-25T17:00:48.000Z. This pattern is highly indicative of a script, not manual user activity.";
        if (prompt.includes("simultaneous logins")) return "Suspicious simultaneous logins detected at 2021-06-25T16:14:54.000Z. USER_B logged in from IP_ADDRESS_19, and USER_C (a nearly identical user ID) logged in from IP_ADDRESS_20 at the exact same time. This suggests a coordinated action or compromised credentials being used from multiple locations.";
        if (prompt.includes("Unusual Endpoint Usage")) return "USER_C consistently used wildcard queries (`factory=*`) to fetch data from all factories at once. This is unusual for normal dashboard use and strongly suggests an attempt to exfiltrate bulk data efficiently.";
        if (prompt.includes("session expiration")) return "A clear pattern of session expiration and re-login was observed for USER_C. After a series of successful hourly requests, API calls began failing with '401 (UNAUTHORIZED)' at 2021-06-26T00:00:48.000Z. The user then re-authenticated at 2021-06-26T16:04:54.000Z and resumed the automated requests, indicating a persistent attacker managing session timeouts.";
        return null;
    }

    async function staticFileAnalysisAgent(content) { const r = await callSimulatedApi("Static Analysis Security Testing", content); return JSON.parse(r); }
    async function maliciousLinkAgent(url) { const r = await callSimulatedApi("malicious link", url); return JSON.parse(r); }
    async function incidentSummarizerAgent(logs) { return await callSimulatedApi("Executive Summary", logs); }
    async function attackChainAgent(logs) { const r = await callSimulatedApi("attack chain", logs); return JSON.parse(r); }
    async function automatedBehaviorAgent(logs) { const a = await callSimulatedApi("automated behavior", logs); if (!a) return null; return { title: "Automated Behavior Detected", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-blue-500"><path d="M12 8v4l3 3"></path><path d="M12 21a9 9 0 1 0-9-9"></path></svg>`, content: a }; }
    async function simultaneousLoginAgent(logs) { const a = await callSimulatedApi("simultaneous logins", logs); if (!a) return null; return { title: "Suspicious Simultaneous Logins", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-yellow-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`, content: a }; }
    async function unusualEndpointAgent(logs) { const a = await callSimulatedApi("Unusual Endpoint Usage", logs); if (!a) return null; return { title: "Unusual Endpoint Usage", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-purple-500"><polyline points="22 12 16 12 14 15 10 9 8 12 2 12"></polyline><path d="M5.45 5.45 2 2"></path><path d="m22 2-3.45 3.45"></path><path d="M12 22v-4"></path></svg>`, content: a }; }
    async function sessionExpirationAgent(logs) { const a = await callSimulatedApi("session expiration", logs); if (!a) return null; return { title: "Suspicious Re-Login Patterns", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-red-500"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`, content: a }; }

    // --- Rendering Functions ---
    function createUrlAnalysisCard({ url, threat_level, threat_type, summary }) {
        const threatColors = {
            "None": "text-green-600 dark:text-green-400", "Low": "text-yellow-600 dark:text-yellow-400", "Medium": "text-orange-600 dark:text-orange-400",
            "High": "text-red-600 dark:text-red-500", "Critical": "text-pink-600 dark:text-pink-500", "Indeterminate": "text-gray-600 dark:text-gray-400"
        };
        const threatColor = threatColors[threat_level] || "text-gray-600 dark:text-gray-400";

        return `
            <div class="result-item p-6">
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-blue-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg></div>
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold text-slate-800 dark:text-white mb-2">URL Analysis Report</h3>
                        <p class="text-slate-600 dark:text-slate-300 break-all"><strong class="text-slate-700 dark:text-slate-100">URL:</strong> ${url}</p>
                        <p class="text-slate-600 dark:text-slate-300"><strong class="text-slate-700 dark:text-slate-100">Threat Level:</strong> <span class="font-semibold ${threatColor}">${threat_level}</span></p>
                        <p class="text-slate-600 dark:text-slate-300"><strong class="text-slate-700 dark:text-slate-100">Threat Type:</strong> ${threat_type}</p>
                        <p class="text-slate-600 dark:text-slate-300 mt-2"><strong class="text-slate-700 dark:text-slate-100">Summary:</strong><br>${summary}</p>
                    </div>
                </div>
            </div>
        `;
    }
    function createFileAnalysisCard({ file_type, threat_level, summary }) {
        const threatColors = {
            "None": "text-green-600 dark:text-green-400", "Low": "text-yellow-600 dark:text-yellow-400", "Medium": "text-orange-600 dark:text-orange-400",
            "High": "text-red-600 dark:text-red-500", "Critical": "text-pink-600 dark:text-pink-500", "Indeterminate": "text-gray-600 dark:text-gray-400"
        };
        const threatColor = threatColors[threat_level] || "text-gray-600 dark:text-gray-400";

        return `
            <div class="result-item p-6">
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-blue-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg></div>
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold text-slate-800 dark:text-white mb-2">File Analysis Report</h3>
                        <p class="text-slate-600 dark:text-slate-300"><strong class="text-slate-700 dark:text-slate-100">File Type:</strong> ${file_type}</p>
                        <p class="text-slate-600 dark:text-slate-300"><strong class="text-slate-700 dark:text-slate-100">Threat Level:</strong> <span class="font-semibold ${threatColor}">${threat_level}</span></p>
                        <p class="text-slate-600 dark:text-slate-300 mt-2"><strong class="text-slate-700 dark:text-slate-100">Summary:</strong><br>${summary}</p>
                    </div>
                </div>
            </div>
        `;
    }
    function createSummaryCard(summary) {
        return `<div class="result-item p-6"><div class="flex items-start space-x-4"><div class="flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-blue-500"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div><div class="flex-1"><h3 class="text-xl font-semibold text-slate-800 dark:text-white mb-2">Executive Summary</h3><p class="text-slate-600 dark:text-slate-300 leading-relaxed">${summary}</p></div></div></div>`;
    }
    function createResultCard({ title, icon, content }) {
        const item = document.createElement('div');
        item.className = 'result-item p-6';
        const sanitizedContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const formattedContent = sanitizedContent.replace(/\n/g, '<br>');
        item.innerHTML = `<div class="flex items-start space-x-4"><div class="flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-full">${icon}</div><div class="flex-1"><h3 class="text-xl font-semibold text-slate-800 dark:text-white mb-2">${title}</h3><p class="text-slate-600 dark:text-slate-300 leading-relaxed">${formattedContent}</p></div></div>`;
        return item;
    }
    function renderThreatIntel(ips) {
        const container = document.getElementById('threat-intel');
        let tableHtml = `<div class="overflow-x-auto bg-white dark:bg-slate-800/50 rounded-lg shadow"><table class="w-full text-left"><thead class="border-b border-slate-200 dark:border-slate-700"><tr class="text-sm text-slate-500 dark:text-slate-400"><th class="p-4 font-semibold">IP Address</th><th class="p-4 font-semibold">Reputation</th><th class="p-4 font-semibold">Status</th></tr></thead><tbody class="text-slate-600 dark:text-slate-300">`;
        ips.forEach(ip => {
            const isThreat = SIMULATED_THREAT_IPS.includes(ip);
            tableHtml += `<tr class="border-b border-slate-200 dark:border-slate-700"><td class="p-4 font-mono">${ip}</td><td class="p-4"><span class="font-semibold ${isThreat ? 'text-red-500' : 'text-green-500'}">${isThreat ? 'Known Malicious' : 'Nominal'}</span></td><td class="p-4"><span class="px-3 py-1 text-xs font-medium rounded-full ${isThreat ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'}">${isThreat ? 'Threat Detected' : 'OK'}</span></td></tr>`;
        });
        tableHtml += `</tbody></table></div>`;
        container.innerHTML = tableHtml;
    }
    function renderAttackChain(steps) {
        const container = document.getElementById('attack-chain');
        const chainContainer = document.createElement('div');
        chainContainer.className = 'attack-chain';
        steps.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'attack-step';
            stepEl.style.animationDelay = `${index * 200}ms`;
            stepEl.innerHTML = `<div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-blue-500"><path d="m18 6 4 4-4 4"></path><path d="m6 18-4-4 4-4"></path><path d="M14.5 4h-5L6 20h5l3.5-16z"></path></svg></div><div class="text">${step}</div>`;
            chainContainer.appendChild(stepEl);
            if (index < steps.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'chain-connector';
                connector.style.animationDelay = `${(index * 200) + 100}ms`;
                chainContainer.appendChild(connector);
            }
        });
        container.innerHTML = '';
        container.appendChild(chainContainer);
    }
});
