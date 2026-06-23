const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// =========================
// 🔧 HELPER FUNCTIONS
// =========================

// 📤 Upload image to temporary hosting
const uploadImage = async (buffer) => {
    try {
        // Utiliser une API d'upload gratuite
        const formData = new FormData();
        const blob = new Blob([buffer]);
        formData.append('file', blob, 'image.jpg');
        
        const response = await axios.post('https://qu.ax/upload.php', formData, {
            headers: formData.getHeaders(),
            timeout: 30000
        });
        
        if (response.data && response.data.url) {
            return response.data.url;
        }
        throw new Error('Upload failed');
    } catch (error) {
        console.error('Upload error:', error.message);
        // Fallback: utiliser une autre API
        try {
            const formData = new FormData();
            const blob = new Blob([buffer]);
            formData.append('image', blob);
            
            const response = await axios.post('https://api.imgbb.com/1/upload?key=YOUR_API_KEY', formData, {
                headers: formData.getHeaders(),
                timeout: 30000
            });
            
            if (response.data && response.data.data && response.data.data.url) {
                return response.data.data.url;
            }
        } catch (fallbackError) {
            console.error('Fallback upload error:', fallbackError.message);
        }
        throw new Error('No upload service available');
    }
};

// 📸 Get image from message or quoted message
const getQuotedOrOwnImageUrl = async (sock, msg) => {
    // 1) Quoted image (highest priority)
    const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) {
        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return await uploadImage(buffer);
    }

    // 2) Image in the current message
    if (msg?.message?.imageMessage) {
        const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return await uploadImage(buffer);
    }

    return null;
};

// ✅ Validate URL
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

