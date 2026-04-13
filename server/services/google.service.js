const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; 
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FOLDER_BASE_ID = process.env.GOOGLE_FOLDER_BASE_ID;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

module.exports = { drive, calendar, FOLDER_BASE_ID };