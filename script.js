document.addEventListener('DOMContentLoaded', () => {
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
        document.querySelector('.icon-file').innerHTML = L.File();
        document.querySelector('.icon-file-text').innerHTML = L.FileText();
        document.querySelector('.icon-link').innerHTML = L.Link();
        document.querySelector('.icon-code').innerHTML = L.Code();
        document.querySelector('.icon-scan-line').innerHTML = L.ScanLine();
        document.querySelector('.icon-upload-cloud').innerHTML = L.UploadCloud();
    }


    // --- Theme Switcher ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    if (savedTheme === 'dark') {
        htmlEl.classList.add('dark');
        themeToggle.checked = true;
    } else {
        htmlEl.classList.remove('dark');
        themeToggle.checked = false;
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            htmlEl.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            htmlEl.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    });

    // --- Tab Navigation ---
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    let activeTab = 'file';

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            activeTab = tabName;

            tabs.forEach(t => t.classList.remove('border-primary', 'text-primary'));
            tab.classList.add('border-primary', 'text-primary');

            panels.forEach(panel => {
                panel.id === `${tabName}-panel` ? panel.classList.remove('hidden') : panel.classList.add('hidden');
            });
        });
    });

    // --- Drag and Drop for Log Files ---
    const logDropArea = document.getElementById('log-drop-area');
    const logFileInput = document.getElementById('log-file-input');
    const logTextInput = document.getElementById('log-input');

    logDropArea.addEventListener('click', () => logFileInput.click());
    logFileInput.addEventListener('change', () => {
        if (logFileInput.files.length > 0) {
            handleLogFile(logFileInput.files[0]);
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        logDropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        logDropArea.addEventListener(eventName, () => logDropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        logDropArea.addEventListener(eventName, () => logDropArea.classList.remove('highlight'), false);
    });

    logDropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleLogFile(files[0]);
        }
    }, false);

    async function handleLogFile(file) {
        loaderText.textContent = `Reading ${file.name}...`;
        const fileContent = await readFileAsText(file);
        logTextInput.value = fileContent;
        // Optionally, trigger analysis immediately after drop/select
        // analyzeBtn.click(); 
    }

    // --- Analysis Logic ---
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsSection = document.getElementById('results-section');
    const resultsLoader = document.getElementById('results-loader');
    const loaderText = document.getElementById('loader-text');
    const resultsContainer = document.getElementById('results-container');
    
    analyzeBtn.addEventListener('click', async () => {
        resultsSection.classList.remove('hidden');
        resultsLoader.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        
        let findings = [];
        const agent = new ThreatAnalysisAgent();
        
        try {
            switch(activeTab) {
                case 'file':
                    const fileInput = document.getElementById('file-input');
                    if (!fileInput.files || fileInput.files.length === 0) throw new Error("Please select a file to analyze.");
                    const file = fileInput.files[0];
                    loaderText.textContent = `Reading ${file.name}...`;
                    const fileContent = await readFileAsText(file);
                    loaderText.textContent = `Analyzing ${file.name}...`;
                    findings = agent.analyzeFile(fileContent, file.name);
                    break;
                case 'log':
                    const logInput = logTextInput.value;
                    if (!logInput.trim()) throw new Error("Log input is empty.");
                    loaderText.textContent = 'Analyzing log data...';
                    findings = agent.analyzeLog(logInput);
                    break;
                case 'url':
                    const urlInput = document.getElementById('url-input').value;
                    if (!urlInput.trim()) throw new Error("URL input is empty.");
                    loaderText.textContent = `Scanning URL: ${urlInput}...`;
                    findings = agent.analyzeUrl(urlInput);
                    break;
                case 'snippet':
                    const snippetInput = document.getElementById('snippet-input').value;
                    if (!snippetInput.trim()) throw new Error("Snippet is empty.");
                    loaderText.textContent = 'Analyzing snippet...';
                    findings = agent.analyzeFile(snippetInput, 'snippet.txt');
                    break;
            }
        } catch (error) {
            findings = [{ level: 'error', title: 'Analysis Error', description: error.message }];
        }

        setTimeout(() => {
            resultsLoader.classList.add('hidden');
            displayResults(findings);
        }, 1000);
    });

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsText(file);
        });
    }

    function displayResults(findings) {
        if (findings.length === 0) {
            resultsContainer.innerHTML = `
                <div class="flex flex-col items-center text-center py-8">
                    <span class="h-12 w-12 text-green-500">${L.PartyPopper ? L.PartyPopper() : ''}</span>
                    <h4 class="text-lg font-semibold mt-4">No Issues Found</h4>
                    <p class="text-muted-foreground">The analysis completed without finding any specific threats based on current rules.</p>
                </div>
            `;
            return;
        }

        findings.sort((a, b) => {
            const severity = { critical: 3, warning: 2, info: 1, error: 3 };
            return (severity[b.level] || 0) - (severity[a.level] || 0);
        });

        findings.forEach(finding => {
            const levelClasses = {
                critical: { bg: 'bg-destructive/10', border: 'border-destructive', icon: L.ShieldAlert ? L.ShieldAlert() : '', iconColor: 'text-destructive' },
                warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500', icon: L.AlertTriangle ? L.AlertTriangle() : '', iconColor: 'text-yellow-500' },
                info: { bg: 'bg-blue-500/10', border: 'border-blue-500', icon: L.Info ? L.Info() : '', iconColor: 'text-blue-500' },
                error: { bg: 'bg-destructive/10', border: 'border-destructive', icon: L.XCircle ? L.XCircle() : '', iconColor: 'text-destructive' },
            };
            const classes = levelClasses[finding.level] || levelClasses.info;

            const findingCard = `
                <div class="p-4 rounded-lg border ${classes.border} ${classes.bg} mb-4 flex items-start space-x-4">
                    <div class="flex-shrink-0 h-6 w-6 ${classes.iconColor}">${classes.icon}</div>
                    <div>
                        <h5 class="font-semibold text-card-foreground">${finding.title}</h5>
                        <p class="text-sm text-muted-foreground">${finding.description}</p>
                        ${finding.context ? `<pre class="mt-2 p-2 bg-muted rounded-md text-xs overflow-x-auto"><code>${escapeHtml(finding.context)}</code></pre>` : ''}
                    </div>
                </div>
            `;
            resultsContainer.innerHTML += findingCard;
        });
    }

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // --- THREAT ANALYSIS AGENT ---
    class ThreatAnalysisAgent {
        analyzeFile(content, filename) {
            const extension = filename.split('.').pop().toLowerCase();
            let findings = [];
            switch(extension) {
                case 'ps1': findings = this._analyzePowerShell(content); break;
                case 'py': findings = this._analyzePython(content); break;
                case 'sh': findings = this._analyzeShell(content); break;
                case 'json': findings = this._analyzeJson(content); break;
                default:
                    findings = [
                        ...this._analyzePowerShell(content), 
                        ...this._analyzePython(content), 
                        ...this._analyzeShell(content)
                    ];
            }
            return findings;
        }

        _analyzePowerShell(content) {
            const findings = [];
            const criticalPatterns = {
                'Invoke-Expression': 'The `Invoke-Expression` cmdlet (or `iex` alias) can execute arbitrary commands and is a major security risk.',
                'FromBase64String': 'Decoding Base64 strings can be a technique to obfuscate malicious code.',
                'New-Object Net.WebClient': 'Use of WebClient for downloads can be a precursor to fetching malicious payloads.'
            };
            content.split('\n').forEach(line => {
                for (const [pattern, desc] of Object.entries(criticalPatterns)) {
                    if (new RegExp(pattern, 'i').test(line)) {
                        findings.push({ level: 'critical', title: `Suspicious PowerShell Command`, description: desc, context: line.trim() });
                    }
                }
            });
            return findings;
        }

        _analyzePython(content) {
            const findings = [];
            const warningPatterns = {
                'os.system': '`os.system` executes a shell command, which can lead to command injection.',
                'pickle.load': 'Loading pickled data from an untrusted source can lead to arbitrary code execution.',
                'subprocess.call.*shell=True': 'Using `shell=True` with `subprocess` is dangerous if the command is from external input.',
                'eval(': 'The `eval()` function can execute arbitrary code and should be avoided.'
            };
            content.split('\n').forEach(line => {
                for (const [pattern, desc] of Object.entries(warningPatterns)) {
                    if (new RegExp(pattern).test(line)) {
                        findings.push({ level: 'warning', title: `Potential Python Vulnerability`, description: desc, context: line.trim() });
                    }
                }
            });
            return findings;
        }

        _analyzeShell(content) {
            const findings = [];
            if (content.includes('rm -rf /')) {
                findings.push({ level: 'critical', title: 'Extremely Dangerous Command', description: 'The script contains `rm -rf /`, which can wipe the entire filesystem.', context: 'rm -rf /' });
            }
            if (/(curl|wget)\s+.*\s+\|\s+(bash|sh)/.test(content)) {
                 findings.push({ level: 'critical', title: 'Remote Code Execution via Pipe to Shell', description: 'Piping the output of `curl` or `wget` directly to a shell executes remote code without inspection.', context: content.match(/(curl|wget)\s+.*\s+\|\s+(bash|sh)/)[0] });
            }
            return findings;
        }
        
        _analyzeJson(content) {
            const findings = [];
            const sensitiveKeys = /"(password|apiKey|secret|private_key|token)"\s*:/i;
            if (sensitiveKeys.test(content)) {
                findings.push({ level: 'warning', title: 'Potentially Sensitive Data', description: 'The configuration file may contain a hardcoded secret.', context: content.match(new RegExp(`"${sensitiveKeys.source.split('|')[0].slice(1,-1)}".*`, 'i'))?.[0] });
            }
            return findings;
        }

        analyzeLog(logContent) {
            let findings = [];
            const lines = logContent.split('\n').filter(line => line.trim() !== '');
            const state = {
                ipActivity: {}, // { ip: { failedLogins: [], successfulLogins: [], scans: [] } }
                parsedLines: []
            };

            // Common Log Format Regex (IP, user, user, [date], "method path proto", status, size, "referer", "user-agent")
            const clfRegex = /^(\S+) (\S+) (\S+) \[([\w:/]+\s[+\-]\d{4})\] "(\S+)\s(\S+)\s*(\S*)" (\d{3}) (\d+|-) "(.*?)" "(.*?)"/;

            // 1. Parse and Structure Data
            lines.forEach(line => {
                const match = line.match(clfRegex);
                if (match) {
                    state.parsedLines.push({
                        ip: match[1],
                        timestamp: new Date(match[4].replace(':', ' ')),
                        method: match[5],
                        path: match[6],
                        status: parseInt(match[8], 10),
                        userAgent: match[11],
                        raw: line
                    });
                }
            });

            if (state.parsedLines.length === 0) {
                 return [{ level: 'info', title: 'Log Format Not Recognized', description: 'Could not parse logs using Common Log Format. Analysis will be based on simple text matching.' }];
            }

            // 2. Populate IP Activity State
            state.parsedLines.forEach(line => {
                if (!state.ipActivity[line.ip]) {
                    state.ipActivity[line.ip] = { failedLogins: 0, successfulLogins: 0, scans: 0, activity: [] };
                }
                state.ipActivity[line.ip].activity.push(line);
                if (line.status === 401 || line.status === 403) state.ipActivity[line.ip].failedLogins++;
                if (line.status === 200 && (line.path.includes('login') || line.path.includes('admin'))) state.ipActivity[line.ip].successfulLogins++;
                if (line.status === 404) state.ipActivity[line.ip].scans++;
            });

            // 3. Run Analysis Rules on State
            for (const [ip, activity] of Object.entries(state.ipActivity)) {
                // Rule: Brute-force detection
                if (activity.failedLogins > 10) {
                    findings.push({ level: 'critical', title: 'Brute-Force Attempt Detected', description: `IP address ${ip} had ${activity.failedLogins} failed login attempts.`, context: `IP: ${ip}` });
                }
                // Rule: Vulnerability Scanning
                if (activity.scans > 20) {
                    findings.push({ level: 'warning', title: 'Vulnerability Scanning Detected', description: `IP address ${ip} generated ${activity.scans} 'Not Found' (404) errors, indicating probing.`, context: `IP: ${ip}` });
                }
                // Rule: Attack Chain Correlation
                if (activity.scans > 5 && activity.successfulLogins > 0) {
                    findings.push({ level: 'critical', title: 'Potential Attack Chain Detected', description: `IP address ${ip} performed scanning activity and then successfully logged in.`, context: `IP: ${ip}` });
                }
            }
            
            // Rule: Suspicious User Agents
            const suspiciousAgents = [/sqlmap/i, /nmap/i, /masscan/i, /acunetix/i, /nikto/i];
            const agentActivity = {};
            state.parsedLines.forEach(line => {
                suspiciousAgents.forEach(agentRegex => {
                    if (agentRegex.test(line.userAgent)) {
                        if (!agentActivity[line.userAgent]) agentActivity[line.userAgent] = [];
                        agentActivity[line.userAgent].push(line.ip);
                    }
                });
            });

            for (const [agent, ips] of Object.entries(agentActivity)) {
                const uniqueIps = [...new Set(ips)];
                findings.push({ level: 'warning', title: 'Suspicious User-Agent Detected', description: `The agent "${agent}" was seen from ${uniqueIps.length} IP(s).`, context: `Agent: ${agent}, IPs: ${uniqueIps.join(', ')}` });
            }

            return findings;
        }

        analyzeUrl(url) {
            const maliciousDomains = ['evil-domain.com', 'malware-host.net', 'phishing-site.org'];
            try {
                const urlHostname = new URL(url).hostname;
                if (maliciousDomains.some(domain => urlHostname.includes(domain))) {
                    return [{ level: 'critical', title: 'Malicious URL Detected', description: `The URL "${url}" is on a list of known malicious domains.` }];
                }
            } catch (e) {
                return [{ level: 'error', title: 'Invalid URL', description: 'The provided URL is not valid.' }];
            }
            return [];
        }
    }
});