// =========================
// 📋 MAIN COMMAND
// =========================
module.exports = {
    name: 'remini',
    aliases: ['enhance', 'hd', 'upscale', 'remini-ai', 'image-hd'],
    description: 'Enhance and upscale images using AI',

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

            const helpMessage = `╭━━━━❲ *REMINI AI IMAGE ENHANCER* ❳━━━━╮
┃
┃  ✨ *Usage :*
┃  • .remini [image_url]
┃  • Reply to an image with .remini
┃  • Send image with .remini
┃
┃  💡 *Examples :*
┃  .remini https://example.com/image.jpg
┃  .remini (reply to image)
┃  .enhance (send image)
┃
┃  🎯 *Features :*
┃  • AI-powered enhancement
┃  • Upscale resolution
┃  • Improve quality
┃  • Remove artifacts
┃
┃  ⏳ *Processing time :* 30-60 seconds
┃  📦 *Max file size :* 10MB
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
                        newsletterName: '모🅒🅨🅑🅔🅡🅝🅞🅥🅐 🌟',
                        serverMessageId: 202
                    }
                }
            }, { quoted: msg });
        }

        if (msg?.key) {
            await sock.sendMessage(from, {
                react: { text: '⚡', key: msg.key }
            });
        }

        try {
            let imageUrl = null;

            // =========================
            // 🔍 CHECK FOR URL
            // =========================
            if (args.length > 0) {
                const url = args.join(' ');
                if (isValidUrl(url)) {
                    imageUrl = url;
                } else {
                    if (msg?.key) {
                        await sock.sendMessage(from, {
                            react: { text: '❌', key: msg.key }
                        });
                    }
                    return sock.sendMessage(from, {
                        text: `❌ *Invalid URL*\n\nPlease provide a valid image URL.\n\nExample: .remini https://example.com/image.jpg`
                    }, { quoted: msg });
                }
            } else {
                // =========================
                // 📸 GET IMAGE FROM MESSAGE
                // =========================

                imageUrl = await getQuotedOrOwnImageUrl(sock, msg);

                if (!imageUrl) {
                    if (msg?.key) {
                        await sock.sendMessage(from, {
                            react: { text: '❓', key: msg.key }
                        });
                    }
                    return sock.sendMessage(from, {
                        text: `╭━━━━❲ *NO IMAGE FOUND* ❳━━━━╮
┃
┃  ❌ *No image detected*
┃
┃  📌 *Usage :*
┃  • Reply to an image with .remini
┃  • Send image with .remini
┃  • .remini [image_url]
┃
┃  💡 *Example :*
┃  .remini https://example.com/image.jpg
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`
                    }, { quoted: msg });
                }
            }

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '🔄', key: msg.key }
                });
            }

            // =========================
            // 🤖 CALL REMINI API
            // =========================
            const apiUrl = `https://api.princetechn.com/api/tools/remini?apikey=prince_tech_api_azfsbshfb&url=${encodeURIComponent(imageUrl)}`;

            const response = await axios.get(apiUrl, {
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.data && response.data.success && response.data.result) {
                const result = response.data.result;

                if (result.image_url) {
                    // =========================
                    // 📥 DOWNLOAD ENHANCED IMAGE
                    // =========================
                    const imageResponse = await axios.get(result.image_url, {
                        responseType: 'arraybuffer',
                        timeout: 30000
                    });

                    if (imageResponse.status === 200 && imageResponse.data) {
                        if (msg?.key) {
                            await sock.sendMessage(from, {
                                react: { text: '✨', key: msg.key }
                            });
                        }

                        const fileSizeKB = (imageResponse.data.length / 1024).toFixed(2);
                        const fileSizeMB = (imageResponse.data.length / (1024 * 1024)).toFixed(2);
                        const sizeDisplay = fileSizeKB > 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;

                        // =========================
                        // 📤 SEND ENHANCED IMAGE
                        // =========================
                        const caption = `╭━━━━❲ *REMINI AI - ENHANCED* ❳━━━━╮
┃
┃  ✨ *Image enhanced successfully !*
┃
┃  📦 *Size :* ${sizeDisplay}
┃  📡 *AI Engine :* Remini
┃  📅 *Date :* ${new Date().toLocaleDateString()}
┃
┃  💡 *Tip :* Use .remini again
┃  to enhance more images
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

                        await sock.sendMessage(from, {
                            image: imageResponse.data,
                            caption: caption,
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

                        if (msg?.key) {
                            await sock.sendMessage(from, {
                                react: { text: '✅', key: msg.key }
                            });
                        }

                        // =========================
                        // 📊 CONFIRMATION
                        // =========================
                        await sock.sendMessage(from, {
                            text: `✅ *Enhancement complete !*\n\n📸 Image enhanced successfully with AI.\n📦 ${sizeDisplay}\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`
                        }, { quoted: msg });

                    } else {
                        throw new Error('Failed to download enhanced image');
                    }
                } else {
                    throw new Error(result.message || 'Failed to enhance image');
                }
            } else {
                throw new Error('API returned invalid response');
            }

        } catch (error) {
            console.error('[REMINI] Error:', error.message);

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '💥', key: msg.key }
                });
            }

            // =========================
            // ❌ ERROR HANDLING
            // =========================
            let errorMessage = `╭━━━━❲ *REMINI ERROR* ❳━━━━╮\n┃\n┃  ❌ *Failed to enhance image*\n┃\n`;

            if (error.response?.status === 429) {
                errorMessage += `┃  ⏰ *Rate limit exceeded*\n┃\n┃  💡 *Please try again later*\n`;
            } else if (error.response?.status === 400) {
                errorMessage += `┃  ❌ *Invalid image URL or format*\n┃\n┃  💡 *Check the image link*\n`;
            } else if (error.response?.status === 500) {
                errorMessage += `┃  🔧 *Server error*\n┃\n┃  💡 *Try again later*\n`;
            } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                errorMessage += `┃  ⏰ *Request timeout*\n┃\n┃  💡 *The server took too long*\n┃  • Try again later\n┃  • Use smaller image\n`;
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                errorMessage += `┃  🌐 *Network error*\n┃\n┃  💡 *Check your connection*\n`;
            } else if (error.message.includes('Upload failed') || error.message.includes('No upload service')) {
                errorMessage += `┃  📤 *Upload service error*\n┃\n┃  💡 *Try again with a URL*\n`;
            } else if (error.message.includes('No image found') || error.message.includes('No image detected')) {
                errorMessage += `┃  📸 *No image detected*\n┃\n┃  💡 *Reply to an image with .remini*\n`;
            } else {
                errorMessage += `┃  📝 *Error :* ${error.message.substring(0, 50)}\n┃\n┃  💡 *Try again in a few minutes*\n`;
            }

            errorMessage += `┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`;

            await sock.sendMessage(from, {
                text: errorMessage
            }, { quoted: msg });
        }
    }
};
