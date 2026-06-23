
const axios = require('axios');

module.exports = {
    name: 'spotify',
    aliases: ['sp', 'spotifydl', 'spdl', 'musicdl'],
    description: 'Download music from Spotify',

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

            const helpMessage = `╭━━━━❲ *SPOTIFY DOWNLOADER* ❳━━━━╮
┃
┃  🎵 *Usage :*
┃  .spotify [song/artist/keywords]
┃
┃  💡 *Examples :*
┃  .spotify Con Calma
┃  .spotify Bohemian Rhapsody
┃  .sp Despacito
┃  .spotifydl Shape of You
┃
┃  📦 *Features :*
┃  • Search and download
┃  • High quality audio
┃  • Album cover included
┃  • Artist info displayed
┃
┃  ⚠️ *Max request :* 20 seconds
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

        const query = args.join(' ');

        if (!query) {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '❓', key: msg.key }
                });
            }
            return sock.sendMessage(from, {
                text: '❌ *Missing search query*\n\nUsage: .spotify [song/artist/keywords]\n\nExample: .spotify Con Calma'
            }, { quoted: msg });
        }

        if (msg?.key) {
            await sock.sendMessage(from, {
                react: { text: '🔍', key: msg.key }
            });
        }

        try {
            // =========================
            // 🔍 SEARCH SPOTIFY
            // =========================
            const apiUrl = `https://okatsu-rolezapiiz.vercel.app/search/spotify?q=${encodeURIComponent(query)}`;
            const { data } = await axios.get(apiUrl, {
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!data?.status || !data?.result) {
                throw new Error('No results found');
            }

            const result = data.result;
            const audioUrl = result.audio;

            if (!audioUrl) {
                if (msg?.key) {
                    await sock.sendMessage(from, {
                        react: { text: '❌', key: msg.key }
                    });
                }
                return sock.sendMessage(from, {
                    text: `╭━━━━❲ *NO AUDIO FOUND* ❳━━━━╮
┃
┃  ❌ *No downloadable audio*
┃  *for this query*
┃
┃  📝 "${query}"
┃
┃  💡 *Suggestions :*
┃  • Try different keywords
┃  • Check spelling
┃  • Try another song
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`
                }, { quoted: msg });
            }

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '🎵', key: msg.key }
                });
            }

            // =========================
            // 📤 SEND COVER & INFO
            // =========================
            const title = result.title || result.name || 'Unknown Title';
            const artist = result.artist || 'Unknown Artist';
            const duration = result.duration || 'Unknown';
            const spotifyUrl = result.url || '';
            const thumbnail = result.thumbnails || result.thumbnail || null;

            // Format duration if needed
            let durationDisplay = duration;
            if (duration && !isNaN(duration)) {
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                durationDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            const infoMessage = `╭━━━━❲ *SPOTIFY - FOUND* ❳━━━━╮
┃
┃  🎵 *Title :* ${title}
┃  👤 *Artist :* ${artist}
┃  ⏱️ *Duration :* ${durationDisplay}
┃  🔗 *Link :* ${spotifyUrl.substring(0, 40)}${spotifyUrl.length > 40 ? '...' : ''}
┃
┃  📡 *Source :* Spotify API
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

⏳ *Downloading audio...*`;

            // Send cover image with info if available
            if (thumbnail) {
                try {
                    await sock.sendMessage(from, {
                        image: { url: thumbnail },
                        caption: infoMessage,
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
                } catch (error) {
                    // Fallback si l'image ne peut pas être envoyée
                    await sock.sendMessage(from, {
                        text: infoMessage
                    }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(from, {
                    text: infoMessage
                }, { quoted: msg });
            }

            // =========================
            // 🎵 SEND AUDIO
            // =========================
            const fileName = `${title.replace(/[\\/:*?"<>|]/g, '')}.mp3`;

            await sock.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                ptt: false,
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

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '✅', key: msg.key }
                });
            }

            // =========================
            // 📊 CONFIRMATION
            // =========================
            const summary = `╭━━━━❲ *DOWNLOAD COMPLETE* ❳━━━━╮
┃
┃  ✅ *Audio downloaded*
┃
┃  🎵 *Title :* ${title.substring(0, 40)}${title.length > 40 ? '...' : ''}
┃  👤 *Artist :* ${artist}
┃  ⏱️ *Duration :* ${durationDisplay}
┃
┃  💡 *Tip :* Use .play to search
┃  music on YouTube
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            await sock.sendMessage(from, {
                text: summary
            }, { quoted: msg });

        } catch (error) {
            console.error('[SPOTIFY] Error:', error?.message || error);

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '💥', key: msg.key }
                });
            }

            let errorMsg = `╭━━━━❲ *SPOTIFY ERROR* ❳━━━━╮\n┃\n┃  ❌ *Failed to fetch audio*\n┃\n`;
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                errorMsg += `┃  ⏰ *Request timeout*\n┃\n┃  💡 *The server took too long*\n┃  • Try again later\n┃  • Use different keywords\n`;
            } else if (error.message.includes('No results')) {
                errorMsg += `┃  🔍 *No results found*\n┃\n┃  💡 *Try :*\n┃  • Different spelling\n┃  • Another song\n┃  • Artist name\n`;
            } else {
                errorMsg += `┃  📝 *Error :* ${error.message.substring(0, 50)}\n┃\n┃  💡 *Try again in a few minutes*\n`;
            }
            
            errorMsg += `┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`;

            await sock.sendMessage(from, {
                text: errorMsg
            }, { quoted: msg });
        }
    }
};
