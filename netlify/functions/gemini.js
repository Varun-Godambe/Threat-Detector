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
};
