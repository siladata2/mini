const axios = require('axios');
const fetch = require('node-fetch');

// =========================
// 🔥 CONFIGURATION DES IA
// =========================
const AI_PROVIDERS = [
    // ===== SERVICES GRATUITS (SANS API KEY) =====
    {
        id: 1,
        name: 'Popcat',
        description: 'Chatbot gratuit sans clé',
        endpoint: 'https://api.popcat.xyz/chatbot',
        method: 'GET',
        format: (prompt) => ({
            params: {
                msg: prompt,
                owner: 'Zenitsu',
                botname: 'Assistant'
            }
        }),
        parse: (data) => data.response,
        requiresKey: false
    },
    {
        id: 2,
        name: 'Petrified',
        description: 'IA gratuite en ligne',
        endpoint: 'https://ai.petrified.workers.dev/gpt',
        method: 'POST',
        format: (prompt) => ({
            data: {
                question: prompt,
                context: 'Assistant IA'
            }
        }),
        parse: (data) => data.response || data.message || data.reply,
        requiresKey: false
    },
    {
        id: 3,
        name: 'Blowfish',
        description: 'API IA libre',
        endpoint: 'https://blowfish.workers.dev/api/chat',
        method: 'POST',
        format: (prompt) => ({
            data: {
                message: prompt,
                model: 'gpt-3.5-turbo'
            }
        }),
        parse: (data) => data.response || data.message || data.text,
        requiresKey: false
    },
    {
        id: 4,
        name: 'Lumina',
        description: 'API IA gratuite',
        endpoint: 'https://lumina.workers.dev/ai',
        method: 'POST',
        format: (prompt) => ({
            data: {
                prompt: prompt,
                max_tokens: 200
            }
        }),
        parse: (data) => data.response || data.output || data.text,
        requiresKey: false
    },
    {
        id: 5,
        name: 'Kobold',
        description: 'API IA gratuite',
        endpoint: 'https://kobold.workers.dev/generate',
        method: 'POST',
        format: (prompt) => ({
            data: {
                prompt: prompt,
                max_length: 150
            }
        }),
        parse: (data) => data.response || data.generated_text,
        requiresKey: false
    },
    {
        id: 6,
        name: 'Blackbox',
        description: 'API IA gratuite',
        endpoint: 'https://blackbox.workers.dev/api/chat',
        method: 'POST',
        format: (prompt) => ({
            data: {
                query: prompt,
                model: 'blackbox'
            }
        }),
        parse: (data) => data.response || data.answer || data.message,
        requiresKey: false
    },
    {
        id: 7,
        name: 'G4F',
        description: 'API IA gratuite (GPT4Free)',
        endpoint: 'https://g4f.workers.dev/api/v1/chat',
        method: 'POST',
        format: (prompt) => ({
            data: {
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-3.5-turbo'
            }
        }),
        parse: (data) => data.response || data.choices?.[0]?.message?.content,
        requiresKey: false
    },
    {
        id: 8,
        name: 'Simsimi',
        description: 'Chatbot simple gratuit',
        endpoint: 'https://api.simsimi.vn/v1/simtalk',
        method: 'GET',
        format: (prompt) => ({
            params: {
                text: prompt,
                lc: 'fr'
            }
        }),
        parse: (data) => data.message || data.response,
        requiresKey: false
    },

    // ===== SERVICES AVEC API KEY (FALLBACK) =====
];

// =========================
// 📋 LISTE DES IA DISPONIBLES
// =========================
const getAIList = () => {
    return AI_PROVIDERS.map(p => 
        `┃  ${p.id}. ${p.name}${p.requiresKey ? ' 🔑' : ' ✨'}\n┃     ${p.description}`
    ).join('\n');
};

