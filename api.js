// --- api.js ---
// This module now communicates with our own secure serverless functions
// for ALL external API calls, ensuring no keys are exposed to the browser.

const VT_PROXY_URL = '/.netlify/functions/virustotal';
const GEMINI_PROXY_URL = '/.netlify/functions/gemini';

/**
 * Converts a file to a base64 encoded string.
 * @param {File} file - The file to convert.
 * @returns {Promise<string>} A promise that resolves to the base64 string.
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Remove the data: prefix
        reader.onerror = error => reject(error);
    });
}

/**
 * Sends anonymized log content to our secure Gemini proxy function.
 * @param {string} anonymizedContent - The pre-sanitized log content.
 * @returns {Promise<object>} A promise that resolves to the structured JSON analysis from the AI.
 */
export async function runAiAnalysis(anonymizedContent) {
    const response = await fetch(GEMINI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymizedContent })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'AI analysis failed.');
    }

    if (result.candidates && result.candidates.length > 0) {
        const jsonString = result.candidates[0].content.parts[0].text;
        return JSON.parse(jsonString);
    } else {
        if (result.promptFeedback && result.promptFeedback.blockReason) {
             throw new Error(`AI analysis blocked by safety settings. Reason: ${result.promptFeedback.blockReason}`);
        }
        throw new Error("AI analysis returned no valid response.");
    }
}


/**
 * Uploads a file or URL to our secure VirusTotal proxy function.
 * @param {File|string} data - The file object or URL string to upload.
 * @param {'file'|'url'} type - The type of data being uploaded.
 * @returns {Promise<string>} A promise that resolves to the analysis ID from VirusTotal.
 */
export async function uploadToVirusTotal(data, type) {
    let endpoint, payload;

    if (type === 'file') {
        endpoint = `${VT_PROXY_URL}/files`;
        const base64File = await fileToBase64(data);
        payload = {
            file: base64File,
            fileName: data.name
        };
    } else { // url
        endpoint = `${VT_PROXY_URL}/urls`;
        payload = { url: data };
    }
    
    const response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    
    const responseData = await response.json();
    if (!response.ok) throw new Error(responseData.error || `${type} submission failed.`);
    return responseData.data.id;
}


/**
 * Retrieves an analysis report by calling our secure VirusTotal proxy function.
 * @param {string} id - The analysis ID to retrieve.
 * @returns {Promise<object>} A promise that resolves to the analysis report object.
 */
async function getVirusTotalAnalysisReport(id) {
    const response = await fetch(`${VT_PROXY_URL}/analyses/${id}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get report.');
    return data.data;
}


/**
 * Polls our secure VirusTotal proxy function until a report is complete.
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
