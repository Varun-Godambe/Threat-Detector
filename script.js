document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
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
        const htmlEl = document.documentElement;
        if (theme === 'dark') {
            htmlEl.classList.add('dark');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            htmlEl.classList.remove('dark');
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    };
    const toggleTheme = () => {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    };
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);
    themeToggle.addEventListener('click', toggleTheme);
    
    // --- File Handling ---
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
            analyzeBtn.disabled = false;
        } catch (error) {
            fileNameDisplay.textContent = "Error reading file.";
            analyzeBtn.disabled = true;
        }
    }
    
    function readFileAsText(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = event => resolve(event.target.result); reader.onerror = error => reject(error); reader.readAsText(file); }); }
    function readFileAsArrayBuffer(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = event => resolve(event.target.result); reader.onerror = error => reject(error); reader.readAsArrayBuffer(file); }); }

    // --- Analysis Orchestration ---
    analyzeBtn.addEventListener('click', async () => {
        if (!currentFileContent) { alert("Please select a file."); return; }
        analysisSection.classList.remove('hidden');
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
            resultsContainer.innerHTML = `<p class="text-center text-destructive">${error.message}</p>`;
        } finally {
            loader.style.display = 'none';
            resultsContainer.classList.remove('hidden');
            resultsContainer.classList.add('results-fade-in');
            analyzeBtn.disabled = false;
        }
    });

    // --- Display Functions ---
    function displayFileResults(results) {
        resultsContainer.innerHTML = createFileAnalysisCard(results);
    }
    
    function displayLogResults(results) {
        resultsContainer.innerHTML = `
            <div id="summary-container" class="mb-6"></div>
            <div class="mb-4 border-b border-border">
                <nav class="results-tabs -mb-px flex space-x-8" aria-label="Tabs">
                    <button data-tab="anomalies" class="tab-btn-results whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">Anomaly Report</button>
                    <button data-tab="threat-intel" class="tab-btn-results whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">Threat Intelligence</button>
                    <button data-tab="attack-chain" class="tab-btn-results whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">Attack Chain</button>
                </nav>
            </div>
            <div id="anomalies" class="tab-content"></div>
            <div id="threat-intel" class="tab-content"></div>
            <div id="attack-chain" class="tab-content"></div>
        `;
        
        document.querySelector('.results-tabs').addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            document.querySelectorAll('.tab-btn-results').forEach(btn => btn.classList.remove('border-primary', 'text-primary'));
            e.target.classList.add('border-primary', 'text-primary');
            document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
            document.getElementById(e.target.dataset.tab).style.display = 'block';
        });

        if(results.summary) document.getElementById('summary-container').innerHTML = createSummaryCard(results.summary);
        
        const anomaliesContent = document.getElementById('anomalies');
        results.anomalies.filter(r => r).forEach(result => anomaliesContent.appendChild(createAnomalyCard(result)));

        renderThreatIntel(results.threatIntel);
        renderAttackChain(results.attackChain);
        
        document.querySelector('.results-tabs button').click();
    }

    function createFileAnalysisCard({ file_type, threat_level, summary, details }) {
        const threatColors = { "None": "text-green-500", "Low": "text-yellow-500", "Medium": "text-orange-500", "High": "text-red-500", "Critical": "text-pink-500" };
        const threatColor = threatColors[threat_level] || "text-gray-500";
        let detailsHtml = details.map(d => `<li class="mt-2"><strong class="font-semibold text-foreground">${d.title}:</strong> <span class="text-muted-foreground">${d.description}</span></li>`).join('');

        return `<div class="p-6 rounded-lg bg-card border border-border"><h3 class="text-xl font-semibold mb-4">File Analysis Report</h3><div class="grid gap-2 text-sm"><p><strong class="w-24 inline-block">File Type:</strong> ${file_type}</p><p><strong class="w-24 inline-block">Threat Level:</strong> <span class="font-semibold ${threatColor}">${threat_level}</span></p></div><div class="mt-4 pt-4 border-t border-border"><h4 class="font-semibold">Summary</h4><p class="text-muted-foreground mt-1">${summary}</p></div>${detailsHtml ? `<div class="mt-4 pt-4 border-t border-border"><h4 class="font-semibold">Details</h4><ul class="mt-2 list-disc list-inside">${detailsHtml}</ul></div>` : ''}</div>`;
    }
    function createSummaryCard(summary) { return `<div class="p-6 rounded-lg bg-card border border-border"><h3 class="text-xl font-semibold mb-2">Key Findings</h3><p class="text-muted-foreground leading-relaxed">${summary}</p></div>`; }
    function createAnomalyCard({ title, icon, content }) { const item = document.createElement('div'); item.className = 'p-4 rounded-lg bg-card border border-border mb-4'; item.innerHTML = `<div class="flex items-start space-x-4"><div class="flex-shrink-0 text-primary">${icon}</div><div><h4 class="font-semibold">${title}</h4><p class="text-sm text-muted-foreground">${content.replace(/\n/g, '<br>')}</p></div></div>`; return item; }
    function renderThreatIntel(ips) { const container = document.getElementById('threat-intel'); let tableHtml = `<div class="overflow-x-auto rounded-lg border border-border"><table class="w-full text-left text-sm"><thead class="bg-muted/50"><tr class="text-muted-foreground"><th class="p-4 font-medium">IP Address</th><th class="p-4 font-medium">Reputation</th><th class="p-4 font-medium">Status</th></tr></thead><tbody class="divide-y divide-border">`; const threatIPs = ['192.168.0.101', '192.168.0.41']; ips.forEach(ip => { const isThreat = threatIPs.includes(ip); tableHtml += `<tr><td class="p-4 font-mono">${ip}</td><td class="p-4 font-semibold ${isThreat ? 'text-destructive' : 'text-green-500'}">${isThreat ? 'Known Malicious' : 'Nominal'}</td><td class="p-4"><span class="px-2 py-1 text-xs font-medium rounded-full ${isThreat ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}">${isThreat ? 'Threat' : 'OK'}</span></td></tr>`; }); tableHtml += `</tbody></table></div>`; container.innerHTML = tableHtml; }
    function renderAttackChain(steps) { const container = document.getElementById('attack-chain'); let html = '<div class="relative pl-6">'; steps.forEach((step, index) => { html += `<div class="relative flex items-start pb-8"><div class="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">${index + 1}</div><p class="ml-10 text-sm">${step}</p>${index < steps.length - 1 ? '<div class="absolute bottom-0 left-3 top-6 w-px bg-border"></div>' : ''}</div>`; }); html += '</div>'; container.innerHTML = html; }

    // --- THREAT ANALYSIS AGENT ---
    class ThreatAnalysisAgent {
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
            return { file_type: 'Universal Analysis', threat_level, summary, details };
        }
        
        _calculateEntropy(data) { const byteCounts = new Array(256).fill(0); for (let i = 0; i < data.length; i++) { byteCounts[data[i]]++; } let entropy = 0; const len = data.length; if (len === 0) return 0; for (let i = 0; i < 256; i++) { if (byteCounts[i] === 0) continue; const p = byteCounts[i] / len; entropy -= p * (Math.log(p) / Math.log(2)); } return entropy; }
        _anonymizeLogContent(content) { let a = content; const i = new Map(), u = new Map(); let c = 1, d = 1; a = a.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g, (p) => { if (!i.has(p)) i.set(p, `IP_${c++}`); return i.get(p); }); a = a.replace(/"authorizedUserId":\s*"([^"]+)"/g, (m, p) => { if (!u.has(p)) u.set(p, `USER_${String.fromCharCode(64+d++)}`); return `"authorizedUserId": "${u.get(p)}"`; }); return a; }
        async _callSimulatedApi(prompt, content) { await new Promise(r => setTimeout(r, 200 + Math.random() * 300)); if (prompt.includes("Executive Summary")) return "An automated data exfiltration attack was identified, originating from multiple suspicious IP addresses. The attacker utilized a script to make repetitive, hourly API calls to wildcard endpoints to scrape machine status data."; if (prompt.includes("attack chain")) return JSON.parse('["Initial suspicious login from USER_C.","Simultaneous login from a near-identical account (USER_B).","Automated script initiated hourly API calls to `factory=*` endpoints.","Attacker re-authenticated and resumed the automated requests."]'); if (prompt.includes("automated behavior") && content.includes("api/factory/machine/status?factory=*")) return { title: "Automated Behavior Detected", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-blue-500"><path d="M12 8v4l3 3"></path><path d="M12 21a9 9 0 1 0-9-9"></path></svg>`, content: "Repetitive requests to wildcard endpoints suggest a script." }; if (prompt.includes("simultaneous logins") && content.includes("2021-06-25T16:14:54.000Z")) return { title: "Suspicious Simultaneous Logins", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-yellow-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`, content: "Two near-identical user IDs logged in from different IPs at the same time." }; return null; }
    }
});
