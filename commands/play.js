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
                console.error(`❌ YouTube error:`, error.message);
                return [];
            }
        }
    },
    {
        id: 2,
        name: 'SoundCloud',
        description: 'SoundCloud search (via API)',
        search: async (query, limit = 5) => {
            try {
                const url = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(query)}`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });
                
                // Extract tracks from HTML (simplified)
                const html = response.data;
                const tracks = [];
                
                const matches = html.match(/soundcloud:\/\/sounds:[0-9]+/g);
                if (matches) {
                    for (const match of matches.slice(0, limit)) {
                        const trackId = match.split(':')[2];
                        tracks.push({
                            id: trackId,
                            title: `Track ${trackId}`,
                            url: `https://soundcloud.com/playlists/${trackId}`,
                            thumbnail: 'https://soundcloud.com/favicon.ico',
                            duration: 'Unknown',
                            views: 'Unknown',
                            author: 'Unknown'
                        });
                    }
                }
                
                return tracks;
            } catch (error) {
                console.error(`❌ SoundCloud error:`, error.message);
                return [];
            }
        }
    },
    {
        id: 3,
        name: 'YouTube Music',
        description: 'YouTube Music search',
        search: async (query, limit = 5) => {
            try {
                const url = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });
                
                const html = response.data;
                const videos = [];
                
                const matches = html.match(/\/watch\?v=[a-zA-Z0-9_-]{11}/g);
                if (matches) {
                    const uniqueMatches = [...new Set(matches)].slice(0, limit);
                    for (const match of uniqueMatches) {
                        const videoId = match.split('=')[1];
                        videos.push({
                            id: videoId,
                            title: `Video ${videoId}`,
                            url: `https://www.youtube.com${match}`,
                            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                            duration: 'Unknown',
                            views: 'Unknown',
                            author: 'Unknown'
                        });
                    }
                }
                
                return videos;
            } catch (error) {
                console.error(`❌ YouTube Music error:`, error.message);
                return [];
            }
        }
    }
];

// =========================
// 📋 PROVIDER LIST
// =========================
const getMusicProviderList = () => {
    return MUSIC_PROVIDERS.map(p => 
        `┃  ${p.id}. ${p.name}\n┃     ${p.description}`
    ).join('\n');
};

// =========================
// 🔍 SEARCH FUNCTION WITH FALLBACK
// =========================
const searchMusic = async (query, limit = 5) => {
    for (const provider of MUSIC_PROVIDERS) {
        try {
            console.log(`🎵 Searching via ${provider.name}...`);
            const results = await provider.search(query, limit);
            if (results && results.length > 0) {
                return { results, provider: provider.name };
            }
        } catch (error) {
            console.error(`❌ ${provider.name} failed:`, error.message);
            continue;
        }
    }
    throw new Error('No music found');
};

// =========================
// 🎵 MAIN COMMAND
// =========================
module.exports = {
    name: 'play',
    aliases: ['music', 'song', 'audio', 'yt', 'youtube'],
    description: 'Search and play music (interactive selection)',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;

        if (!from) {
            console.error('❌ JID not available');
            return;
        }

        // =========================
        // 📋 SHOW PROVIDER LIST
        // =========================
        if (args.length === 0 || args[0].toLowerCase() === 'list') {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '📋', key: msg.key }
                });
            }

            const listMessage = `╭━━━━❲ *MUSIC SEARCH* ❳━━━━╮
┃
┃  🎵 *Available providers :*
┃
${getMusicProviderList()}
┃
┃  📌 *Usage :*
┃  • .play [song name]
┃  • .play [id] [song name]
┃  • .play list
┃
┃  💡 *Examples :*
┃  .play Bohemian Rhapsody
┃  .play 1 Despacito
┃
┃  🔄 *Interactive :*
┃  Select a number from the results
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            return sock.sendMessage(from, {
                text: listMessage,
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
        }

        // =========================
        // 🔍 DETECT SELECTED PROVIDER
        // =========================
        let selectedId = null;
        let query = '';

        if (!isNaN(args[0]) && args[0] >= 1 && args[0] <= MUSIC_PROVIDERS.length) {
            selectedId = parseInt(args[0]);
            query = args.slice(1).join(' ');
        } else {
            query = args.join(' ');
        }

        if (!query) {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '❓', key: msg.key }
                });
            }
            return sock.sendMessage(from, {
                text: `❌ *Missing song name*\n\nUsage : .play [song name]\n\n*Examples :*\n.play Bohemian Rhapsody\n.play 1 Despacito\n.play list → View providers\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`
            }, { quoted: msg });
        }

        if (msg?.key) {
            await sock.sendMessage(from, {
                react: { text: '🎵', key: msg.key }
            });
        }

        await sock.sendMessage(from, {
            text: `🎵 *Searching for :*\n"${query}"\n⏳ Please wait...`
        }, { quoted: msg });

        // =========================
        // 🔍 SEARCH MUSIC
        // =========================
        try {
            let searchResults = [];
            let usedProvider = '';

            if (selectedId) {
                const provider = MUSIC_PROVIDERS.find(p => p.id === selectedId);
                if (provider) {
                    const results = await provider.search(query, 5);
                    if (results && results.length > 0) {
                        searchResults = results;
                        usedProvider = provider.name;
                    }
                }
            } else {
                const result = await searchMusic(query, 5);
                searchResults = result.results;
                usedProvider = result.provider;
            }

            if (searchResults.length === 0) {
                if (msg?.key) {
                    await sock.sendMessage(from, {
                        react: { text: '❌', key: msg.key }
                    });
                }

                return sock.sendMessage(from, {
                    text: `╭━━━━❲ *NO RESULTS* ❳━━━━╮
