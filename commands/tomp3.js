const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execPromise = util.promisify(exec);
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// =========================
// 🔥 CONVERSION PROVIDERS (FALLBACK)
// =========================
const CONVERT_PROVIDERS = [
    {
        id: 1,
        name: 'FFmpeg (Local)',
        description: 'Local conversion using FFmpeg',
        convert: async (inputPath, outputPath) => {
            const command = `ffmpeg -i "${inputPath}" -vn -acodec mp3 -ab 192k -ar 44100 "${outputPath}"`;
            await execPromise(command);
            return outputPath;
        }
    },
    {
        id: 2,
        name: 'Online Converter',
        description: 'API online conversion (fallback)',
        convert: async (inputPath, outputPath) => {
            // Utiliser une API en ligne gratuite
            const formData = new FormData();
            const fileBuffer = fs.readFileSync(inputPath);
            const blob = new Blob([fileBuffer]);
            formData.append('file', blob, 'video.mp4');
            formData.append('format', 'mp3');
            
            const response = await axios.post('https://api.online-convert.com/api/v1/convert', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Accept': 'application/json'
                },
                timeout: 60000
            });
            
            if (response.data && response.data.url) {
                const audioResponse = await axios.get(response.data.url, {
                    responseType: 'arraybuffer',
                    timeout: 60000
                });
                fs.writeFileSync(outputPath, Buffer.from(audioResponse.data));
                return outputPath;
            }
            throw new Error('Online conversion failed');
        }
    },
    {
        id: 3,
        name: 'CloudConvert',
        description: 'Cloud conversion (backup)',
        convert: async (inputPath, outputPath) => {
            // API CloudConvert gratuite (limité)
            const apiKey = 'YOUR_API_KEY'; // Si vous avez une clé
            if (!apiKey || apiKey === 'YOUR_API_KEY') {
                throw new Error('No API key available');
            }
            
            const formData = new FormData();
            const fileBuffer = fs.readFileSync(inputPath);
            const blob = new Blob([fileBuffer]);
            formData.append('file', blob, 'video.mp4');
            formData.append('outputformat', 'mp3');
            
            const response = await axios.post('https://api.cloudconvert.com/v2/convert', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 60000
            });
            
            if (response.data && response.data.url) {
                const audioResponse = await axios.get(response.data.url, {
                    responseType: 'arraybuffer',
                    timeout: 60000
                });
                fs.writeFileSync(outputPath, Buffer.from(audioResponse.data));
                return outputPath;
            }
            throw new Error('CloudConvert failed');
        }
    }
];

// =========================
// 🔍 CONVERT FUNCTION WITH FALLBACK
// =========================
const convertVideoToAudio = async (inputPath, outputPath) => {
    for (const provider of CONVERT_PROVIDERS) {
        try {
            console.log(`🎵 Trying ${provider.name}...`);
            await provider.convert(inputPath, outputPath);
            
            // Vérifier que le fichier existe et a une taille > 0
            if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
                return { outputPath, provider: provider.name };
            }
        } catch (err) {
            console.log(`❌ ${provider.name} failed:`, err.message);
            continue;
        }
    }
    throw new Error('All conversion methods failed');
};

