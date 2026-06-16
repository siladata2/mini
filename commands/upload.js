const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 📁 Dossier temporaire
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ✅ Service 1 : Quax (gratuit, fiable)
const uploadToQuax = async (filePath) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const res = await axios.post('https://qu.ax/upload.php', form, {
        headers: form.getHeaders(),
        timeout: 60000
    });

    if (res.data && res.data.url) {
        return res.data.url;
    }
    throw new Error('Quax upload failed');
};

// ✅ Service 2 : Litterbox (catbox alternatif)
const uploadToLitterbox = async (filePath) => {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('time', '1h');
    form.append('fileToUpload', fs.createReadStream(filePath));

    const res = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', form, {
        headers: form.getHeaders(),
        timeout: 60000
    });

    if (res.data && !res.data.includes('error')) {
        return res.data.trim();
    }
    throw new Error('Litterbox upload failed');
};

// ✅ Service 3 : Uguu (gratuit, simple)
const uploadToUguu = async (filePath) => {
    const form = new FormData();
    form.append('files[]', fs.createReadStream(filePath));

    const res = await axios.post('https://uguu.se/upload.php', form, {
        headers: form.getHeaders(),
        timeout: 60000
    });

    if (res.data && res.data.files && res.data.files[0]) {
        return res.data.files[0].url;
    }
    throw new Error('Uguu upload failed');
};

// ✅ Service 4 : File.io (gratuit, avec expiration)
const uploadToFileIO = async (filePath) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const res = await axios.post('https://file.io/', form, {
        headers: form.getHeaders(),
        timeout: 60000
    });

    if (res.data && res.data.success && res.data.link) {
        return res.data.link;
    }
    throw new Error('File.io upload failed');
};

// ✅ Service 5 : 0x0.st (très fiable)
const uploadTo0x0 = async (filePath) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const res = await axios.post('https://0x0.st/', form, {
        headers: form.getHeaders(),
        timeout: 60000
    });

    if (res.data && typeof res.data === 'string') {
        return res.data.trim();
    }
    throw new Error('0x0.st upload failed');
};

// ✅ Service 6 : Bashupload (simple)
const uploadToBashupload = async (filePath) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const res = await axios.post('https://bashupload.com/', form, {
        headers: form.getHeaders(),
        timeout: 60000
    });

    const match = res.data.match(/https?:\/\/[^\s"]+/);
    if (match) {
        return match[0];
    }
    throw new Error('Bashupload upload failed');
};

// ✅ Service 7 : Tmpfiles (gratuit)
const uploadToTmpfiles = async (filePath) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
        headers: form.getHeaders(),
        timeout: 60000
    });

    if (res.data && res.data.data && res.data.data.url) {
        return res.data.data.url;
    }
    throw new Error('Tmpfiles upload failed');
};

// ✅ Service 8 : Freeimage.host (images uniquement)
const uploadToFreeimage = async (filePath, isImage = true) => {
    if (!isImage) throw new Error('Service pour images uniquement');

    const form = new FormData();
    form.append('source', fs.createReadStream(filePath));
    form.append('type', 'file');
    form.append('action', 'upload');
    form.append('timestamp', Math.floor(Date.now() / 1000).toString());

    const res = await axios.post('https://freeimage.host/json', form, {
        headers: form.getHeaders(),
        timeout: 60000
    });

    if (res.data && res.data.image && res.data.image.url) {
        return res.data.image.url;
    }
    throw new Error('Freeimage upload failed');
};

// ✅ Fonction principale avec fallback automatique
const uploadFile = async (filePath, isImage = false) => {
    const services = [
        { name: 'Quax', fn: uploadToQuax },
        { name: '0x0.st', fn: uploadTo0x0 },
        { name: 'Uguu', fn: uploadToUguu },
        { name: 'Litterbox', fn: uploadToLitterbox },
        { name: 'Tmpfiles', fn: uploadToTmpfiles },
        { name: 'File.io', fn: uploadToFileIO },
        { name: 'Bashupload', fn: uploadToBashupload }
    ];

    if (isImage) {
        services.unshift({ name: 'Freeimage', fn: uploadToFreeimage });
    }

    for (const service of services) {
        try {
            console.log(`📤 Tentative upload vers ${service.name}...`);
            const url = await service.fn(filePath);
            console.log(`✅ Upload réussi vers ${service.name}`);
            return { url, service: service.name };
        } catch (err) {
            console.log(`❌ Échec ${service.name}:`, err.message);
            continue;
        }
    }

    throw new Error('Tous les services d\'upload ont échoué');
};

