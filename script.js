document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    
    // Sidebar & Mobile Nav
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');

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

    let currentFile = null;
    
    // --- API KEYS & ENDPOINTS ---
    const VT_API_KEY = 'ade67983327c2d7b57f5fa9d097056b1b72915427156f0eb37922ab79b159a0b';
    const GEMINI_API_KEY = 'AIzaSyASISr1va_plNsir5hhuhBDZdwBDOX-0sw';

    const VT_BASE_URL = 'https://www.virustotal.com/api/v3';
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;


    // =================================================================================
    // --- INITIALIZATION ---
    // =================================================================================
    function initialize() {
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
        themeToggle.addEventListener('click', toggleTheme);

        openSidebarBtn.addEventListener('click', openSidebar);
        closeSidebarBtn.addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);

        tabFile.addEventListener('click', () => switchTab('file'));
        tabUrl.addEventListener('click', () => switchTab('url'));

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => handleFileSelect(fileInput.files));
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('highlight'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('highlight'));
        dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('highlight'); handleFileSelect(e.dataTransfer.files); });
        analyzeFileBtn.addEventListener('click', () => runAnalysis('file'));

        urlInput.addEventListener('input', () => {
            try { new URL(urlInput.value); analyzeUrlBtn.disabled = false; } catch (_) { analyzeUrlBtn.disabled = true; }
        });
        analyzeUrlBtn.addEventListener('click', () => runAnalysis('url'));
    }

    function applyTheme(theme) {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        sunIcon.classList.toggle('hidden', theme === 'dark');
        moonIcon.classList.toggle('hidden', theme !== 'dark');
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    }

    // =================================================================================
    // --- MOBILE NAVIGATION ---
    // =================================================================================
    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }

    // =================================================================================
    // --- UI & TAB MANAGEMENT ---
    // =================================================================================
    function switchTab(activeTab) {
        const isFileTab = activeTab === 'file';
        tabFile.classList.toggle('active-tab', isFileTab);
        tabFile.classList.toggle('inactive-tab', !isFileTab);
        paneFile.classList.toggle('hidden', !isFileTab);
        tabUrl.classList.toggle('active-tab', !isFileTab);
        tabUrl.classList.toggle('inactive-tab', isFileTab);
        paneUrl.classList.toggle('hidden', isFileTab);
        analysisSection.classList.add('hidden');
        resultsContainer.innerHTML = '';
    }

    function handleFileSelect(files) {
        if (!files || files.length === 0) return;
        currentFile = files[0];
        fileNameDisplay.textContent = `Selected: ${currentFile.name}`;
        analyzeFileBtn.disabled = false;
    }

    // =================================================================================
    // --- ANALYSIS ORCHESTRATION ---
    // =================================================================================
    async function runAnalysis(type) {
        analysisSection.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        resultsContainer.style.opacity = 0;
        loader.style.display = 'flex';
        
        try {
            if (type === 'file') {
                if (!currentFile) { throw new Error("Please select a file first."); }
                analyzeFileBtn.disabled = true;
                
                const textBasedExtensions = [
                    '.log', '.txt', '.conf', '.cfg', '.config', '.ini', 
                    '.json', '.yaml', '.yml', '.xml', '.sh', '.ps1', 
                    '.py', '.js', '.md'
                ];

                const isTextBased = textBasedExtensions.some(ext => currentFile.name.endsWith(ext));

                if (isTextBased) {
                    if (!GEMINI_API_KEY) {
                        throw new Error("Gemini API key is not set. Log/Config analysis is disabled.");
                    }
                    loaderText.textContent = 'Deploying AI Forensics Agent...';
                    const reportData = await runAiLogAnalysis(currentFile);
                    displayAiLogReport(reportData);
                } else {
                    loaderText.textContent = 'Uploading file to VirusTotal Analysis Grid...';
                    const analysisId = await uploadToVirusTotal(currentFile, 'file');
                    loaderText.textContent = 'Awaiting report from 70+ security vendors...';
                    const report = await pollForVirusTotalReport(analysisId);
                    displayVirusTotalFileReport(report);
                }

            } else { // type === 'url'
                const urlToScan = urlInput.value;
                if (!urlToScan) { throw new Error("Please enter a URL."); }
                analyzeUrlBtn.disabled = true;
                loaderText.textContent = 'Submitting URL to VirusTotal Analysis Grid...';
                const analysisId = await uploadToVirusTotal(urlToScan, 'url');
                loaderText.textContent = 'Awaiting report from security vendors...';
                const report = await pollForVirusTotalReport(analysisId);
                displayVirusTotalUrlReport(report);
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            let friendlyMessage = error.message;
            if (error.message.includes('403')) {
                friendlyMessage = "Access Denied (403). The provided API key may be invalid, expired, or lack permissions for this resource. Please verify your API key and permissions.";
            } else if (error.message.includes('Failed to fetch')) {
                 friendlyMessage = "Network error. Please check your internet connection and ensure ad-blockers are not interfering with API requests.";
            }
            resultsContainer.innerHTML = `<div class="p-6 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-center"><h3 class="font-semibold text-red-800 dark:text-red-200">Analysis Failed</h3><p class="mt-2 text-sm text-red-700 dark:text-red-300">${friendlyMessage}</p></div>`;
        } finally {
            loader.style.display = 'none';
            resultsContainer.classList.remove('hidden');
            resultsContainer.classList.add('results-fade-in');
            analyzeFileBtn.disabled = false;
            analyzeUrlBtn.disabled = false;
        }
    }

    // =================================================================================
    // --- API INTERACTIONS (FRONTEND-ONLY) ---
    // =================================================================================
    async function runAiLogAnalysis(file) {
        const fileContent = await file.text();
        const prompt = `
            You are a senior cybersecurity analyst. Your task is to analyze the following log data or configuration file and return your findings in a structured JSON format.

            **Instructions:**
            1.  Thoroughly review the provided text content for security issues, anomalies, or potential vulnerabilities. Look for things like repeated failed logins, unauthorized access attempts, hardcoded secrets, overly permissive rules, SQL injection patterns, repelled attacks, or other notable events.
            2.  Structure your response as a single JSON object. Do not include any text or markdown formatting before or after the JSON object.
            3.  The JSON object must have a key "analysisResult".
            4.  If the file is completely benign and contains no security issues OR notable events whatsoever, the value of "analysisResult" should be the string "No security issues or notable events found.".
            5.  If you find issues or notable events, the value of "analysisResult" should be an object with three keys: "summary", "findings", and "vulnerabilityReport".
                - "summary": A concise, one-paragraph executive summary of the overall security posture, including both active issues and notable informational events.
                - "findings": An array of objects. Each object represents a single issue or event and must have the keys: "title" (string), "severity" (string: "Critical", "High", "Medium", "Low", or "Informational"), and "details" (string, a detailed explanation of the finding).
                - "vulnerabilityReport": A string containing a clean, pre-formatted vulnerability report snippet suitable for copying into a professional document. This snippet should focus on actionable vulnerabilities and misconfigurations. If there are only informational findings, this can be a brief summary.

            **File Content to Analyze:**
            \`\`\`
            ${fileContent}
            \`\`\`
        `;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        };

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`AI analysis failed with status: ${response.status}`);
        }

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0) {
            // The response from the API is a JSON string, so we need to parse it.
            const jsonString = result.candidates[0].content.parts[0].text;
            return JSON.parse(jsonString);
        } else {
            if (result.promptFeedback && result.promptFeedback.blockReason) {
                 throw new Error(`AI analysis blocked. Reason: ${result.promptFeedback.blockReason}`);
            }
            throw new Error("AI analysis returned no valid response.");
        }
    }

    async function uploadToVirusTotal(data, type) {
        let endpoint, options;
        if (type === 'file') {
            const formData = new FormData();
            formData.append('file', data);
            endpoint = `${VT_BASE_URL}/files`;
            options = { method: 'POST', headers: { 'x-apikey': VT_API_KEY }, body: formData };
        } else { // url
            const formData = new URLSearchParams();
            formData.append('url', data);
            endpoint = `${VT_BASE_URL}/urls`;
            options = { method: 'POST', headers: { 'x-apikey': VT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData };
        }
        
        const response = await fetch(endpoint, options);
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error?.message || `${type} submission failed.`);
        return responseData.data.id;
    }

    async function getVirusTotalAnalysisReport(id) {
        const response = await fetch(`${VT_BASE_URL}/analyses/${id}`, {
            headers: { 'x-apikey': VT_API_KEY }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Failed to get report.');
        return data.data;
    }

    async function pollForVirusTotalReport(id) {
        let attempts = 0;
        while (attempts < 20) {
            const report = await getVirusTotalAnalysisReport(id);
            if (report.attributes.status === 'completed') {
                return report;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
        }
        throw new Error('Analysis timed out. The report is taking too long to generate.');
    }

    // =================================================================================
    // --- DYNAMIC UI RENDERING ---
    // =================================================================================
    function displayAiLogReport(reportData) {
        resultsContainer.innerHTML = '';
        
        if (reportData.analysisResult === "No security issues or notable events found.") {
            const card = document.createElement('div');
            card.className = 'p-6 rounded-lg bg-card border border-border shadow-md';
            card.innerHTML = `
                <div class="text-center">
                    <div class="flex justify-center text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 class="mt-4 text-2xl font-bold text-foreground">Analysis Complete</h3>
                    <p class="mt-4 text-muted-foreground">The AI Forensics Agent analyzed the file and found no security issues or notable events.</p>
                </div>
            `;
            resultsContainer.appendChild(card);
        } else {
            const { summary, findings, vulnerabilityReport } = reportData.analysisResult;
            
            // 1. Summary Card
            const summaryCard = document.createElement('div');
            summaryCard.className = 'p-6 rounded-lg bg-card border border-border shadow-md mb-6';
            summaryCard.innerHTML = `<h3 class="text-xl font-semibold mb-2 text-foreground">Executive Summary</h3><p class="text-muted-foreground">${summary}</p>`;
            resultsContainer.appendChild(summaryCard);

            // 2. Threat Dashboard
            const dashboardContainer = document.createElement('div');
            dashboardContainer.className = 'p-6 rounded-lg bg-card border border-border shadow-md mb-6';
            dashboardContainer.innerHTML = `<h3 class="text-xl font-semibold mb-4 text-foreground">Threat Dashboard</h3>`;
            const findingsGrid = document.createElement('div');
            findingsGrid.className = 'space-y-4';
            findings.forEach(finding => {
                findingsGrid.appendChild(createFindingCard(finding));
            });
            dashboardContainer.appendChild(findingsGrid);
            resultsContainer.appendChild(dashboardContainer);

            // 3. Vulnerability Report Snippet
            const reportCard = document.createElement('div');
            reportCard.className = 'p-6 rounded-lg bg-card border border-border shadow-md';
            reportCard.innerHTML = `<h3 class="text-xl font-semibold mb-4 text-foreground">Vulnerability Report Snippet</h3>`;
            const pre = document.createElement('pre');
            pre.className = 'whitespace-pre-wrap p-4 rounded-md bg-muted text-sm text-foreground font-mono';
            pre.textContent = vulnerabilityReport;
            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy Report';
            copyButton.className = 'main-button mt-4 px-4 py-2 text-sm font-medium text-primary-foreground rounded-md';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(vulnerabilityReport).then(() => {
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => copyButton.textContent = 'Copy Report', 2000);
                });
            };
            reportCard.append(pre, copyButton);
            resultsContainer.appendChild(reportCard);
        }
    }

    function createFindingCard({ title, severity, details }) {
        const severityColors = {
            "Critical": "bg-red-600 text-white",
            "High": "bg-red-500 text-white",
            "Medium": "bg-yellow-500 text-black",
            "Low": "bg-blue-500 text-white",
            "Informational": "bg-gray-500 text-white"
        };
        const card = document.createElement('div');
        card.className = 'p-4 rounded-lg border border-border';
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <h4 class="font-semibold text-foreground">${title}</h4>
                <span class="text-xs font-bold uppercase px-2 py-1 rounded-full ${severityColors[severity] || 'bg-gray-400'}">${severity}</span>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">${details}</p>
        `;
        return card;
    }

    function displayVirusTotalFileReport(report) {
        const stats = report.attributes.stats;
        const maliciousCount = stats.malicious;
        const suspiciousCount = stats.suspicious;
        const totalVotes = stats.harmless + stats.malicious + stats.suspicious + stats.undetected;
        
        let verdict, color, summary;
        if (maliciousCount > 0) {
            verdict = "Malicious"; color = "red";
            summary = `This file is flagged as malicious by ${maliciousCount} out of ${totalVotes} security vendors. It is strongly recommended to delete this file immediately.`;
        } else if (suspiciousCount > 0) {
            verdict = "Suspicious"; color = "yellow";
            summary = `This file is flagged as suspicious by ${suspiciousCount} vendors. While not confirmed malicious, it exhibits unusual characteristics. Handle with extreme caution.`;
        } else {
            verdict = "Safe"; color = "green";
            summary = `No security vendors flagged this file as malicious. It appears to be safe.`;
        }

        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(createVerdictCard(verdict, color, summary, currentFile.name));
        resultsContainer.appendChild(createDetailsTable(report.attributes.results));
    }
    
    function displayVirusTotalUrlReport(report) {
        const stats = report.attributes.stats;
        const maliciousCount = stats.malicious;
        const suspiciousCount = stats.suspicious;
        const totalVotes = stats.harmless + stats.malicious + stats.suspicious + stats.undetected;
        const url = report.meta.url_info.url;

        let verdict, color, summary;
        if (maliciousCount > 0) {
            verdict = "Malicious"; color = "red";
            summary = `This URL is flagged as malicious by ${maliciousCount} out of ${totalVotes} security vendors. Do not visit this site.`;
        } else if (suspiciousCount > 0) {
            verdict = "Suspicious"; color = "yellow";
            summary = `This URL is flagged as suspicious by ${suspiciousCount} vendors. It may be unsafe. Proceed with extreme caution.`;
        } else {
            verdict = "Safe"; color = "green";
            summary = `No security vendors flagged this URL as malicious. It appears to be safe.`;
        }
        
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(createVerdictCard(verdict, color, summary, url));
        resultsContainer.appendChild(createDetailsTable(report.attributes.results));
    }

    function createVerdictCard(verdict, color, summary, subject) {
        const icons = {
            red: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
            yellow: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`,
            green: `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        };
        const card = document.createElement('div');
        card.className = `p-6 rounded-lg bg-card border border-border shadow-md text-center mb-6`;
        card.innerHTML = `
            <div class="flex justify-center text-${color}-500">${icons[color]}</div>
            <h3 class="mt-4 text-2xl font-bold text-foreground">${verdict}</h3>
            <p class="mt-2 font-mono text-sm text-muted-foreground break-all">${subject}</p>
            <p class="mt-4 text-muted-foreground max-w-2xl mx-auto">${summary}</p>
        `;
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
        table.innerHTML = `
            <thead class="bg-muted">
                <tr class="text-muted-foreground">
                    <th class="p-4 font-medium">Security Vendor</th>
                    <th class="p-4 font-medium">Category</th>
                    <th class="p-4 font-medium">Result</th>
                </tr>
            </thead>
        `;
        const tbody = document.createElement('tbody');
        tbody.className = 'divide-y divide-border';
        
        for (const engine in results) {
            const result = results[engine];
            const tr = document.createElement('tr');
            
            const category = result.category;
            let colorClass = 'text-muted-foreground';
            if (category === 'malicious') colorClass = 'text-red-600 dark:text-red-400';
            if (category === 'suspicious') colorClass = 'text-yellow-600 dark:text-yellow-400';

            tr.innerHTML = `
                <td class="p-4 font-semibold text-foreground">${result.engine_name}</td>
                <td class="p-4 font-medium ${colorClass}">${category.charAt(0).toUpperCase() + category.slice(1)}</td>
                <td class="p-4 font-mono text-xs text-muted-foreground">${result.result || 'Clean'}</td>
            `;
            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        wrapper.appendChild(table);
        card.append(title, wrapper);
        return card;
    }

    // --- Start the application ---
    initialize();
});
