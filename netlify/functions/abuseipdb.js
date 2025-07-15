// This function securely queries the AbuseIPDB API for IP reputation data.

const fetch = require('node-fetch');

const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { ipAddress } = JSON.parse(event.body);
        if (!ipAddress) {
            return { statusCode: 400, body: JSON.stringify({ error: 'IP address is required.' }) };
        }

        const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ipAddress}&maxAgeInDays=90`, {
            headers: {
                'Accept': 'application/json',
                'Key': ABUSEIPDB_API_KEY
            }
        });
        
        const data = await response.json();

        if (!response.ok) {
            // AbuseIPDB might return errors in a specific format
            const errorMessage = data.errors ? data.errors[0].detail : 'AbuseIPDB API error';
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorMessage })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data.data) // Return only the 'data' part of the response
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
