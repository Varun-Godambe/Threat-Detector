// --- main.js ---
// This is the main orchestrator for the application.
// It imports functions from the api.js and ui.js modules
// and connects them to the user's actions.

import * as api from './api.js';
import * as ui from './ui.js';

// --- Global State ---
let currentFiles = [];

// --- DOM Element References ---
const dom = {
    splashScreen: document.getElementById('splash-screen'),
    mainContent: document.getElementById('main-content'),
    themeToggle: document.getElementById('theme-toggle'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    openSidebarBtn: document.getElementById('open-sidebar-btn'),
    closeSidebarBtn: document.getElementById('close-sidebar-btn'),
    tabFile: document.getElementById('tab-file'),
    tabUrl: document.getElementById('tab-url'),
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    analyzeFileBtn: document.getElementById('analyzeFileBtn'),
    urlInput: document.getElementById('url-input'),
    analyzeUrlBtn: document.getElementById('analyzeUrlBtn'),
    analysisSection: document.getElementById('analysis-section'),
    loader: document.getElementById('loader'),
    loaderText: document.getElementById('loader-text'),
    resultsContainer: document.getElementById('results-container')
};

// --- Event Handlers ---
function handleFileSelect(files) {
    if (!files || files.length === 0) return;
    currentFiles = Array.from(files);
    ui.updateFileListUI(currentFiles);
    dom.analyzeFileBtn.disabled = false;
}

function enterApp() {
    dom.splashScreen.classList.add('fade-out');
    dom.mainContent.classList.remove('hidden');
    // We need a small delay to allow the 'hidden' class to be removed before starting the fade-in
    setTimeout(() => {
        dom.mainContent.classList.add('fade-in');
    }, 10);

    // Remove the splash screen from the DOM after the transition is complete
    dom.splashScreen.addEventListener('transitionend', () => {
        dom.splashScreen.remove();
    });
}

// --- Analysis Orchestration ---
async function runAnalysis(type) {
    dom.analysisSection.classList.remove('hidden');
    dom.resultsContainer.innerHTML = '';
    dom.resultsContainer.classList.add('hidden');
    dom.resultsContainer.style.opacity = 0;
    dom.loader.style.display = 'flex';
    
    try {
        if (type === 'file') {
            if (currentFiles.length === 0) { throw new Error("Please select one or more files."); }
            dom.analyzeFileBtn.disabled = true;
            
            const firstFile = currentFiles[0];
            const textBasedExtensions = [
                '.log', '.txt', '.conf', '.cfg', '.config', '.ini', 
                '.json', '.yaml', '.yml', '.xml', '.sh', '.ps1', 
                '.py', '.js', '.md'
            ];
            const isTextBased = textBasedExtensions.some(ext => firstFile.name.endsWith(ext));

            if (isTextBased) {
                dom.loaderText.textContent = `Deploying AI Forensics Agent for ${currentFiles.length} file(s)...`;
                const reportData = await api.runAiLogAnalysis(currentFiles);
                ui.displayAiLogReport(reportData, dom.resultsContainer);
            } else {
                if (currentFiles.length > 1) {
                    alert("For malware scanning, please upload one file at a time. Analyzing the first file only.");
                }
                dom.loaderText.textContent = 'Uploading file to VirusTotal Analysis Grid...';
                const analysisId = await api.uploadToVirusTotal(firstFile, 'file');
                dom.loaderText.textContent = 'Awaiting report from 70+ security vendors...';
                const report = await api.pollForVirusTotalReport(analysisId);
                ui.displayVirusTotalFileReport(report, firstFile.name, dom.resultsContainer);
            }

        } else { // type === 'url'
            const urlToScan = dom.urlInput.value;
            if (!urlToScan) { throw new Error("Please enter a URL."); }
            dom.analyzeUrlBtn.disabled = true;
            dom.loaderText.textContent = 'Submitting URL to VirusTotal Analysis Grid...';
            const analysisId = await api.uploadToVirusTotal(urlToScan, 'url');
            dom.loaderText.textContent = 'Awaiting report from security vendors...';
            const report = await api.pollForVirusTotalReport(analysisId);
            ui.displayVirusTotalUrlReport(report, dom.resultsContainer);
        }
    } catch (error) {
        console.error("Analysis failed:", error);
        let friendlyMessage = error.message;
        if (error.message.includes('403')) {
            friendlyMessage = "Access Denied (403). The provided API key may be invalid, expired, or lack permissions for this resource. Please verify your API key and permissions.";
        } else if (error.message.includes('Failed to fetch')) {
             friendlyMessage = "Network error. Please check your internet connection and ensure ad-blockers are not interfering with API requests.";
        }
        dom.resultsContainer.innerHTML = `<div class="p-6 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-center"><h3 class="font-semibold text-red-800 dark:text-red-200">Analysis Failed</h3><p class="mt-2 text-sm text-red-700 dark:text-red-300">${friendlyMessage}</p></div>`;
    } finally {
        dom.loader.style.display = 'none';
        dom.resultsContainer.classList.remove('hidden');
        dom.resultsContainer.classList.add('results-fade-in');
        dom.analyzeFileBtn.disabled = false;
        dom.analyzeUrlBtn.disabled = false;
    }
}

// --- Initialization ---
function initialize() {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    ui.applyTheme(savedTheme);
    
    dom.splashScreen.addEventListener('click', enterApp, { once: true });

    dom.themeToggle.addEventListener('click', ui.toggleTheme);
    dom.openSidebarBtn.addEventListener('click', ui.openSidebar);
    dom.closeSidebarBtn.addEventListener('click', ui.closeSidebar);
    dom.sidebarOverlay.addEventListener('click', ui.closeSidebar);

    dom.tabFile.addEventListener('click', () => ui.switchTab('file'));
    dom.tabUrl.addEventListener('click', () => ui.switchTab('url'));

    dom.dropZone.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', () => handleFileSelect(dom.fileInput.files));
    dom.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dom.dropZone.classList.add('highlight'); });
    dom.dropZone.addEventListener('dragleave', () => dom.dropZone.classList.remove('highlight'));
    dom.dropZone.addEventListener('drop', (e) => { e.preventDefault(); dom.dropZone.classList.remove('highlight'); handleFileSelect(e.dataTransfer.files); });
    
    dom.analyzeFileBtn.addEventListener('click', () => runAnalysis('file'));
    dom.urlInput.addEventListener('input', () => {
        try { new URL(dom.urlInput.value); dom.analyzeUrlBtn.disabled = false; } catch (_) { dom.analyzeUrlBtn.disabled = true; }
    });
    dom.analyzeUrlBtn.addEventListener('click', () => runAnalysis('url'));
}

// Start the application
document.addEventListener('DOMContentLoaded', initialize);
