<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ThreatSight - Real-Time Threat Analysis</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Chart.js for visual dashboards -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- html2pdf.js for PDF exporting -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-background text-foreground transition-colors duration-300">

    <!-- Animated Background -->
    <div id="background-animation"></div>

    <!-- Clickable Splash Screen -->
    <div id="splash-screen" class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background cursor-pointer">
        <div class="flex items-center gap-4 text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-12 w-12 text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span class="text-5xl font-bold">ThreatSight</span>
        </div>
        <p class="enter-prompt mt-8 text-lg text-muted-foreground">Click to Enter</p>
    </div>

    <!-- Main Application Content (Initially Hidden) -->
    <div id="main-content" class="hidden">
        <!-- Mobile Sidebar Overlay -->
        <div id="sidebar-overlay" class="fixed inset-0 z-40 bg-black bg-opacity-50 hidden md:hidden"></div>

        <div class="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <!-- Sidebar -->
            <div id="sidebar" class="fixed inset-y-0 left-0 z-50 w-[220px] lg:w-[280px] border-r border-border bg-card md:static md:block -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out">
                <div class="flex h-full max-h-screen flex-col gap-2">
                    <div class="flex h-14 items-center border-b border-border px-4 lg:h-[60px] lg:px-6">
                        <a href="/" class="flex items-center gap-2 font-semibold text-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            <span class="text-lg">ThreatSight</span>
                        </a>
                        <button id="close-sidebar-btn" class="ml-auto h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted md:hidden">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                    <div class="flex-1">
                        <nav class="grid items-start px-2 text-sm font-medium lg:px-4">
                            <a href="#" class="flex items-center gap-3 rounded-lg px-3 py-2 bg-muted text-foreground transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                                Analyzer
                            </a>
                            <a href="documentation.html" class="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                                Documentation
                            </a>
                        </nav>
                    </div>
                     <div class="mt-auto p-4">
                        <div class="w-full justify-center flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                            <span>API Key Active</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="flex flex-col relative">
                <header class="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:h-[60px] lg:px-6">
                    <!-- Mobile Menu Button -->
                    <button id="open-sidebar-btn" class="h-9 w-9 -ml-2 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted md:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
                    <div class="w-full flex-1">
                        <h1 class="text-lg font-semibold md:text-2xl text-foreground">Real-Time Threat Analyzer</h1>
                    </div>
                    <button id="theme-toggle" class="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
                        <svg id="theme-icon-sun" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 hidden"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                        <svg id="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 hidden"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    </button>
                </header>

                <main class="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    <!-- Tab Navigation -->
                    <div class="border-b border-border">
                        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                            <button id="tab-file" class="tab-btn active-tab group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="-ml-0.5 mr-2 h-5 w-5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                File Analysis
                            </button>
                            <button id="tab-url" class="tab-btn inactive-tab group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="-ml-0.5 mr-2 h-5 w-5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
                                URL Analysis
                            </button>
                        </nav>
                    </div>

                    <!-- Analysis Content Area -->
                    <div id="analysis-content">
                        <!-- File Analysis Pane -->
                        <div id="pane-file">
                            <div id="drop-zone" class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border shadow-sm cursor-pointer p-10 transition-all duration-300 hover:border-primary hover:bg-primary/10 hover:shadow-primary/20 hover:shadow-lg">
                                <div class="flex flex-col items-center gap-2 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-10 w-10 text-muted-foreground"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    <h3 class="text-2xl font-bold tracking-tight text-foreground">Drag and drop files here</h3>
                                    <p class="text-muted-foreground">or click to browse your machine</p>
                                </div>
                                <input type="file" id="file-input" class="hidden" accept="*/*" multiple>
                            </div>
                            <div id="file-list-container" class="mt-4 hidden">
                                <h4 class="text-sm font-medium text-foreground mb-2">Selected Files:</h4>
                                <ul id="file-list" class="max-h-32 overflow-y-auto space-y-1 rounded-md border border-border p-2 bg-muted/50">
                                    <!-- Selected files will be listed here -->
                                </ul>
                            </div>
                            <button id="analyzeFileBtn" class="main-button mt-4 w-full text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow" disabled>
                                Analyze Files
                            </button>
                        </div>

                        <!-- URL Analysis Pane -->
                        <div id="pane-url" class="hidden">
                            <div class="flex flex-col gap-2">
                                 <label for="url-input" class="text-sm font-medium text-foreground">Enter a URL to scan with VirusTotal:</label>
                                 <input type="url" id="url-input" placeholder="https://example.com" class="block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-card text-foreground">
                            </div>
                             <button id="analyzeUrlBtn" class="main-button mt-4 w-full text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow" disabled>
                                Analyze URL
                            </button>
                        </div>
                    </div>

                    <!-- Results Section -->
                    <div id="analysis-section" class="hidden mt-6">
                        <div id="loader" class="flex flex-col items-center justify-center py-12">
                            <div class="loader"></div>
                            <p id="loader-text" class="mt-4 text-muted-foreground font-medium">Executing Analysis...</p>
                        </div>
                        <div id="results-container" class="hidden opacity-0 transition-opacity duration-500">
                            <!-- Dynamic content will be injected here -->
                        </div>
                    </div>
                </main>

                <!-- Footer -->
                <footer class="mt-auto border-t border-border p-4 text-center text-sm text-muted-foreground">
                    <div class="flex items-center justify-center gap-4">
                        <span>Developed by <a href="https://www.linkedin.com/in/varun-godambe-85781b1a0/" target="_blank" rel="noopener noreferrer" class="font-semibold text-primary hover:underline">Varun Godambe</a></span>
                        <a href="https://github.com/Varun-Godambe" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                            </svg>
                            <span class="sr-only">GitHub</span>
                        </a>
                    </div>
                </footer>
            </div>
        </div>
    </div>
    
    <!-- Load JavaScript modules -->
    <script src="api.js" type="module"></script>
    <script src="ui.js" type="module"></script>
    <script src="main.js" type="module"></script>
</body>
</html>
