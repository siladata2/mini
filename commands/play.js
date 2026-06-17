const axios = require('axios');
const yts = require('yt-search');

// =========================
// 🎵 MUSIC PROVIDERS
// =========================
const MUSIC_PROVIDERS = [
    {
        id: 1,
        name: 'YouTube',
        description: 'Official YouTube search',
        search: async (query, limit = 5) => {
            try {
                const results = await yts(query);
                const videos = results.videos.slice(0, limit);
                return videos.map(v => ({
                    id: v.videoId,
                    title: v.title,
                    url: v.url,
                    thumbnail: v.thumbnail,
                    duration: v.timestamp,
                    views: v.views,
                    author: v.author.name
                }));
            } catch (error) {
                console.error('YouTube error:', error.message);
                return [];
            }
        }
    },
    {
        id: 2,
        name: 'SoundCloud',
        description: 'SoundCloud search',
        search: async (query, limit = 5) => {
            try {
                const url = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(query)}`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });
                
                const html = response.data;
                const tracks = [];
                
                const matches = html.match(/soundcloud:\/\/sounds:[0-9]+/g);
                if (matches) {
                    for (const match of matches.slice(0, limit)) {
                        const trackId = match.split(':')[2];
                        tracks.push({
                            id: trackId,
                            title: 'Track ' + trackId,
                            url: 'https://soundcloud.com/playlists/' + trackId,
                            thumbnail: 'https://soundcloud.com/favicon.ico',
                            duration: 'Unknown',
                            views: 'Unknown',
                            author: 'Unknown'
                        });
                    }
                }
                
                return tracks;
            } catch (error) {
                console.error('SoundCloud error:', error.message);
                return [];
            }
        }
    }
];

// =========================
// SEARCH FUNCTION WITH FALLBACK
// =========================
const searchMusic = async (query, limit = 5) => {
    for (const provider of MUSIC_PROVIDERS) {
        try {
            console.log('Searching via ' + provider.name + '...');
            const results = await provider.search(query, limit);
            if (results && results.length > 0) {
                return { results, provider: provider.name };
            }
        } catch (error) {
            console.error(provider.name + ' failed:', error.message);
            continue;
        }
    }
    throw new Error('No music found');
};

// =========================
// MAIN COMMAND
// =========================
module.exports = {
    name: 'play',
    aliases: ['music', 'song', 'audio', 'yt', 'youtube'],
    description: 'Search and play music (select by number)',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;
        const sender = msg?.key?.participant || from;

        if (!from) {
            console.error('JID not available');
            return;
        }

        // =========================
        // SHOW HELP
        // =========================
        if (args.length === 0 || args[0].toLowerCase() === 'help') {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '📋', key: msg.key }
                });
            }

            const helpMessage = '╭━━━━❲ MUSIC SEARCH ❳━━━━╮\n' +
                '┃\n' +
                '┃  🎵 Usage:\n' +
                '┃  .play [song name]\n' +
                '┃\n' +
                '┃  💡 Examples:\n' +
                '┃  .play Bohemian Rhapsody\n' +
                '┃  .play Despacito\n' +
                '┃\n' +
                '┃  🔄 After search, type\n' +
                '┃  the number (1-5) to select\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
                '━━━━━━━━━━━━━━━\n' +
                '_©CybernovA_';

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

        const query = args.join(' ');

        if (!query) {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '❓', key: msg.key }
                });
            }
            return sock.sendMessage(from, {
                text: '❌ Missing song name\n\nUsage: .play [song name]\n\nExample: .play Bohemian Rhapsody'
            }, { quoted: msg });
        }

        if (msg?.key) {
            await sock.sendMessage(from, {
                react: { text: '🎵', key: msg.key }
            });
        }

        await sock.sendMessage(from, {
            text: '🎵 Searching for: "' + query + '"\n⏳ Please wait...'
        }, { quoted: msg });

        // =========================
        // SEARCH MUSIC
        // =========================
        try {
            const result = await searchMusic(query, 5);
            const searchResults = result.results;
            const usedProvider = result.provider;

            if (searchResults.length === 0) {
                if (msg?.key) {
                    await sock.sendMessage(from, {
                        react: { text: '❌', key: msg.key }
                    });
                }

                return sock.sendMessage(from, {
                    text: '╭━━━━❲ NO RESULTS ❳━━━━╮\n' +
                        '┃\n' +
                        '┃  ❌ No music found for:\n' +
                        '┃  "' + query + '"\n' +
                        '┃\n' +
                        '┃  💡 Suggestions:\n' +
                        '┃  • Check spelling\n' +
                        '┃  • Try different keywords\n' +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
                        '━━━━━━━━━━━━━━━\n' +
                        '_©CybernovA_'
                }, { quoted: msg });
            }

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '✅', key: msg.key }
                });
            }

            // =========================
            // DISPLAY RESULTS WITH NUMBERS
            // =========================
            let resultsList = '';
            for (let i = 0; i < searchResults.length; i++) {
                const video = searchResults[i];
                const title = video.title.substring(0, 40) + (video.title.length > 40 ? '...' : '');
                const duration = video.duration || 'Unknown';
                const views = video.views || 'Unknown';
                resultsList += '┃  ' + (i + 1) + '. ' + title + '\n';
                resultsList += '┃     ⏱️ ' + duration + ' | 👁️ ' + views + '\n';
            }

            const selectionMessage = '╭━━━━❲ SEARCH RESULTS ❳━━━━╮\n' +
                '┃\n' +
                '┃  🎵 Results for: "' + query + '"\n' +
                '┃  📡 Source: ' + usedProvider + '\n' +
                '┃\n' +
                resultsList +
                '┃\n' +
                '┃  📌 Type a number (1-' + searchResults.length + ')\n' +
                '┃  in this chat to select\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
                '━━━━━━━━━━━━━━━\n' +
                '_©CybernovA_';

            await sock.sendMessage(from, {
                text: selectionMessage,
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

            // =========================
            // STORE SELECTION STATE
            // =========================
            if (!global.musicSelections) {
                global.musicSelections = new Map();
            }

            const selectionKey = from + '_' + sender;
            global.musicSelections.set(selectionKey, {
                results: searchResults,
                provider: usedProvider,
                timestamp: Date.now(),
                timeout: setTimeout(() => {
                    global.musicSelections.delete(selectionKey);
                }, 60000)
            });

        } catch (error) {
            console.error('Play error:', error);

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '💥', key: msg.key }
                });
            }

            await sock.sendMessage(from, {
                text: '╭━━━━❲ ERROR ❳━━━━╮\n' +
                    '┃\n' +
                    '┃  ❌ Unable to search music\n' +
                    '┃\n' +
                    '┃  📝 Error: ' + error.message.substring(0, 50) + '\n' +
                    '┃\n' +
                    '┃  💡 Try again in a few minutes\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
                    '━━━━━━━━━━━━━━━\n' +
                    '_©CybernovA_'
            }, { quoted: msg });
        }
    }
};
