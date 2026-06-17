const axios = require('axios');

// =========================
// 🔍 SERVICES DE RECHERCHE D'IMAGES
// =========================
const IMAGE_PROVIDERS = [
    {
        id: 1,
        name: 'DuckDuckGo',
        description: 'Privacy-focused image search',
        search: async (query, limit = 5) => {
            try {
                const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iar=images&iax=images&ia=images`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });
                
                const html = response.data;
                const imageUrls = [];
                
                const matches = html.match(/https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)[^"']*/gi);
                if (matches) {
                    for (const match of matches) {
                        if (!imageUrls.includes(match) && match.length < 500 && !match.includes('data:image')) {
                            imageUrls.push(match);
                            if (imageUrls.length >= limit) break;
                        }
                    }
                }
                
                return imageUrls;
            } catch (error) {
                console.error(`❌ DuckDuckGo error:`, error.message);
                return [];
            }
        }
    },
    {
        id: 2,
        name: 'Bing Images',
        description: 'Microsoft Bing image search',
        search: async (query, limit = 5) => {
            try {
                const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });
                
                const html = response.data;
                const imageUrls = [];
                
                const matches = html.match(/https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp)[^"']*/gi);
                if (matches) {
                    for (const match of matches) {
                        if (!imageUrls.includes(match) && match.length < 500 && !match.includes('bing.com')) {
                            imageUrls.push(match);
                            if (imageUrls.length >= limit) break;
                        }
                    }
                }
                
                return imageUrls;
            } catch (error) {
                console.error(`❌ Bing Images error:`, error.message);
                return [];
            }
        }
    },
    {
        id: 3,
        name: 'Pexels',
        description: 'Free stock photos',
        search: async (query, limit = 5) => {
            try {
                const url = `https://www.pexels.com/search/${encodeURIComponent(query)}/`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });
                
                const html = response.data;
                const imageUrls = [];
                
                const matches = html.match(/https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp)[^"']*/gi);
                if (matches) {
                    for (const match of matches) {
                        if (!imageUrls.includes(match) && match.length < 500 && match.includes('pexels.com')) {
                            imageUrls.push(match);
                            if (imageUrls.length >= limit) break;
                        }
                    }
                }
                
                return imageUrls;
            } catch (error) {
                console.error(`❌ Pexels error:`, error.message);
                return [];
            }
        }
    },
    {
        id: 4,
        name: 'Unsplash',
        description: 'Free stock photos',
        search: async (query, limit = 5) => {
            try {
                const url = `https://unsplash.com/s/photos/${encodeURIComponent(query)}`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 10000
                });
                
                const html = response.data;
                const imageUrls = [];
                
                const matches = html.match(/https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp)[^"']*/gi);
                if (matches) {
                    for (const match of matches) {
                        if (!imageUrls.includes(match) && match.length < 500 && match.includes('unsplash.com')) {
                            imageUrls.push(match);
                            if (imageUrls.length >= limit) break;
                        }
                    }
                }
                
                return imageUrls;
            } catch (error) {
                console.error(`❌ Unsplash error:`, error.message);
                return [];
            }
        }
    }
];

// =========================
// 🔍 FONCTION PRINCIPALE DE RECHERCHE
// =========================
const searchImages = async (query, limit = 5) => {
    const results = [];

    for (const provider of IMAGE_PROVIDERS) {
        try {
            console.log(`🔍 Searching via ${provider.name}...`);
            const images = await provider.search(query, limit);
            
            if (images && images.length > 0) {
                results.push({
                    provider: provider.name,
                    images: images.slice(0, limit)
                });
                
                const totalImages = results.reduce((acc, r) => acc + r.images.length, 0);
                if (totalImages >= limit) break;
            }
        } catch (error) {
            console.error(`❌ ${provider.name} failed:`, error.message);
            continue;
        }
    }

    return results;
};

// =========================
// 📋 LISTE DES SERVICES
// =========================
const getProviderList = () => {
    return IMAGE_PROVIDERS.map(p => 
        `┃  ${p.id}. ${p.name}\n┃     ${p.description}`
    ).join('\n');
};

