document.addEventListener('DOMContentLoaded', () => {
    // --- Icon Setup ---
    const L = {};
    
    // The Lucide script in the HTML needs to load first.
    // We use window.onload to ensure all external scripts, including Lucide, are ready.
    window.onload = () => {
        const root = ReactDOM.createRoot(document.getElementById('lucide-icons-container'));
        const icons = React.createElement(React.Fragment, null,
          Object.keys(lucide).map(iconName =>
            React.createElement(lucide[iconName], { key: iconName, id: `lucide-${iconName.toLowerCase()}` })
          )
        );
        root.render(icons);

        // Create a mapping for easy access after rendering
        Object.keys(lucide).forEach(iconName => {
            L[iconName] = () => {
                const iconElement = document.getElementById(`lucide-${iconName.toLowerCase()}`);
                return iconElement ? iconElement.outerHTML : '';
            }
        });

        // Now that Lucide icons are ready, populate the static icons on the page
        populateIcons();
    };

    function populateIcons() {
        // This check ensures we don't run before L is populated
        if (!L.ShieldCheck) return; 

        document.getElementById('header-logo').innerHTML = L.ShieldCheck();
        document.getElementById('sun-icon').innerHTML = L.Sun();
        document.getElementById('moon-icon').innerHTML = L.Moon();
        document.querySelector('.icon-file').innerHTML = L.File();
        document.querySelector('.icon-file-text').innerHTML = L.FileText();
        document.querySelector('.icon-link').innerHTML = L.Link();
        document.querySelector('.icon-code').innerHTML = L.Code();
        document.querySelector('.icon-scan-line').innerHTML = L.ScanLine();
    }


    // --- Theme Switcher ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    // Check for saved theme in localStorage or use system preference
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    if (savedTheme === 'dark') {
        htmlEl.classList.add('dark');
        themeToggle.checked = true;
    } else {
        htmlEl.classList.remove('dark');
        themeToggle.checked = false;
    }

    // Add event listener for theme toggle
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

            // Update tab styles
            tabs.forEach(t => {
                t.classList.remove('border-primary', 'text-primary');
                t.classList.add('border-transparent', 'text-muted-foreground', 'hover:text-foreground', 'hover:border-border-custom');
            });
            tab.classList.add('border-primary', 'text-primary');
            tab.classList.remove('border-transparent', 'text-muted-foreground', 'hover:text-foreground', 'hover:border-border-custom');

            // Show/hide panels
            panels.forEach(panel => {
                if (panel.id === `${tabName}-panel`) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            });
        });
    });

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
        
        try {
            switch(activeTab) {
                case 'file':
                    const fileInput = document.getElementById('file-input');
                    if (!fileInput.files || fileInput.files.length === 0) {
                        throw new Error("Please select a file to analyze.");
                    }
                    const file = fileInput.files[0];
                    loaderText.textContent = `Reading ${file.name}...`;
                    const fileContent = await readFileAsText(file);
                    loaderText.textContent = `Analyzing ${file.name}...`;
                    findings = analyzeFile(fileContent, file.name);
                    break;
                case 'log':
                    const logInput = document.getElementById('log-input').value;
                    if (!logInput.trim()) throw new Error("Log input is empty.");
                    loaderText.textContent = 'Analyzing log data...';
                    findings = analyzeLog(logInput);
                    break;
                case 'url':
                    const urlInput = document.getElementById('url-input').value;
                    if (!urlInput.trim()) throw new Error("URL input is empty.");
                    loaderText.textContent = `Scanning URL: ${urlInput}...`;
                    findings = analyzeUrl(urlInput);
                    break;
                case 'snippet':
                    const snippetInput = document.getElementById('snippet-input').value;
                    if (!snippetInput.trim()) throw new Error("Snippet is empty.");
                    loaderText.textContent = 'Analyzing snippet...';
                    findings = analyzeFile(snippetInput, 'snippet.txt');
                    break;
            }
        } catch (error) {
            findings = [{ level: 'error', title: 'Analysis Error', description: error.message }];
        }

        // Simulate analysis time for better UX
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

    // --- ANALYSIS FUNCTIONS ---

    function analyzeFile(content, filename) {
        const extension = filename.split('.').pop().toLowerCase();
        let findings = [];
        switch(extension) {
            case 'ps1':
                findings = findings.concat(analyzePowerShell(content));
                break;
            case 'py':
                findings = findings.concat(analyzePython(content));
                break;
            case 'sh':
                findings = findings.concat(analyzeShell(content));
                break;
            case 'json':
                findings = findings.concat(analyzeJson(content));
                break;
            default: // For snippets or unknown files
                findings = findings.concat(analyzePowerShell(content), analyzePython(content), analyzeShell(content));
        }
        return findings;
    }

    function analyzePowerShell(content) {
        const findings = [];
        const lines = content.split('\n');
        const criticalPatterns = {
            'Invoke-Expression': 'The `Invoke-Expression` cmdlet (or `iex` alias) can execute arbitrary commands and is a major security risk if used with untrusted input.',
            'FromBase64String': 'Decoding Base64 strings can be a technique to obfuscate malicious code. Review the source of the encoded data carefully.'
        };

        lines.forEach((line) => {
            for (const pattern in criticalPatterns) {
                if (new RegExp(pattern, 'i').test(line)) {
                    findings.push({
                        level: 'critical',
                        title: `Suspicious PowerShell Command: \`${pattern}\``,
                        description: criticalPatterns[pattern],
                        context: line.trim()
                    });
                }
            }
        });
        return findings;
    }

    function analyzePython(content) {
        const findings = [];
        const lines = content.split('\n');
        const warningPatterns = {
            'os.system': '`os.system` executes a shell command. If the command string is derived from user input, it can lead to command injection.',
            'pickle.load': 'Loading pickled data from an untrusted source is insecure and can lead to arbitrary code execution.',
            'subprocess.call.*shell=True': 'Using `shell=True` with `subprocess` can be dangerous if the command is constructed from external input.'
        };

        lines.forEach((line) => {
            for (const pattern in warningPatterns) {
                if (new RegExp(pattern).test(line)) {
                    findings.push({
                        level: 'warning',
                        title: `Potential Python Vulnerability: \`${pattern.split('.')[0]}\``,
                        description: warningPatterns[pattern],
                        context: line.trim()
                    });
                }
            }
        });
        return findings;
    }

    function analyzeShell(content) {
        const findings = [];
        if (content.includes('rm -rf /')) {
            findings.push({
                level: 'critical',
                title: 'Extremely Dangerous Command Found',
                description: 'The script contains `rm -rf /`, which can wipe the entire filesystem. This is highly destructive.',
                context: 'rm -rf /'
            });
        }
        if (/(curl|wget)\s+.*\s+\|\s+sh/.test(content)) {
             findings.push({
                level: 'critical',
                title: 'Remote Code Execution via Pipe to Shell',
                description: 'Piping the output of `curl` or `wget` directly to a shell executes remote code without inspection. This is a very common attack vector.',
                context: content.match(/(curl|wget)\s+.*\s+\|\s+sh/)[0]
            });
        }
        return findings;
    }
    
    function analyzeJson(content) {
        const findings = [];
        const sensitiveKeys = ['password', 'apiKey', 'secret', 'private_key', 'token'];
        try {
            JSON.parse(content); // Validate JSON
            sensitiveKeys.forEach(key => {
                if (new RegExp(`"${key}"\\s*:`, 'i').test(content)) {
                    findings.push({
                        level: 'warning',
                        title: 'Potentially Sensitive Data Found',
                        description: `The configuration file contains a key named "${key}", which may indicate a hardcoded secret.`,
                        context: content.match(new RegExp(`"${key}"\\s*:\\s*".*?"`, 'i'))?.[0] || `"${key}"`
                    });
                }
            });
        } catch (e) { /* Not valid JSON, ignore */ }
        return findings;
    }

    function analyzeLog(content) {
        const findings = [];
        const failedLoginCount = (content.match(/failed login/gi) || []).length;
        if (failedLoginCount > 5) {
            findings.push({
                level: 'warning',
                title: 'Multiple Failed Logins Detected',
                description: `Found ${failedLoginCount} instances of "failed login", which could indicate a brute-force attempt.`,
            });
        }
        
        const ipAddresses = [...new Set(content.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) || [])];
        if (ipAddresses.length > 10) {
             findings.push({
                level: 'info',
                title: 'High Number of Unique IP Addresses',
                description: `Detected ${ipAddresses.length} unique IP addresses in the log, which might be normal or could indicate distributed activity.`,
            });
        }
        return findings;
    }

    function analyzeUrl(url) {
        const maliciousDomains = ['evil-domain.com', 'malware-host.net', 'phishing-site.org'];
        try {
            const urlHostname = new URL(url).hostname;
            if (maliciousDomains.some(domain => urlHostname.includes(domain))) {
                return [{
                    level: 'critical',
                    title: 'Malicious URL Detected',
                    description: `The URL "${url}" is on a list of known malicious domains. Do not visit this site.`,
                }];
            }
        } catch (e) {
            return [{
                level: 'error',
                title: 'Invalid URL',
                description: 'The provided URL is not valid. Please check the format (e.g., https://example.com).',
            }];
        }
        return [];
    }
});
