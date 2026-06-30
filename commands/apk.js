// ./commands/apk.js

const axios = require('axios');

module.exports = {
    name: 'apk',
    aliases: ['app', 'apkdl', 'getapp'],
    category: 'downloader',

    async execute({ sock, msg, args, jid }) {
        const appName = args.join(' ');

        if (!appName || appName.trim().length < 2) {
            return sock.sendMessage(jid, {
                text:
                    '📱 *APK Downloader*\n\n' +
                    '⚡ *Usage:*\n' +
                    '.apk <app name>\n\n' +
                    '✨ *Examples:*\n' +
                    '.apk WhatsApp\n' +
                    '.apk Instagram\n' +
                    '.apk Telegram\n' +
                    '.apk Spotify\n\n' +
                    '💡 Searches and downloads Android apps.',
                contextInfo: {
                    forwardingScore: 350,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 202,
                    },
                },
            }, { quoted: msg });
        }

        try { await sock.sendMessage(jid, { react: { text: '📱', key: msg.key } }); } catch (_) {}

        try {
            const { data } = await axios.get(
                `https://api.giftedtech.co.ke/api/download/apkdl?apikey=gifted&appName=${encodeURIComponent(appName)}`,
                { timeout: 60000 }
            );

            // ── Extract data ──
            const appTitle = data?.title || data?.result?.title || data?.name || appName;
            const appVersion = data?.version || data?.result?.version || '';
            const appSize = data?.size || data?.result?.size || '';
            const appIcon = data?.icon || data?.result?.icon || data?.image || '';
            const downloadUrl = data?.download_url || data?.result?.download_url || data?.url || data?.link || '';
            const description = data?.description || data?.result?.description || '';

            if (!downloadUrl) throw new Error('No download link found');

            // ── Download APK ──
            try { await sock.sendMessage(jid, { react: { text: '⬇️', key: msg.key } }); } catch (_) {}

            const apkRes = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxRedirects: 5,
            });

            const buffer = Buffer.from(apkRes.data);
            const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

            // ── Send APK ──
            const safeFileName = appTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);

            await sock.sendMessage(jid, {
                document: buffer,
                mimetype: 'application/vnd.android.package-archive',
                fileName: `${safeFileName}.apk`,
                caption:
                    '📱 *APK Downloaded*\n\n' +
                    `📌 *App:* ${appTitle}\n` +
                    (appVersion ? `📊 *Version:* ${appVersion}\n` : '') +
                    `📦 *Size:* ${sizeMB} MB\n` +
                    (appSize ? `📏 *Original:* ${appSize}\n` : '') +
                    (description ? `📝 *Desc:* ${description.substring(0, 200)}\n` : '') +
                    '\n⚡ _Downloaded by Zenitsu_',
                contextInfo: {
                    forwardingScore: 350,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 202,
                    },
                },
            }, { quoted: msg });

            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error('❌ apk error:', err.message);
            try { await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } }); } catch (_) {}

            await sock.sendMessage(jid, {
                text:
                    '❌ *Download Failed*\n\n' +
                    `App "${appName}" not found or service unavailable.\n\n` +
                    '⚡ Try a different app name.',
                contextInfo: {
                    forwardingScore: 350,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 202,
                    },
                },
            }, { quoted: msg });
        }
    },
};