module.exports = {
    name: 'upload',
    aliases: ['up', 'file', 'lien'],
    description: 'Upload un fichier et donne un lien',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;
        let tempFilePath = null;

        if (!from) {
            console.error('❌ JID non disponible');
            return;
        }

        try {
            const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                if (msg?.key) {
                    await sock.sendMessage(from, {
                        react: { text: "❓", key: msg.key }
                    });
                }
                return sock.sendMessage(from, {
                    text: '❌\n*Exemple:*\n`.upload & reply with media`)\n\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                }, { quoted: msg });
            }

            if (msg?.key) {
                await sock.sendMessage(from, { react: { text: '⚡', key: msg.key } });
            }

            // Déterminer le type de média
            let messageType = null;
            let mediaMessage = null;
            let isImage = false;
            let mediaName = '';

            if (quoted.imageMessage) {
                messageType = 'imageMessage';
                mediaMessage = quoted.imageMessage;
                isImage = true;
                mediaName = '📷 Image';
            } else if (quoted.videoMessage) {
                messageType = 'videoMessage';
                mediaMessage = quoted.videoMessage;
                mediaName = '🎬 Vidéo';
            } else if (quoted.documentMessage) {
                messageType = 'documentMessage';
                mediaMessage = quoted.documentMessage;
                mediaName = `📄 ${mediaMessage.fileName || 'Document'}`;
            } else if (quoted.audioMessage) {
                messageType = 'audioMessage';
                mediaMessage = quoted.audioMessage;
                mediaName = '🎵 Audio';
            } else {
                return sock.sendMessage(from, {
                    text: '❌ *Type not supported*\n\nFormats :\n• Image 📷\n• Vidéo 🎬\n• Document 📄\n• Audio 🎵\n\n━━━━━━━━━━━━━━━\n_©CybernovA_'
                }, { quoted: msg });
            }

            // Télécharger le média
            const stream = await downloadContentFromMessage(mediaMessage, messageType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Déterminer l'extension
            let extension = 'bin';
            if (messageType === 'imageMessage') extension = 'jpg';
            else if (messageType === 'videoMessage') extension = mediaMessage.mimetype?.split('/')[1] || 'mp4';
            else if (messageType === 'documentMessage') extension = mediaMessage.fileName?.split('.').pop() || 'bin';
            else if (messageType === 'audioMessage') extension = mediaMessage.mimetype?.split('/')[1] || 'mp3';

            // Sauvegarde temporaire
            tempFilePath = path.join(TEMP_DIR, `upload_${Date.now()}.${extension}`);
            fs.writeFileSync(tempFilePath, buffer);

            if (msg?.key) {
                await sock.sendMessage(from, { react: { text: '🕒', key: msg.key } });
            }

            const fileSizeKB = (buffer.length / 1024).toFixed(2);
            const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
            const sizeDisplay = fileSizeKB > 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;

            // Upload avec fallback automatique
            const result = await uploadFile(tempFilePath, isImage);

            if (msg?.key) {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            }

            // Style Cybernova
            const messageText = `╭━━━━❲ *UPLOAD - SUCCÈS* ❳━━━━╮
┃
┃  📁 *File :* ${mediaName}
┃  📦 *Size :* ${sizeDisplay}
┃  ☁️ *Service :* ${result.service}
┃  🔗 *Link :*
┃  ${result.url}
┃
┃  📊 *Statistics :*
┃  •  ${new Date().toLocaleDateString()}
┃  •  ${new Date().toLocaleTimeString()}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

_©CybernovA_`;

            await sock.sendMessage(from, {
                text: messageText,
                contextInfo: {
                    mentionedJid: [from],
                    forwardingScore: 540,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 195
                    }
                }
            }, { quoted: msg });

        } catch (err) {
            console.error('❌ UPLOAD ERROR:', err);

            try {
                if (msg?.key) {
                    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
                }
            } catch (e) {}

            let errorMessage = `╭━━━━❲ *ERREUR UPLOAD* ❳━━━━╮
┃
┃  ❌ *Érror upload*
┃
`;

            if (err.message.includes('Tous les services')) {
                errorMessage += `┃  🌐 *All services unavailable*
┃
┃
┃  💡 *Solutions :*
┃  • Retry after 5 minutes
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

_©CybernovA_`;
            } else {
                errorMessage += `┃  📝 *Errorr :* ${err.message.substring(0, 100)}
┃
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;
            }

            await sock.sendMessage(from, { text: errorMessage }, { quoted: msg });

        } finally {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (e) {}
            }
        }
    }
};