┃
┃  ❌ *No music found for :*
┃  "${query}"
┃
┃  💡 *Suggestions :*
┃  • Check spelling
┃  • Try different keywords
┃  • Use .play list to see
┃    available providers
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`
                }, { quoted: msg });
            }

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '✅', key: msg.key }
                });
            }

            // =========================
            // 📊 DISPLAY RESULTS WITH NUMBERS
            // =========================
            const resultsList = searchResults.map((video, index) => 
                `┃  ${index + 1}. ${video.title.substring(0, 40)}${video.title.length > 40 ? '...' : ''}\n┃     ⏱️ ${video.duration || 'Unknown'} | 👁️ ${video.views || 'Unknown'}`
            ).join('\n');

            const selectionMessage = `╭━━━━❲ *SEARCH RESULTS* ❳━━━━╮
┃
┃  🎵 *Results for :* "${query}"
┃  📡 *Source :* ${usedProvider}
┃
${resultsList}
┃
┃  📌 *Select a number (1-${searchResults.length})*
┃  *Reply to this message with*
┃  *the number of your choice*
┃
┃  ⏳ *Selection timeout :* 30 seconds
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            const selectionMsg = await sock.sendMessage(from, {
                text: selectionMessage,
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

            // =========================
            // ⏳ WAIT FOR USER SELECTION
            // =========================
            const selectionTimeout = 30000;
            const startTime = Date.now();
            let selectedIndex = null;

            // Store the selection listener
            const selectionListener = async (update) => {
                try {
                    const msgs = update.messages;
                    if (!msgs || msgs.length === 0) return;

                    const msgResponse = msgs[0];
                    if (!msgResponse.message || msgResponse.key.fromMe) return;

                    const fromResponse = msgResponse.key.remoteJid;
                    if (fromResponse !== from) return;

                    const responseText = 
                        msgResponse.message.conversation ||
                        msgResponse.message.extendedTextMessage?.text ||
                        '';

                    if (!responseText) return;

                    const number = parseInt(responseText.trim());
                    if (isNaN(number) || number < 1 || number > searchResults.length) {
                        await sock.sendMessage(from, {
                            text: `❌ *Invalid selection*\nPlease choose a number between 1 and ${searchResults.length}`
                        }, { quoted: msgResponse });
                        return;
                    }

                    selectedIndex = number - 1;
                    
                    // Remove listener after selection
                    sock.ev.off('messages.upsert', selectionListener);

                    // =========================
                    // 🎵 SEND SELECTED SONG
                    // =========================
                    const selectedVideo = searchResults[selectedIndex];
                    
                    if (msg?.key) {
                        await sock.sendMessage(from, {
                            react: { text: '🎵', key: msg.key }
                        });
                    }

                    const songMessage = `╭━━━━❲ *NOW PLAYING* ❳━━━━╮
┃
┃  🎵 *Title :* ${selectedVideo.title}
┃  👤 *Artist :* ${selectedVideo.author || 'Unknown'}
┃  ⏱️ *Duration :* ${selectedVideo.duration || 'Unknown'}
┃  👁️ *Views :* ${selectedVideo.views || 'Unknown'}
┃  🔗 *Link :* ${selectedVideo.url}
┃
┃  📡 *Source :* ${usedProvider}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

                    await sock.sendMessage(from, {
                        text: songMessage,
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
                    }, { quoted: msgResponse });

                    // Send thumbnail if available
                    if (selectedVideo.thumbnail) {
                        try {
                            await sock.sendMessage(from, {
                                image: { url: selectedVideo.thumbnail },
                                caption: `🎵 *${selectedVideo.title}*\n👤 ${selectedVideo.author || 'Unknown'}`
                            });
                        } catch (error) {
                            console.error('❌ Thumbnail error:', error.message);
                        }
                    }

                    await sock.sendMessage(from, {
                        react: { text: '✅', key: msg.key }
                    });

                } catch (error) {
                    console.error('❌ Selection error:', error);
                }
            };

            // Add listener
            sock.ev.on('messages.upsert', selectionListener);

            // =========================
            // ⏰ TIMEOUT HANDLING
            // =========================
            const checkTimeout = async () => {
                while (Date.now() - startTime < selectionTimeout) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (selectedIndex !== null) return;
                }

                // Timeout reached
                sock.ev.off('messages.upsert', selectionListener);
                await sock.sendMessage(from, {
                    text: `⏰ *Selection timeout*\n\nNo selection made within 30 seconds.\n\n💡 *Tip :*\nUse .play again to search again.`
                });
            };

            await checkTimeout();

        } catch (error) {
            console.error('❌ Play error:', error);

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '💥', key: msg.key }
                });
            }

            await sock.sendMessage(from, {
                text: `╭━━━━❲ *ERROR* ❳━━━━╮
┃
┃  ❌ *Unable to search music*
┃
┃  📝 *Error :* ${error.message.substring(0, 50)}
┃
┃  💡 *Solutions :*
┃  • Try again in a few minutes
┃  • Use different keywords
┃  • Use .play list to see
┃    available providers
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`
            }, { quoted: msg });
        }
    }
};