module.exports = {
    name: 'ai',
    aliases: ['ia', 'ask', 'chat', 'gpt', 'llm'],
    description: 'Intelligence Artificielle avec fallback automatique',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;

        if (!from) {
            console.error('❌ JID non disponible');
            return;
        }

        // =========================
        // 📋 AFFICHER LA LISTE DES IA
        // =========================
        if (args.length === 0 || args[0].toLowerCase() === 'list') {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '📋', key: msg.key }
                });
            }

            const listMessage = `╭━━━━❲ *ARTIFICIAL INTELLIGENCE* ❳━━━━╮
┃
${getAIList()}
┃
┃  • .ai [question]
┃  • .ai [id] [question]
┃  • .ai list
┃
┃  💡 *Exemple :*
┃  .ai Hi !
┃  .ai 1 What is IA ?
┃  .ai 3 Explain me ...
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
        // 🔍 DÉTECTION DE L'IA SÉLECTIONNÉE
        // =========================
        let selectedId = null;
        let prompt = '';

        // Vérifier si le premier argument est un numéro
        if (!isNaN(args[0]) && args[0] >= 1 && args[0] <= AI_PROVIDERS.length) {
            selectedId = parseInt(args[0]);
            prompt = args.slice(1).join(' ');
        } else {
            prompt = args.join(' ');
        }

        if (!prompt) {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '❓', key: msg.key }
                });
            }
            return sock.sendMessage(from, {
                text: `❌ *No question*\n .ia [id] [question]\n\n*Exemple :*\n.ia Hello !\n.ia 1 hi\n.ia list\n━━━━━━━━━━━━━━━\n_©CybernovA_`
            }, { quoted: msg });
        }

        if (msg?.key) {
            await sock.sendMessage(from, {
                react: { text: '🤖', key: msg.key }
            });
        }

        await sock.sendMessage(from, {
            text: '🤖 Wait...'
        }, { quoted: msg });

        // =========================
        // 🔄 FALLBACK AUTOMATIQUE
        // =========================
        let response = null;
        let usedProvider = null;
        let errorLog = [];

        // Filtrer les providers
        let providersToTry = AI_PROVIDERS;

        // Si un ID est sélectionné, ne garder que celui-ci en premier
        if (selectedId) {
            const selected = AI_PROVIDERS.find(p => p.id === selectedId);
            if (selected) {
                providersToTry = [selected, ...AI_PROVIDERS.filter(p => p.id !== selectedId)];
            }
        }

        for (const provider of providersToTry) {
            try {
                console.log(`🔄 Tentative avec ${provider.name}...`);

                const config = provider.format(prompt);
                let responseData;

                if (provider.method === 'GET') {
                    const res = await axios.get(provider.endpoint, {
                        params: config.params || {},
                        timeout: provider.timeout || 30000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    responseData = res.data;
                } else {
                    const res = await axios.post(provider.endpoint, config.data || {}, {
                        headers: config.headers || {
                            'Content-Type': 'application/json'
                        },
                        timeout: provider.timeout || 30000
                    });
                    responseData = res.data;
                }

                const parsed = provider.parse(responseData);
                if (parsed && typeof parsed === 'string' && parsed.trim().length > 0) {
                    response = parsed;
                    usedProvider = provider;
                    break;
                } else {
                    errorLog.push(`${provider.name}: Réponse vide`);
                }

            } catch (err) {
                console.log(`❌ Échec ${provider.name}:`, err.message);
                errorLog.push(`${provider.name}: ${err.message}`);
                continue;
            }
        }

        // =========================
        // 📤 ENVOI DE LA RÉPONSE
        // =========================
        if (response) {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '✅', key: msg.key }
                });
            }

            // Tronquer la réponse si trop longue
            const maxLength = 100000;
            let finalResponse = response;
            if (finalResponse.length > maxLength) {
                finalResponse = finalResponse.substring(0, maxLength) + '...\n\n_(Réponse tronquée)_';
            }

            const providerInfo = usedProvider ? 
                `📡  ${usedProvider.name}${usedProvider.requiresKey ? ' 🔑' : ' ✨'}` : 
                '';

            const responseMessage = `╭━━━━❲ *RÉPONSE IA* ❳━━━━╮
┃
┃  🤖 *Question :*
┃  ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}
┃
┃  ✨ *Réponse :*
┃  ${finalResponse}
┃
┃  ${providerInfo}
┃  ⏱️ *Temps :* ${new Date().toLocaleTimeString()}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            await sock.sendMessage(from, {
                text: responseMessage,
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

        } else {
            // =========================
            // ❌ ÉCHEC DE TOUTES LES IA
            // =========================
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '💥', key: msg.key }
                });
            }

            const errorMessage = `╭━━━━❲ *ERROR IA* ❳━━━━╮
┃
┃  ❌ *IA unavailable *
┃
┃  📝 *Error :*
${errorLog.slice(0, 10).map(e => `┃  • ${e}`).join('\n')}
┃
┃  • Retry later .
┃  • Use .ia list 
┃    ex: .ia 1 [question]
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

━━━━━━━━━━━━━━━
_©CybernovA_`;

            await sock.sendMessage(from, {
                text: errorMessage
            }, { quoted: msg });
        }
    }
};
