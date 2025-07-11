// --- api.js ---
// This module handles all communication with external APIs (VirusTotal, Gemini).
// It keeps the API logic separate from the main application flow.

// --- API KEYS & ENDPOINTS ---
const VT_API_KEY = 'ade67983327c2d7b57f5fa9d097056b1b72915427156f0eb37922ab79b159a0b';
const GEMINI_API_KEY = 'AIzaSyASISr1va_plNsir5hhuhBDZdwBDOX-0sw';

const VT_BASE_URL = 'https://www.virustotal.com/api/v3';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Analyzes log or configuration files using the Gemini API.
 * @param {File[]} files - An array of file objects to be analyzed.
 * @returns {Promise<object>} A promise that resolves to the structured JSON analysis from the AI.
 */
export async function runAiLogAnalysis(files) {
    let combinedContent = '';
    for (const file of files) {
        const content = await file.text();
        combinedContent += `--- START OF FILE: ${file.name} ---\n\n${content}\n\n--- END OF FILE: ${file.name} ---\n\n`;
    }

    const prompt = `
        You are a senior cybersecurity analyst following best practices from NIST SP 800-92, the Australian Cyber Security Centre (ACSC), and the OWASP Logging Cheat Sheet. Your task is to analyze the following log data or configuration files and return your findings in a structured JSON format.

        **Instructions:**
        1. Thoroughly review the provided text content. Correlate events across files if possible.
        2. Identify security issues, anomalies, and notable events. Look for a wide range of issues including, but not limited to: input validation failures, authorization failures, session management anomalies, repeated failed logins, unauthorized access attempts, hardcoded secrets, overly permissive rules, SQL injection patterns, repelled attacks, or other notable behavioral anomalies.
        3. Categorize each finding into one of the following: "Authentication and Access", "Network Activity", "System and Application Events", "Configuration and Policy", or "Behavioral Anomaly".
        4. Structure your response as a single JSON object. Do not include any text or markdown formatting before or after the JSON object.
        5. The JSON object must have a key "analysisResult".
        6. If the files are completely benign and contain no security issues or notable events, the value of "analysisResult" should be the string "No security issues or notable events found.".
        7. If you find issues or notable events, the value of "analysisResult" should be an object with two keys: "summaryStats" and "findings".
            - "summaryStats": An object containing the counts of findings by severity. The keys must be "critical", "high", "medium", "low", and "informational".
            - "findings": An array of objects. Each object represents a single finding and must have these keys:
                - "category": (string) One of the five categories listed in instruction #2.
                - "severity": (string) "Critical", "High", "Medium", "Low", or "Informational".
                - "timestamp": (string) The exact timestamp from the log if available, otherwise "N/A".
                - "title": (string) A brief, clear title for the finding.
                - "details": (string) A detailed explanation of the finding, mentioning the source filename if relevant.
                - "action": (string) A clear, actionable recommendation for this finding.

        **File Content to Analyze:**
        \`\`\`
        ${combinedContent}
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
        const jsonString = result.candidates[0].content.parts[0].text;
        return JSON.parse(jsonString);
    } else {
        if (result.promptFeedback && result.promptFeedback.blockReason) {
             throw new Error(`AI analysis blocked. Reason: ${result.promptFeedback.blockReason}`);
        }
        throw new Error("AI analysis returned no valid response.");
    }
}

/**
 * Uploads a file or URL to VirusTotal for scanning.
 * @param {File|string} data - The file object or URL string to upload.
 * @param {'file'|'url'} type - The type of data being uploaded.
 * @returns {Promise<string>} A promise that resolves to the analysis ID from VirusTotal.
 */
export async function uploadToVirusTotal(data, type) {
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

/**
 * Retrieves an analysis report from VirusTotal.
 * @param {string} id - The analysis ID to retrieve.
 * @returns {Promise<object>} A promise that resolves to the analysis report object.
 */
async function getVirusTotalAnalysisReport(id) {
    const response = await fetch(`${VT_BASE_URL}/analyses/${id}`, {
        headers: { 'x-apikey': VT_API_KEY }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to get report.');
    return data.data;
}

/**
 * Polls the VirusTotal API until a report is complete.
 * @param {string} id - The analysis ID to poll.
 * @returns {Promise<object>} A promise that resolves to the completed analysis report.
 */
export async function pollForVirusTotalReport(id) {
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
