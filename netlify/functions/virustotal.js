// This is your serverless function running on Netlify's backend.
// It acts as a secure proxy to VirusTotal.

const fetch = require('node-fetch');
const FormData = require('form-data');

// The API key is securely accessed from the environment variables set in the Netlify UI.
const VT_API_KEY = process.env.VT_API_KEY;
const VT_BASE_URL = 'https://www.virustotal.com/api/v3';

exports.handler = async (event) => {
    // The endpoint path will determine what action to take.
    // e.g., /.netlify/functions/virustotal/files for file scan
    // e.g., /.netlify/functions/virustotal/analyses/some-id for report
    const endpoint = event.path.replace('/.netlify/functions/virustotal', '');
    const fullUrl = `${VT_BASE_URL}${endpoint}`;

    try {
        let response;
        if (event.httpMethod === 'POST') {
            // Handle file or URL submissions
            const form = new FormData();
            // The body will be a base64 encoded string from the frontend
            const body = JSON.parse(event.body);

            if (body.file) { // File upload
                const buffer = Buffer.from(body.file, 'base64');
                form.append('file', buffer, { filename: body.fileName });
            } else if (body.url) { // URL scan
                 form.append('url', body.url);
            }

            response = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'x-apikey': VT_API_KEY },
                body: form
            });
        } else { // GET request for analysis reports
            response = await fetch(fullUrl, {
                headers: { 'x-apikey': VT_API_KEY }
            });
        }

        const data = await response.json();

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: data.error?.message || 'VirusTotal API error' })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