module.exports = {
    name: 'image',
    aliases: ['img', 'search', 'photo', 'picture', 'find'],
    description: 'Search images on the internet',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;

        if (!from) {
            console.error('❌ JID not available');
            return;
        }

        if (args.length === 0 || args[0].toLowerCase() === 'list') {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '📋', key: msg.key }
                });
            }

            const listMessage = `╭━━━━❲ *IMAGE SEARCH* ❳━━━━╮
┃
┃  🔍 *Available services :*
┃
${getProviderList()}
┃
┃  📌 *Usage :*
┃  • .image [keyword]
┃  • .image [id] [keyword]
┃  • .image list
┃
┃  💡 *Examples :*
┃  .image cat
┃  .image 1 landscape
┃  .image 3 red car
┃
┃  ⚠️ *Limit :* 5 images per search
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

        let selectedId = null;
        let query = '';

        if (!isNaN(args[0]) && args[0] >= 1 && args[0] <= IMAGE_PROVIDERS.length) {
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
                text: `❌ *Missing keyword*\n\nUsage : .image [keyword]\n\n*Examples :*\n.image cat\n.image 1 landscape\n.image list → View services\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`
            }, { quoted: msg });
        }

        if (msg?.key) {
            await sock.sendMessage(from, {
                react: { text: '🔍', key: msg.key }
            });
        }

        await sock.sendMessage(from, {
            text: `🔍 *Searching...*\n\n📝 "${query}"\n⏳ Please wait...`
        }, { quoted: msg });

        try {
            const limit = 5;
            let results = [];

            if (selectedId) {
                const provider = IMAGE_PROVIDERS.find(p => p.id === selectedId);
                if (provider) {
                    const images = await provider.search(query, limit);
                    if (images && images.length > 0) {
                        results = [{ provider: provider.name, images: images.slice(0, limit) }];
                    }
                }
            } else {
                results = await searchImages(query, limit);
            }

            if (results.length === 0 || results.every(r => r.images.length === 0)) {
                if (msg?.key) {
                    await sock.sendMessage(from, {
                        react: { text: '❌', key: msg.key }
                    });
                }

                return sock.sendMessage(from, {
                    text: `╭━━━━❲ *NO IMAGES FOUND* ❳━━━━╮
┃
┃  ❌ *No results for :*
┃  "${query}"
┃
┃  💡 *Suggestions :*
┃  • Check spelling
┃  • Try different keyword
┃  • Use .image list to see
┃    available services
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

            let totalSent = 0;
            for (const result of results) {
                for (const imageUrl of result.images) {
                    if (totalSent >= limit) break;
                    
                    try {
                        const caption = `🖼️ *Search :* "${query}"
📡 *Source :* ${result.provider}
📅 ${new Date().toLocaleDateString()}
🔢 ${totalSent + 1}/${Math.min(results.reduce((acc, r) => acc + r.images.length, 0), limit)}`;

                        await sock.sendMessage(from, {
                            image: { url: imageUrl },
                            caption: caption,
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
                        });

                        totalSent++;
                        await new Promise(resolve => setTimeout(resolve, 500));

                    } catch (error) {
                        console.error(`❌ Error sending image:`, error.message);
                        continue;
                    }
                }
            }

            const summary = `╭━━━━❲ *SEARCH COMPLETE* ❳━━━━╮
┃
┃  ✅ ${totalSent} image(s) found
┃  📝 "${query}"
┃
┃  📡 *Sources used :*
${results.map(r => `┃  • ${r.provider} (${r.images.length} images)`).join('\n')}
┃
┃  💡 *Tip :*
┃  Use .image [id] [keyword]
┃  for specific service
┃  Ex: .image 3 landscape
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            await sock.sendMessage(from, {
                text: summary
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Search error:', error);

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '💥', key: msg.key }
                });
            }

            await sock.sendMessage(from, {
                text: `╭━━━━❲ *SEARCH ERROR* ❳━━━━╮
┃
┃  ❌ *Unable to complete*
┃  *the search*
┃
┃  📝 *Error :* ${error.message.substring(0, 50)}
┃
┃  💡 *Solutions :*
┃  • Try again in a few minutes
┃  • Use a different keyword
┃  • Use .image list to see
┃    available services
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`
            }, { quoted: msg });
        }
    }
};
