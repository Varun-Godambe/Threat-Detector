document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const splashScreen = document.getElementById('splash-screen');
    const mainApp = document.getElementById('main-app');
    const enterBtn = document.getElementById('enter-btn');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('fileName');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analysisSection = document.getElementById('analysis-section');
    const loader = document.getElementById('loader');
    const resultsContainer = document.getElementById('results-container');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    let currentFileContent = '';
    let currentFileArrayBuffer = null;
    let currentFileName = '';

    // --- Theme Management ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark');
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            document.body.classList.remove('dark');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    };

    const toggleTheme = () => {
        const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    
    // --- Event Listeners ---
    enterBtn.addEventListener('click', () => {
        splashScreen.classList.add('hidden');
        mainApp.style.display = 'block';
        setTimeout(() => mainApp.classList.add('visible'), 50);
        if (!localStorage.getItem('theme')) {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(prefersDark ? 'dark' : 'light');
        }
    });

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFileSelect(fileInput.files));
    analyzeBtn.addEventListener('click', startAnalysis);
    themeToggle.addEventListener('click', toggleTheme);

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-slate-50', 'dark:bg-slate-700/50'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('border-blue-500', 'bg-slate-50', 'dark:bg-slate-700/50'); });
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('border-blue-500', 'bg-slate-50', 'dark:bg-slate-700/50'); handleFileSelect(e.dataTransfer.files); });

    async function handleFileSelect(files) {
        if (!files || files.length === 0) return;
        const file = files[0];
        currentFileName = file.name;
        fileNameDisplay.textContent = `File selected: ${currentFileName}`;
        
        const textPromise = readFileAsText(file);
        const bufferPromise = readFileAsArrayBuffer(file);
        
        try {
            [currentFileContent, currentFileArrayBuffer] = await Promise.all([textPromise, bufferPromise]);
            analyzeBtn.disabled = false;
        } catch (error) {
            console.error("Error reading file:", error);
            fileNameDisplay.textContent = "Error reading file.";
            analyzeBtn.disabled = true;
        }
    }
    
    function readFileAsText(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = event => resolve(event.target.result); reader.onerror = error => reject(error); reader.readAsText(file); }); }
    function readFileAsArrayBuffer(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = event => resolve(event.target.result); reader.onerror = error => reject(error); reader.readAsArrayBuffer(file); }); }

    // --- Analysis Orchestration ---
    async function startAnalysis() {
        if (!currentFileContent && !currentFileName) {
            alert("Please select a file to analyze.");
            return;
        }
        analysisSection.style.display = 'block';
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        loader.style.display = 'flex';
        analyzeBtn.disabled = true;

        const agent = new ThreatAnalysisAgent();
        let results;

        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); 

            if (currentFileName.endsWith('.log') || currentFileName.endsWith('.txt')) {
                results = await agent.analyzeLog(currentFileContent);
                displayLogResults(results);
            } else {
                results = agent.analyzeFile(currentFileContent, currentFileArrayBuffer);
                displayFileResults(results);
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            resultsContainer.innerHTML = `<p class="text-center text-red-500">Analysis failed: ${error.message}</p>`;
        } finally {
            loader.style.display = 'none';
            resultsContainer.classList.remove('hidden');
            analyzeBtn.disabled = false;
        }
    }

    // --- Display Functions ---
    function displayFileResults(results) {
        resultsContainer.innerHTML = createFileAnalysisCard(results);
    }
    
    function displayLogResults(results) {
        resultsContainer.innerHTML = `
            <div id="summary-container" class="mb-8"></div>
            <div class="results-tabs flex justify-center space-x-4 md:space-x-8 mb-6 border-b border-slate-200 dark:border-slate-700">
                <button data-tab="anomalies" class="tab-btn-results">Anomaly Report</button>
                <button data-tab="threat-intel" class="tab-btn-results">Threat Intelligence</button>
                <button data-tab="attack-chain" class="tab-btn-results">Attack Chain</button>
            </div>
            <div id="anomalies" class="tab-content results-list"></div>
            <div id="threat-intel" class="tab-content"></div>
            <div id="attack-chain" class="tab-content"></div>
        `;
        
        document.querySelector('.results-tabs').addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            document.querySelectorAll('.tab-btn-results').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(e.target.dataset.tab).classList.add('active');
        });

        if(results.summary) document.getElementById('summary-container').innerHTML = createSummaryCard(results.summary);
        
        const anomaliesContent = document.getElementById('anomalies');
        results.anomalies.filter(r => r).forEach((result, index) => {
            const card = createAnomalyCard(result);
            card.style.animationDelay = `${index * 150}ms`;
            anomaliesContent.appendChild(card);
        });

        renderThreatIntel(results.threatIntel);
        renderAttackChain(results.attackChain);
        
        document.querySelector('.results-tabs button').click();
    }

    function createFileAnalysisCard({ file_type, threat_level, summary, details }) {
        const threatColors = { "None": "text-green-500", "Low": "text-yellow-500", "Medium": "text-orange-500", "High": "text-red-500", "Critical": "text-pink-500" };
        const threatColor = threatColors[threat_level] || "text-gray-500";
        let detailsHtml = details.map(d => `<li class="mt-2"><strong class="font-semibold">${d.title}:</strong> ${d.description}</li>`).join('');

        return `
            <div class="result-item p-6">
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-blue-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold text-slate-800 dark:text-white mb-2">File Analysis Report</h3>
                        <p><strong class="text-slate-700 dark:text-slate-100">File Type:</strong> ${file_type}</p>
                        <p><strong class="text-slate-700 dark:text-slate-100">Overall Threat Level:</strong> <span class="font-semibold ${threatColor}">${threat_level}</span></p>
                        <p class="mt-2"><strong class="text-slate-700 dark:text-slate-100">Summary:</strong> ${summary}</p>
                        ${detailsHtml ? `<ul class="mt-4 list-disc list-inside text-sm text-slate-600 dark:text-slate-300">${detailsHtml}</ul>` : ''}
                    </div>
                </div>
            </div>`;
    }
    function createSummaryCard(summary) { return `<div class="result-item p-6"><div class="flex items-start space-x-4"><div class="flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-blue-500"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div><div class="flex-1"><h3 class="text-xl font-semibold text-slate-800 dark:text-white mb-2">Executive Summary</h3><p class="text-slate-600 dark:text-slate-300 leading-relaxed">${summary}</p></div></div></div>`; }
    function createAnomalyCard({ title, icon, content }) { const item = document.createElement('div'); item.className = 'result-item p-6'; item.innerHTML = `<div class="flex items-start space-x-4"><div class="flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-full">${icon}</div><div class="flex-1"><h3 class="text-xl font-semibold text-slate-800 dark:text-white mb-2">${title}</h3><p class="text-slate-600 dark:text-slate-300 leading-relaxed">${content.replace(/\n/g, '<br>')}</p></div></div>`; return item; }
    function renderThreatIntel(ips) { const container = document.getElementById('threat-intel'); let tableHtml = `<div class="overflow-x-auto bg-white dark:bg-slate-800/50 rounded-lg shadow"><table class="w-full text-left"><thead class="border-b border-slate-200 dark:border-slate-700"><tr class="text-sm text-slate-500 dark:text-slate-400"><th class="p-4 font-semibold">IP Address</th><th class="p-4 font-semibold">Reputation</th><th class="p-4 font-semibold">Status</th></tr></thead><tbody class="text-slate-600 dark:text-slate-300">`; const threatIPs = ['192.168.0.101', '192.168.0.41']; ips.forEach(ip => { const isThreat = threatIPs.includes(ip); tableHtml += `<tr class="border-b border-slate-200 dark:border-slate-700"><td class="p-4 font-mono">${ip}</td><td class="p-4"><span class="font-semibold ${isThreat ? 'text-red-500' : 'text-green-500'}">${isThreat ? 'Known Malicious' : 'Nominal'}</span></td><td class="p-4"><span class="px-3 py-1 text-xs font-medium rounded-full ${isThreat ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'}">${isThreat ? 'Threat Detected' : 'OK'}</span></td></tr>`; }); tableHtml += `</tbody></table></div>`; container.innerHTML = tableHtml; }
    function renderAttackChain(steps) { const container = document.getElementById('attack-chain'); const chainContainer = document.createElement('div'); chainContainer.className = 'attack-chain'; steps.forEach((step, index) => { const stepEl = document.createElement('div'); stepEl.className = 'attack-step'; stepEl.style.animationDelay = `${index * 200}ms`; stepEl.innerHTML = `<div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-blue-500"><path d="m18 6 4 4-4 4"></path><path d="m6 18-4-4 4-4"></path><path d="M14.5 4h-5L6 20h5l3.5-16z"></path></svg></div><div class="text">${step}</div>`; chainContainer.appendChild(stepEl); if (index < steps.length - 1) { const connector = document.createElement('div'); connector.className = 'chain-connector'; connector.style.animationDelay = `${(index * 200) + 100}ms`; chainContainer.appendChild(connector); } }); container.innerHTML = ''; container.appendChild(chainContainer); }

    // --- THREAT ANALYSIS AGENT ---
    class ThreatAnalysisAgent {
        _anonymizeLogContent(content) {
            let anonymizedContent = content;
            const ipMap = new Map(); let ipCounter = 1;
            const userMap = new Map(); let userCounter = 1;
            anonymizedContent = anonymizedContent.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g, (ip) => {
                if (!ipMap.has(ip)) ipMap.set(ip, `IP_ADDRESS_${ipCounter++}`);
                return ipMap.get(ip);
            });
            anonymizedContent = anonymizedContent.replace(/"authorizedUserId":\s*"([^"]+)"/g, (match, userId) => {
                if (!userMap.has(userId)) userMap.set(userId, `USER_${String.fromCharCode(64 + userCounter++)}`);
                return `"authorizedUserId": "${userMap.get(userId)}"`;
            });
            return anonymizedContent;
        }

        async _callSimulatedApi(prompt, content) {
            await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
            if (prompt.includes("Executive Summary")) return "An automated data exfiltration attack was identified, originating from multiple suspicious IP addresses. The attacker utilized a script to make repetitive, hourly API calls to wildcard endpoints to scrape machine status data.";
            if (prompt.includes("attack chain")) return JSON.parse('["Initial suspicious login from USER_C.","Simultaneous login from a near-identical account (USER_B).","Automated script initiated hourly API calls to `factory=*` endpoints.","Attacker re-authenticated and resumed the automated requests."]');
            if (prompt.includes("automated behavior") && content.includes("api/factory/machine/status?factory=*")) return { title: "Automated Behavior Detected", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-blue-500"><path d="M12 8v4l3 3"></path><path d="M12 21a9 9 0 1 0-9-9"></path></svg>`, content: "Repetitive requests to wildcard endpoints suggest a script." };
            if (prompt.includes("simultaneous logins") && content.includes("2021-06-25T16:14:54.000Z")) return { title: "Suspicious Simultaneous Logins", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-yellow-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`, content: "Two near-identical user IDs logged in from different IPs at the same time." };
            return null;
        }

        async analyzeLog(logContent) {
            const anonymizedLogs = this._anonymizeLogContent(logContent);
            const uniqueIPs = [...new Set(logContent.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g) || [])];
            const [summary, anomalies, attackChain] = await Promise.all([
                this._callSimulatedApi("Executive Summary", anonymizedLogs),
                Promise.all([ this._callSimulatedApi("automated behavior", anonymizedLogs), this._callSimulatedApi("simultaneous logins", anonymizedLogs) ]),
                this._callSimulatedApi("attack chain", anonymizedLogs)
            ]);
            return { summary, anomalies: anomalies.filter(a => a), attackChain, threatIntel: uniqueIPs };
        }
        
        analyzeFile(content, arrayBuffer) {
            let details = [];
            let threat_level = 'None';
            const view = new Uint8Array(arrayBuffer);

            const signatures = { '4D 5A': 'Windows Executable (MZ)', '7F 45 4C 46': 'Linux Executable (ELF)' };
            const fileSignature = Array.from(view.slice(0, 4)).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
            for (const [sig, type] of Object.entries(signatures)) {
                if (fileSignature.startsWith(sig)) {
                    details.push({ title: 'Disguised Executable', description: `File has the signature of a ${type} but a non-standard extension.` });
                    threat_level = 'High';
                }
            }
            
            const entropy = this._calculateEntropy(view);
            if (entropy > 7.5) {
                details.push({ title: 'High Entropy', description: `Score of ${entropy.toFixed(2)}/8.0 suggests file is packed or encrypted.` });
                threat_level = threat_level === 'High' ? 'Critical' : 'High';
            }

            if (content.includes("Invoke-Expression")) {
                details.push({ title: 'PowerShell Risk', description: 'Contains `Invoke-Expression`, which allows arbitrary code execution.' });
                threat_level = 'High';
            }
            if (content.includes("rm -rf")) {
                details.push({ title: 'Destructive Command', description: 'Contains `rm -rf`, which can delete files recursively.' });
                threat_level = 'Critical';
            }

            let summary = details.length > 0 ? 'Potential threats detected. Review details below.' : 'No significant threats found based on current rules.';
            return { fileAnalysis: { file_type: 'Universal Analysis', threat_level, summary, details } };
        }
        
        _calculateEntropy(data) {
            const byteCounts = new Array(256).fill(0);
            for (let i = 0; i < data.length; i++) { byteCounts[data[i]]++; }
            let entropy = 0;
            const len = data.length;
            if (len === 0) return 0;
            for (let i = 0; i < 256; i++) {
                if (byteCounts[i] === 0) continue;
                const p = byteCounts[i] / len;
                entropy -= p * (Math.log(p) / Math.log(2));
            }
            return entropy;
        }
    }
});
