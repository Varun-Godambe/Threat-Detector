// This is a dedicated serverless function for handling requests to the Gemini API.
// It keeps the Gemini logic separate and secures the API key.

const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { combinedContent } = JSON.parse(event.body);
        if (!combinedContent) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No content provided.' }) };
        }

        const prompt = `
            You are a senior cybersecurity analyst following best practices from NIST SP 800-92, the Australian Cyber Security Centre (ACSC), and the OWASP Logging Cheat Sheet. Your task is to analyze the following log data or configuration files and return your findings in a structured JSON format.

            **Instructions:**
            1.  Thoroughly review the provided text content. Correlate events across files if possible.
            2.  Identify security issues, anomalies, and notable events. Look for a wide range of issues including, but not limited to: input validation failures, authorization failures, session management anomalies, repeated failed logins, unauthorized access attempts, hardcoded secrets, overly permissive rules, SQL injection patterns, repelled attacks, or other notable behavioral anomalies.
            3.  Categorize each finding into one of the following: "Authentication and Access", "Network Activity", "System and Application Events", "Configuration and Policy", or "Behavioral Anomaly".
            4.  Structure your response as a single JSON object. Do not include any text or markdown formatting before or after the JSON object.
            5.  The JSON object must have a key "analysisResult".
            6.  If the files are completely benign and contain no security issues or notable events, the value of "analysisResult" should be the string "No security issues or notable events found.".
            7.  If you find issues or notable events, the value of "analysisResult" should be an object with two keys: "summaryStats" and "findings".
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
                temperature: 0.1
            }
        };

        const geminiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
            throw new Error(data.error?.message || `AI analysis failed with status: ${geminiResponse.status}`);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Gemini function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};// This function calls the abuseipdb function to enrich findings.

const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Helper to call our own AbuseIPDB function
async function getIpReputation(ipAddress, event) {
    try {
        // Construct the full URL to the function, whether local or deployed
        const functionUrl = `${event.headers.host.includes('localhost') ? 'http' : 'https'}://${event.headers.host}/.netlify/functions/abuseipdb`;
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            body: JSON.stringify({ ipAddress })
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`Error fetching reputation for IP ${ipAddress}:`, error);
        return null;
    }
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { combinedContent } = JSON.parse(event.body);
        if (!combinedContent) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No content provided.' }) };
        }

        const prompt = `
            You are a senior cybersecurity analyst. Your primary task is to analyze the provided log data and extract key indicators.

            **Instructions:**
            1.  Read the log data and identify all unique IP addresses.
            2.  Return a single JSON object with one key: "ips". The value should be an array of strings, where each string is a unique IP address found in the logs.
            3.  Do not return any other text, formatting, or explanations.

            **Log Data to Analyze:**
            \`\`\`
            ${combinedContent}
            \`\`\`
        `;

        const extractionPayload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.0 }
        };

        const extractionResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(extractionPayload)
        });

        const extractionResult = await extractionResponse.json();
        const extractedData = JSON.parse(extractionResult.candidates[0].content.parts[0].text);
        const uniqueIps = extractedData.ips || [];

        let enrichedContent = combinedContent;
        if (uniqueIps.length > 0) {
            enrichedContent += "\n\n--- THREAT INTELLIGENCE ENRICHMENT ---\n";
            for (const ip of uniqueIps) {
                const reputation = await getIpReputation(ip, event);
                if (reputation) {
                    enrichedContent += `Reputation for ${ip}: Country=${reputation.countryCode}, ISP=${reputation.isp}, AbuseScore=${reputation.abuseConfidenceScore}%\n`;
                }
            }
        }

        const analysisPrompt = `
            You are a senior cybersecurity analyst following best practices from NIST, ACSC, and OWASP. Analyze the following log data, which includes threat intelligence enrichment, and return your findings in a structured JSON format.

            **Instructions:**
            1.  Review the combined log and threat intelligence data.
            2.  Identify security issues, anomalies, and notable events.
            3.  Categorize each finding into one of: "Authentication and Access", "Network Activity", "System and Application Events", "Configuration and Policy", or "Behavioral Anomaly".
            4.  Structure your response as a single JSON object with a key "analysisResult".
            5.  If the content is benign, the value should be "No security issues or notable events found.".
            6.  If issues are found, the value should be an object with keys "summaryStats" and "findings".
                - "summaryStats": An object counting findings by severity ("critical", "high", "medium", "low", "informational").
                - "findings": An array of objects, each with keys: "category", "severity", "timestamp", "title", "details", and "action".

            **Content to Analyze:**
            \`\`\`
            ${enrichedContent}
            \`\`\`
        `;

        const analysisPayload = {
            contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        };

        const analysisResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisPayload)
        });

        const data = await analysisResponse.json();

        if (!analysisResponse.ok) {
            throw new Error(data.error?.message || `AI analysis failed with status: ${analysisResponse.status}`);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Gemini function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
