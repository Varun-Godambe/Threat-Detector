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

    let currentFile = null;
    
    // --- API KEYS & ENDPOINTS ---
    // VirusTotal API Key is hardcoded as requested.
    const VT_API_KEY = 'ade67983327c2d7b57f5fa9d097056b1b72915427156f0eb37922ab79b159a0b';
    const VT_BASE_URL = 'https://www.virustotal.com/api/v3';
    // The Gemini API key is left blank; it will be handled by the execution environment.
    const GEMINI_API_KEY = ''; 
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    // =================================================================================
    // --- INITIALIZATION ---
    // =================================================================================
    function initialize() {
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
        themeToggle.addEventListener('click', toggleTheme);

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
                
                // HYBRID ANALYSIS: Check file type to decide which API to use
                if (currentFile.name.endsWith('.log') || currentFile.name.endsWith('.txt')) {
                    loaderText.textContent = 'Deploying AI Log Forensics Agent...';
                    const reportText = await runAiLogAnalysis(currentFile);
                    displayAiLogReport(reportText);
                } else {
                    loaderText.textContent = 'Uploading file to VirusTotal Analysis Grid...';
                    const analysisId = await uploadToVirusTotal(currentFile, 'file');
                    loaderText.textContent = 'Awaiting report from 70+ security vendors...';
                    const report = await pollForVirusTotalReport(analysisId, 'file');
                    displayVirusTotalFileReport(report);
                }

            } else { // type === 'url'
                const urlToScan = urlInput.value;
                if (!urlToScan) { throw new Error("Please enter a URL."); }
                analyzeUrlBtn.disabled = true;
                loaderText.textContent = 'Submitting URL to VirusTotal Analysis Grid...';
                const analysisId = await uploadToVirusTotal(urlToScan, 'url');
                loaderText.textContent = 'Awaiting report from security vendors...';
                const report = await pollForVirusTotalReport(analysisId, 'url');
                displayVirusTotalUrlReport(report);
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            resultsContainer.innerHTML = `<div class="p-6 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-center"><h3 class="font-semibold text-red-800 dark:text-red-200">Analysis Failed</h3><p class="mt-2 text-sm text-red-700 dark:text-red-300 font-mono">${error.message}</p></div>`;
        } finally {
            loader.style.display = 'none';
            resultsContainer.classList.remove('hidden');
            resultsContainer.classList.add('results-fade-in');
            analyzeFileBtn.disabled = false;
            analyzeUrlBtn.disabled = false;
        }
    }

    // =================================================================================
    // --- REAL AI LOG ANALYSIS (GEMINI API) ---
    // =================================================================================
    async function runAiLogAnalysis(file) {
        const logContent = await file.text();
        const prompt = `
            You are a senior cybersecurity analyst. Your task is to analyze the following log data for security issues, anomalies, or potential vulnerabilities.

            **Instructions:**
            1.  Thoroughly review the log data provided below.
            2.  Identify any suspicious activities, errors, or patterns that could indicate a security threat (e.g., failed logins, unauthorized access attempts, strange user agent strings, SQL injection patterns, etc.).
            3.  If you find credible issues, format your findings as a professional vulnerability report snippet. Include a title, a summary of the findings, a list of specific issues with technical details, and potential CVE numbers if an issue maps to a known vulnerability type.
            4.  **Crucially, if the log data appears clean and contains no discernible security issues, you MUST respond with only the exact phrase: "No security issues found."** Do not invent problems.

            **Log Data to Analyze:**
            \`\`\`
            ${logContent}
            \`\`\`
        `;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
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
            return result.candidates[0].content.parts[0].text;
        } else {
            throw new Error("AI analysis returned no valid response.");
        }
    }

    // =================================================================================
    // --- VIRUSTOTAL API INTERACTION ---
    // =================================================================================
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
        while (attempts < 20) { // Poll for up to 100 seconds
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
    function displayAiLogReport(reportText) {
        resultsContainer.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'p-6 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-md';
        
        if (reportText.trim() === "No security issues found.") {
            card.innerHTML = `
                <div class="text-center">
                    <div class="flex justify-center text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 class="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Analysis Complete</h3>
                    <p class="mt-4 text-gray-600 dark:text-gray-300">The AI Log Forensics Agent analyzed the file and found no discernible security issues or anomalies.</p>
                </div>
            `;
        } else {
            const title = document.createElement('h3');
            title.className = 'text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100';
            title.textContent = 'AI Log Analysis Report';
            
            const pre = document.createElement('pre');
            pre.className = 'whitespace-pre-wrap p-4 rounded-md bg-gray-100 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 font-mono';
            pre.textContent = reportText;
            
            const copyButton = document.createElement('button');
            copyButton.textContent = 'Copy Report';
            copyButton.className = 'mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700';
            copyButton.onclick = () => {
                navigator.clipboard.writeText(reportText).then(() => {
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => copyButton.textContent = 'Copy Report', 2000);
                });
            };
            card.append(title, pre, copyButton);
        }
        resultsContainer.appendChild(card);
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
        card.className = `p-6 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-md text-center mb-6`;
        card.innerHTML = `
            <div class="flex justify-center text-${color}-500">${icons[color]}</div>
            <h3 class="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">${verdict}</h3>
            <p class="mt-2 font-mono text-sm text-gray-500 dark:text-gray-400 break-all">${subject}</p>
            <p class="mt-4 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">${summary}</p>
        `;
        return card;
    }

    function createDetailsTable(results) {
        const card = document.createElement('div');
        card.className = 'p-6 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 shadow-md';
        const title = document.createElement('h3');
        title.className = 'text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100';
        title.textContent = 'Detailed Analysis Report from Security Vendors';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700';
        const table = document.createElement('table');
        table.className = 'w-full text-left text-sm';
        table.innerHTML = `
            <thead class="bg-gray-50 dark:bg-slate-900/50">
                <tr class="text-gray-500 dark:text-gray-400">
                    <th class="p-4 font-medium">Security Vendor</th>
                    <th class="p-4 font-medium">Category</th>
                    <th class="p-4 font-medium">Result</th>
                </tr>
            </thead>
        `;
        const tbody = document.createElement('tbody');
        tbody.className = 'divide-y divide-gray-200 dark:divide-gray-700';
        
        for (const engine in results) {
            const result = results[engine];
            const tr = document.createElement('tr');
            
            const category = result.category;
            let colorClass = 'text-gray-500 dark:text-gray-400';
            if (category === 'malicious') colorClass = 'text-red-600 dark:text-red-400';
            if (category === 'suspicious') colorClass = 'text-yellow-600 dark:text-yellow-400';

            tr.innerHTML = `
                <td class="p-4 font-semibold text-gray-800 dark:text-gray-200">${result.engine_name}</td>
                <td class="p-4 font-medium ${colorClass}">${category.charAt(0).toUpperCase() + category.slice(1)}</td>
                <td class="p-4 font-mono text-xs text-gray-600 dark:text-gray-300">${result.result || 'Clean'}</td>
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
