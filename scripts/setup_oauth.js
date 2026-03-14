const { google } = require('googleapis');
const readline = require('readline');

// Este script ayuda a generar el Refresh Token necesario para que MartaBot
// actúe en tu nombre y pueda acceder a los archivos de la organización.

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents'
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}

async function main() {
    console.log('\n=== Configuración de Acceso para MartaBot ===\n');
    console.log('Necesitamos autorizar a la aplicación una única vez.\n');

    const clientId = await ask('1. Pega tu Client ID: ');
    const clientSecret = await ask('2. Pega tu Client Secret: ');
    const redirectUri = 'http://localhost:3000'; // Debe coincidir exactamente con lo puesto en Google Console

    if (!clientId || !clientSecret) {
        console.error('Error: Faltan credenciales.');
        process.exit(1);
    }

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial para obtener Refresh Token
        scope: SCOPES,
        prompt: 'consent select_account' // Fuerza a mostrar selector de cuenta y consentimiento
    });

    console.log('\n3. Abre este link en tu navegador (logueate con tu cuenta de trabajo):\n');
    console.log(authUrl);
    console.log('\nUna vez autorizado, Google intentará redirigirte a localhost:3000 con un error, pero el LINK en la barra de direcciones tendrá un código.');
    console.log('Busca ?code=... en la URL.');

    const code = await ask('\n4. Pega el código completo aquí (todo lo que está después de code=): ');

    try {
        const { tokens } = await oauth2Client.getToken(code);

        console.log('\n¡ÉXITO! Aquí están tus nuevas credenciales para .env.local:\n');
        console.log('---------------------------------------------------');
        console.log(`GOOGLE_CLIENT_ID=${clientId}`);
        console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('---------------------------------------------------');
        console.log('\nCopia estas 3 líneas y reemplaza las de Service Account en tu archivo .env.local');

    } catch (error) {
        console.error('\nError obteniendo el token:', error.message);
    } finally {
        rl.close();
    }
}

main();