// =========================
// MAIN COMMAND
// =========================
module.exports = {
    name: 'toaudio',
    aliases: ['toa', 'mp3', 'convert', 'audio', 'extract'],
    description: 'Convert video to MP3 audio',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;

        if (!from) {
            console.error('❌ JID not available');
            return;
        }

        // =========================
        // 📋 SHOW HELP
        // =========================
        if (args.length === 0 || args[0].toLowerCase() === 'help') {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '📋', key: msg.key }
                });
            }

            const helpMessage = `╭━━━━❲ *VIDEO TO MP3* ❳━━━━╮
┃
┃  🎵 *Usage :*
┃  Reply to a video with .toaudio
┃
┃  💡 *Examples :*
┃  .toaudio
┃  .toa (reply to video)
┃  .mp3 (reply to video)
┃
┃  📦 *Features :*
┃  • Extracts audio from video
┃  • Converts to MP3 format
┃  • High quality (192kbps)
┃  • Automatic fallback
┃
┃  ⚠️ *Max file size :* 50MB
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            return sock.sendMessage(from, {
                text: helpMessage,
                contextInfo: {
                    mentionedJid: [from],
                    forwardingScore: 540,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: 'CybernovA',
                        serverMessageId: 195
                    }
                }
            }, { quoted: msg });
        }

        // =========================
        // 📹 GET VIDEO
        // =========================
        const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let videoMessage = quoted?.videoMessage || msg?.message?.videoMessage;

        if (!videoMessage) {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '❓', key: msg.key }
                });
            }
            return sock.sendMessage(from, {
                text: '❌ *No video found*\n\nPlease reply to a video with .toaudio'
            }, { quoted: msg });
        }

        // Vérifier la taille
        const fileSize = videoMessage.fileLength || 0;
        if (fileSize > 50 * 1024 * 1024) {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '⚠️', key: msg.key }
                });
            }
            return sock.sendMessage(from, {
                text: '❌ *File too large*\n\nMaximum size: 50MB'
            }, { quoted: msg });
        }

        if (msg?.key) {
            await sock.sendMessage(from, {
                react: { text: '📥', key: msg.key }
            });
        }

        await sock.sendMessage(from, {
            text: '📥 *Downloading video...*\n⏳ Please wait...'
        }, { quoted: msg });

        let inputPath = null;
        let outputPath = null;

        try {
            // =========================
            // 📥 DOWNLOAD VIDEO
            // =========================
            const stream = await downloadContentFromMessage(videoMessage, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const timestamp = Date.now();
            inputPath = path.join(TEMP_DIR, `video_${timestamp}.mp4`);
            fs.writeFileSync(inputPath, buffer);

            const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
            await sock.sendMessage(from, {
                text: `🔄 *Converting to MP3...*\n📦 Size: ${fileSizeMB}MB\n⏳ This may take a few moments...`
            }, { quoted: msg });

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '🔄', key: msg.key }
                });
            }

            // =========================
            // 🎵 CONVERT VIDEO TO AUDIO
            // =========================
            outputPath = path.join(TEMP_DIR, `audio_${timestamp}.mp3`);
            const result = await convertVideoToAudio(inputPath, outputPath);

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '✅', key: msg.key }
                });
            }

            // =========================
            // 📤 SEND AUDIO
            // =========================
            const audioBuffer = fs.readFileSync(outputPath);
            const audioSizeKB = (audioBuffer.length / 1024).toFixed(2);
            const audioSizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);
            const sizeDisplay = audioSizeKB > 1024 ? `${audioSizeMB}MB` : `${audioSizeKB}KB`;

            const duration = videoMessage.seconds || 0;
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            const durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            const caption = `🎵 *Audio extracted !*\n\n📝 *Duration :* ${durationDisplay}\n📦 *Size :* ${sizeDisplay}\n📡 *Method :* ${result.provider}\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`;

            // Envoyer comme MP3 normal (pas voice message)
            await sock.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                caption: caption,
                contextInfo: {
                    mentionedJid: [from],
                    forwardingScore: 540,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363425394543602@newsletter',
                        newsletterName: 'CybernovA',
                        serverMessageId: 195
                    }
                }
            });

            // Message de confirmation
            const summary = `╭━━━━❲ *CONVERSION COMPLETE* ❳━━━━╮
┃
┃  ✅ *Video converted to MP3*
┃
┃  📝 *Duration :* ${durationDisplay}
┃  📦 *Size :* ${sizeDisplay}
┃  📡 *Method :* ${result.provider}
┃
┃  💡 *Tip :* Use .tts to generate
┃  speech from text
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            await sock.sendMessage(from, {
                text: summary
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Conversion Error:', error);

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '💥', key: msg.key }
                });
            }

            let errorMsg = `╭━━━━❲ *CONVERSION ERROR* ❳━━━━╮\n┃\n┃  ❌ *Unable to convert video*\n┃\n`;
            
            if (error.message.includes('FFmpeg') || error.message.includes('ffmpeg')) {
                errorMsg += `┃  📝 *FFmpeg not installed*\n┃\n┃  💡 *Install FFmpeg :*\n┃  • apt-get install ffmpeg\n┃  • pkg install ffmpeg\n`;
            } else {
                errorMsg += `┃  📝 *Error :* ${error.message.substring(0, 50)}\n┃\n┃  💡 *Solutions :*\n┃  • Try again in a few minutes\n┃  • Use a shorter video\n┃  • Check video format\n`;
            }
            
            errorMsg += `┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`;

            await sock.sendMessage(from, {
                text: errorMsg
            }, { quoted: msg });

        } finally {
            // Nettoyer les fichiers temporaires
            if (inputPath && fs.existsSync(inputPath)) {
                try { fs.unlinkSync(inputPath); } catch (e) {}
            }
            if (outputPath && fs.existsSync(outputPath)) {
                try { fs.unlinkSync(outputPath); } catch (e) {}
            }
        }
    }
};
