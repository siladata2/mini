// commands/download.js
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Temporary directory
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

module.exports = {
    name: 'download',
    aliases: ['dl', 'save', 'get'],
    description: 'Download media from social networks',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;
        const userUrl = args[0];

        if (!from) {
            console.error('JID not available');
            return;
        }

        // ─── Help ──────────────────────────────────────────────
        if (args.length === 0 || args[0].toLowerCase() === 'help') {
            if (msg?.key) await sock.sendMessage(from, { react: { text: '📋', key: msg.key } });
            return sock.sendMessage(from, {
                text: `╭━━━━❲ *DOWNLOAD MEDIA* ❳━━━━╮
┃
┃  💡 *Usage :*
┃  .download [URL]
┃
┃  🌐 *Supported platforms :*
┃  YouTube, Facebook, Instagram, TikTok, Twitter, Reddit,
┃  Pinterest, LinkedIn, SoundCloud, and 20+ more.
┃
┃  ✨ *Example :*
┃  .download https://www.youtube.com/watch?v=xxxxx
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
━━━━━━━━━━━━━━━
_©CybernovA_`,
                contextInfo: {
                    mentionedJid: [from],
                    forwardingScore: 540,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 202
                    }
                }
            }, { quoted: msg });
        }

        if (!userUrl || !userUrl.startsWith('http')) {
            if (msg?.key) await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
            return sock.sendMessage(from, { text: '❌ *Invalid URL*\nPlease provide a valid URL to download.' }, { quoted: msg });
        }

        // ─── Start download ────────────────────────────────────
        if (msg?.key) await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

        let downloadUrl = null;
        let mediaBuffer = null;
        let mimeType = 'video/mp4';
        let fileName = 'media.mp4';

        try {
            // ── 1. Try 4hub.app API ──────────────────────────
            const apiUrl = 'https://4hub.app/api/v1/download';
            const formData = new FormData();
            formData.append('url', userUrl);

            const response = await axios.post(apiUrl, formData, {
                headers: { ...formData.getHeaders() },
                timeout: 30000,
            });

            if (response.data?.downloadUrl) {
                downloadUrl = response.data.downloadUrl;
                mimeType = response.data.mimeType || 'video/mp4';
                fileName = response.data.filename || 'media.mp4';
            } else {
                throw new Error('No download link from 4hub');
            }

            // ── 2. Fallback: Generic API (example) ────────────
            if (!downloadUrl) {
                const fallbackApi = 'https://api.general-downloader.com/download';
                const formData2 = new FormData();
                formData2.append('url', userUrl);
                const response2 = await axios.post(fallbackApi, formData2, {
                    headers: { ...formData2.getHeaders() },
                    timeout: 30000,
                });
                if (response2.data?.url) {
                    downloadUrl = response2.data.url;
                    mimeType = response2.data.mimeType || 'video/mp4';
                } else {
                    throw new Error('No download link from fallback API');
                }
            }

            // ── 3. Download the media ──────────────────────────
            const mediaResponse = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
            });
            mediaBuffer = Buffer.from(mediaResponse.data);

            if (!mediaBuffer || mediaBuffer.length < 1000) {
                throw new Error('Downloaded file is too small');
            }

            // ── 4. Send media ──────────────────────────────────
            const isVideo = mimeType.startsWith('video/');
            const isAudio = mimeType.startsWith('audio/');
            const isImage = mimeType.startsWith('image/');

            if (isVideo) {
                await sock.sendMessage(from, {
                    video: mediaBuffer,
                    mimetype: mimeType,
                    caption: `✅ *Media downloaded*`,
                    contextInfo: {
                        mentionedJid: [from],
                        forwardingScore: 540,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202
                        }
                    }
                });
            } else if (isAudio) {
                await sock.sendMessage(from, {
                    audio: mediaBuffer,
                    mimetype: mimeType,
                    ptt: false,
                    contextInfo: {
                        mentionedJid: [from],
                        forwardingScore: 540,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202
                        }
                    }
                });
            } else if (isImage) {
                await sock.sendMessage(from, {
                    image: mediaBuffer,
                    caption: `✅ *Image downloaded*`,
                    contextInfo: {
                        mentionedJid: [from],
                        forwardingScore: 540,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202
                        }
                    }
                });
            } else {
                await sock.sendMessage(from, {
                    document: mediaBuffer,
                    mimetype: mimeType,
                    fileName: fileName,
                    contextInfo: {
                        mentionedJid: [from],
                        forwardingScore: 540,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363425394543602@newsletter',
                            newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                            serverMessageId: 202
                        }
                    }
                });
            }

            if (msg?.key) await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('Download error:', error.message);
            if (msg?.key) await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(from, {
                text: `╭━━━━❲ *DOWNLOAD FAILED* ❳━━━━╮
┃
┃  ❌ Could not download media.
┃
┃  💡 *Possible reasons :*
┃  • Unsupported or private content
┃  • Service unavailable (try again later)
┃  • Invalid URL
┃
┃  📌 *Try a different URL or platform.*
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
━━━━━━━━━━━━━━━
_©CybernovA_`
            }, { quoted: msg });
        }
    }
};
