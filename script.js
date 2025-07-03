document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const splashScreen = document.getElementById('splash-screen');
    const mainApp = document.getElementById('main-app');
    const enterBtn = document.getElementById('enter-btn');
    
    const fileDropArea = document.getElementById('file-drop-area');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const logTextInput = document.getElementById('log-input');

    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsSection = document.getElementById('results-section');
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const resultsContainer = document.getElementById('results-container');
    
    const themeToggle = document.getElementById('theme-toggle');
    
    let currentFileContent = '';
    let currentFileArrayBuffer = null;
    let currentFileName = '';
    let activeTab = 'file'; // Set default active tab

    // --- Icon Setup ---
    const L = {};
    window.onload = () => {
        const root = ReactDOM.createRoot(document.getElementById('lucide-icons-container'));
        const icons = React.createElement(React.Fragment, null,
          Object.keys(lucide).map(iconName =>
            React.createElement(lucide[iconName], { key: iconName, id: `lucide-${iconName.toLowerCase()}` })
          )
        );
        root.render(icons);

        Object.keys(lucide).forEach(iconName => {
            L[iconName] = () => {
                const iconElement = document.getElementById(`lucide-${iconName.toLowerCase()}`);
                return iconElement ? iconElement.outerHTML : '';
            }
        });

        populateIcons();
    };

    function populateIcons() {
        if (!L.ShieldCheck) return; 
        document.getElementById('header-logo').innerHTML = L.ShieldCheck();
        document.getElementById('sun-icon').innerHTML = L.Sun();
        document.getElementById('moon-icon').innerHTML = L.Moon();
        document.getElementById('splash-logo').innerHTML = L.ShieldCheck({size: 64});
        document.getElementById('privacy-header').innerHTML = `${L.Lock({class:'w-5 h-5 mr-2'})} Privacy & Data Handling`;
        document.querySelector('.icon-file').innerHTML = L.File();
        document.querySelector('.icon-file-text').innerHTML = L.FileText();
        document.querySelector('.icon-link').innerHTML = L.Link();
        document.querySelector('.icon-code').innerHTML = L.Code();
        document.querySelector('.icon-scan-line').innerHTML = L.ScanLine();
        document.querySelector('.icon-upload-cloud').innerHTML = L.UploadCloud();
    }

    // --- App Initialization ---
    enterBtn.addEventListener('click', () => {
        splashScreen.classList.add('hidden');
        mainApp.style.display = 'block';
        setTimeout(() => mainApp.classList.add('visible'), 50);
    });

    // --- Theme Switcher ---
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            themeToggle.checked = true;
        } else {
            document.documentElement.classList.remove('dark');
            themeToggle.checked = false;
        }
    };
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    themeToggle.addEventListener('change', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
    
    // --- Tab Navigation ---
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            activeTab = tab.dataset.tab;
            tabs.forEach(t => {
                t.classList.remove('border-primary', 'text-primary');
                t.classList.add('border-transparent', 'text-muted-foreground');
            });
            tab.classList.add('border-primary', 'text-primary');
            tab.classList.remove('border-transparent', 'text-muted-foreground');
            panels.forEach(panel => {
                panel.id === `${activeTab}-panel` ? panel.classList.remove('hidden') : panel.classList.add('hidden');
            });
        });
    });

    // --- File Handling & Drag and Drop ---
    fileDropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFileSelect(fileInput.files));
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => fileDropArea.addEventListener(eventName, preventDefaults, false));
    ['dragenter', 'dragover'].forEach(eventName => fileDropArea.addEventListener(eventName, () => fileDropArea.classList.add('highlight'), false));
    ['dragleave', 'drop'].forEach(eventName => fileDropArea.addEventListener(eventName, () => fileDropArea.classList.remove('highlight'), false));
    fileDropArea.addEventListener('drop', (e) => handleFileSelect(e.dataTransfer.files), false);
    
    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    async function handleFileSelect(files) {
        if (!files || files.length === 0) return;
        const file = files[0];
        currentFileName = file.name;
        fileNameDisplay.textContent = `File selected: ${currentFileName}`;
        
        const textPromise = readFileAsText(file);
        const bufferPromise = readFileAsArrayBuffer(file);
        
        [currentFileContent, currentFileArrayBuffer] = await Promise.all([textPromise, bufferPromise]);
    }

    // --- Analysis Logic ---
    analyzeBtn.addEventListener('click', async () => {
        resultsSection.classList.remove('hidden');
        loader.style.display = 'flex';
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        
        const agent = new ThreatAnalysisAgent();
        let analysisPromise;

        try {
            switch(activeTab) {
                case 'log':
                    const logInput = logTextInput.value;
                    if (!logInput.trim()) throw new Error("Log input is empty.");
                    analysisPromise = agent.analyzeLog(logInput);
                    break;
                case 'snippet':
                    const snippetInput = document.getElementById('snippet-input').value;
                    if (!snippetInput.trim()) throw new Error("Snippet is empty.");
                    analysisPromise = agent.analyzeFile(snippetInput, 'snippet.txt', new TextEncoder().encode(snippetInput).buffer);
                    break;
                default: // 'file'
                    if (!currentFileContent) throw new Error("Please select a file to analyze.");
                    analysisPromise = agent.analyzeFile(currentFileContent, currentFileName, currentFileArrayBuffer);
            }

            const results = await analysisPromise;
            displayResults(results);

        } catch (error) {
            console.error("Analysis failed:", error);
            resultsContainer.innerHTML = `<p class="text-destructive text-center">${error.message}</p>`;
        } finally {
            loader.style.display = 'none';
            resultsContainer.classList.remove('hidden');
        }
    });

    function readFileAsText(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = event => resolve(event.target.result); reader.onerror = error => reject(error); reader.readAsText(file); }); }
    function readFileAsArrayBuffer(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = event => resolve(event.target.result); reader.onerror = error => reject(error); reader.readAsArrayBuffer(file); }); }

    // --- Display Logic ---
    function displayResults(results) {
        if (!results) return;
        
        if (results.fileAnalysis) {
            resultsContainer.innerHTML = createFileAnalysisCard(results.fileAnalysis);
            return;
        }

        resultsContainer.innerHTML = `
            <div id="summary-container" class="mb-8"></div>
            <div class="results-tabs flex justify-center space-x-4 md:space-x-8 mb-6 border-b border-custom">
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
    
    function createSummaryCard(summary) { const item = document.createElement('div'); item.className = 'p-6 rounded-lg bg-card border border-custom'; item.innerHTML = `<div class="flex items-start space-x-4"><div class="flex-shrink-0 p-2 bg-muted rounded-full">${L.BookOpen()}</div><div class="flex-1"><h3 class="text-xl font-semibold mb-2">Executive Summary</h3><p class="text-muted-foreground leading-relaxed">${summary}</p></div></div>`; return item.outerHTML; }
    function createAnomalyCard({ title, content }) { const item = document.createElement('div'); item.className = 'p-4 rounded-lg border border-custom bg-card mb-4'; item.innerHTML = `<h5 class="font-semibold">${title}</h5><p class="text-sm text-muted-foreground mt-1">${content}</p>`; return item; }
    function createFileAnalysisCard({ file_type, threat_level, summary }) { return `<div class="p-6 rounded-lg bg-card border border-custom"><h3 class="text-xl font-semibold mb-2">File Analysis Report</h3><p><strong>File Type:</strong> ${file_type}</p><p><strong>Threat Level:</strong> ${threat_level}</p><p class="mt-2"><strong>Summary:</strong><br>${summary}</p></div>`; }
    function renderThreatIntel(ips) { const container = document.getElementById('threat-intel'); let tableHtml = `<div class="overflow-x-auto bg-card rounded-lg shadow border border-custom"><table class="w-full text-left"><thead><tr class="text-sm text-muted-foreground"><th class="p-4 font-semibold">IP Address</th><th class="p-4 font-semibold">Reputation</th></tr></thead><tbody>`; const threatIPs = ['192.168.0.101', '192.168.0.41']; ips.forEach(ip => { const isThreat = threatIPs.includes(ip); tableHtml += `<tr><td class="p-4 font-mono">${ip}</td><td class="p-4 font-semibold ${isThreat ? 'text-destructive' : 'text-green-500'}">${isThreat ? 'Known Malicious' : 'Nominal'}</td></tr>`; }); tableHtml += `</tbody></table></div>`; container.innerHTML = tableHtml; }
    function renderAttackChain(steps) { const container = document.getElementById('attack-chain'); const chainContainer = document.createElement('div'); chainContainer.className = 'attack-chain'; steps.forEach((step, index) => { const stepEl = document.createElement('div'); stepEl.className = 'attack-step'; stepEl.style.animationDelay = `${index * 200}ms`; stepEl.innerHTML = `<div class="icon">${L.GitCommit()}</div><div class="text">${step}</div>`; chainContainer.appendChild(stepEl); if (index < steps.length - 1) { const connector = document.createElement('div'); connector.className = 'chain-connector'; connector.style.animationDelay = `${(index * 200) + 100}ms`; chainContainer.appendChild(connector); } }); container.innerHTML = ''; container.appendChild(chainContainer); }

    // --- THREAT ANALYSIS AGENT (HYBRID V5 - Merging original logic) ---
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
            if (prompt.includes("Executive Summary")) return "An automated data exfiltration attack was identified, originating from multiple suspicious IP addresses. The attacker utilized a script to make repetitive, hourly API calls to wildcard endpoints to scrape machine status data. The activity persisted across multiple sessions, indicating a determined effort to exfiltrate data over time.";
            if (prompt.includes("attack chain")) return JSON.parse('["Initial suspicious login from USER_C at 2021-06-25T16:14:54.000Z.","Simultaneous login from a near-identical account (USER_B) from a different IP.","Automated script initiated hourly API calls to `factory=*` endpoints.","Session expired, causing a series of \'401 Unauthorized\' errors.","Attacker re-authenticated on 2021-06-26T16:04:54.000Z and resumed the automated requests."]');
            if (prompt.includes("automated behavior") && content.includes("api/factory/machine/status?factory=*")) return { title: "Automated Behavior Detected", content: "Repetitive requests to wildcard endpoints suggest a script, not manual user activity." };
            if (prompt.includes("simultaneous logins") && content.includes("2021-06-25T16:14:54.000Z")) return { title: "Suspicious Simultaneous Logins", content: "Two near-identical user IDs logged in from different IPs at the same time." };
            return null;
        }

        async analyzeLog(logContent) {
            const anonymizedLogs = this._anonymizeLogContent(logContent);
            const uniqueIPs = [...new Set(logContent.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g) || [])];

            const [summary, anomalies, attackChain] = await Promise.all([
                this._callSimulatedApi("Executive Summary", anonymizedLogs),
                Promise.all([
                    this._callSimulatedApi("automated behavior", anonymizedLogs),
                    this._callSimulatedApi("simultaneous logins", anonymizedLogs)
                ]),
                this._callSimulatedApi("attack chain", anonymizedLogs)
            ]);
            
            return {
                summary,
                anomalies: anomalies.filter(a => a),
                attackChain,
                threatIntel: uniqueIPs
            };
        }
        
        analyzeFile(content, filename, arrayBuffer) {
            const extension = filename.split('.').pop().toLowerCase();
            if (['ps1', 'py', 'sh', 'json'].includes(extension)) {
                let summary = 'Basic script analysis complete. No high-risk patterns found.';
                let threat_level = 'Low';
                if (content.includes("Invoke-Expression")) {
                    summary = "Detected use of Invoke-Expression, which can execute arbitrary code.";
                    threat_level = "High";
                }
                return { fileAnalysis: { file_type: `${extension.toUpperCase()} Script`, threat_level, summary } };
            }
            const entropy = this._calculateEntropy(new Uint8Array(arrayBuffer));
            let summary = `Universal analysis complete. File entropy is ${entropy.toFixed(2)}/8.0.`;
            let threat_level = "Low";
            if (entropy > 7.5) {
                summary += " High entropy suggests the file may be packed or encrypted.";
                threat_level = "High";
            }
            return { fileAnalysis: { file_type: 'Binary/Unknown', threat_level, summary } };
        }
        
        _calculateEntropy(data) {
            const byteCounts = new Array(256).fill(0);
            for (let i = 0; i < data.length; i++) { byteCounts[data[i]]++; }
            let entropy = 0;
            const len = data.length;
            for (let i = 0; i < 256; i++) {
                if (byteCounts[i] === 0) continue;
                const p = byteCounts[i] / len;
                entropy -= p * (Math.log(p) / Math.log(2));
            }
            return entropy;
        }
    }
});
