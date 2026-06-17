const axios = require('axios');

// =========================
// 🔥 FREE AI PROVIDERS (NO API KEY)
// =========================
const AI_PROVIDERS = [
    {
        id: 1,
        name: 'Popcat',
        description: 'Fast & reliable chatbot',
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
        timeout: 10000
    },
    {
        id: 2,
        name: 'Petrified',
        description: 'Free GPT-like API',
        endpoint: 'https://ai.petrified.workers.dev/gpt',
        method: 'POST',
        format: (prompt) => ({
            data: {
                question: prompt,
                context: 'You are a helpful assistant'
            }
        }),
        parse: (data) => data.response || data.message || data.reply,
        timeout: 15000
    },
    {
        id: 3,
        name: 'Blowfish',
        description: 'Free AI chat API',
        endpoint: 'https://blowfish.workers.dev/api/chat',
        method: 'POST',
        format: (prompt) => ({
            data: {
                message: prompt,
                model: 'gpt-3.5-turbo'
            }
        }),
        parse: (data) => data.response || data.message || data.text,
        timeout: 15000
    },
    {
        id: 4,
        name: 'Lumina',
        description: 'Free AI generation',
        endpoint: 'https://lumina.workers.dev/ai',
        method: 'POST',
        format: (prompt) => ({
            data: {
                prompt: prompt,
                max_tokens: 200
            }
        }),
        parse: (data) => data.response || data.output || data.text,
        timeout: 15000
    },
    {
        id: 5,
        name: 'Kobold',
        description: 'Free text generation',
        endpoint: 'https://kobold.workers.dev/generate',
        method: 'POST',
        format: (prompt) => ({
            data: {
                prompt: prompt,
                max_length: 150
            }
        }),
        parse: (data) => data.response || data.generated_text,
        timeout: 15000
    },
    {
        id: 6,
        name: 'Simsimi',
        description: 'Simple chatbot',
        endpoint: 'https://api.simsimi.vn/v1/simtalk',
        method: 'GET',
        format: (prompt) => ({
            params: {
                text: prompt,
                lc: 'en'
            }
        }),
        parse: (data) => data.message || data.response,
        timeout: 10000
    },
    {
        id: 7,
        name: 'Blackbox',
        description: 'Free AI assistant',
        endpoint: 'https://blackbox.workers.dev/api/chat',
        method: 'POST',
        format: (prompt) => ({
            data: {
                query: prompt,
                model: 'blackbox'
            }
        }),
        parse: (data) => data.response || data.answer || data.message,
        timeout: 15000
    },
    {
        id: 8,
        name: 'G4F',
        description: 'GPT4Free API',
        endpoint: 'https://g4f.workers.dev/api/v1/chat',
        method: 'POST',
        format: (prompt) => ({
            data: {
                messages: [{ role: 'user', content: prompt }],
                model: 'gpt-3.5-turbo'
            }
        }),
        parse: (data) => data.response || data.choices?.[0]?.message?.content,
        timeout: 20000
    },
    {
        id: 9,
        name: 'DeepSeek',
        description: 'Free AI chat',
        endpoint: 'https://deepseek.workers.dev/api/chat',
        method: 'POST',
        format: (prompt) => ({
            data: {
                message: prompt,
                temperature: 0.7
            }
        }),
        parse: (data) => data.response || data.message || data.text,
        timeout: 15000
    },
    {
        id: 10,
        name: 'Mistral',
        description: 'Free Mistral API',
        endpoint: 'https://mistral.workers.dev/api/generate',
        method: 'POST',
        format: (prompt) => ({
            data: {
                prompt: prompt,
                max_tokens: 200
            }
        }),
        parse: (data) => data.response || data.text || data.generated,
        timeout: 15000
    }
];

// =========================
// 📋 GET PROVIDER LIST
// =========================
const getProviderList = () => {
    return AI_PROVIDERS.map(p => 
        `┃  ${p.id}. ${p.name}\n┃     ${p.description}`
    ).join('\n');
};

// =========================
// 🔍 SEARCH WITH FALLBACK
// =========================
const askAI = async (prompt, selectedId = null) => {
    let providersToTry = AI_PROVIDERS;

    if (selectedId) {
        const selected = AI_PROVIDERS.find(p => p.id === selectedId);
        if (selected) {
            providersToTry = [selected, ...AI_PROVIDERS.filter(p => p.id !== selectedId)];
        }
    }

    for (const provider of providersToTry) {
        try {
            console.log(`🤖 Trying ${provider.name}...`);
            
            const config = provider.format(prompt);
            let responseData;

            if (provider.method === 'GET') {
                const res = await axios.get(provider.endpoint, {
                    params: config.params || {},
                    timeout: provider.timeout || 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                responseData = res.data;
            } else {
                const res = await axios.post(provider.endpoint, config.data || {}, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: provider.timeout || 15000
                });
                responseData = res.data;
            }

            const parsed = provider.parse(responseData);
            if (parsed && typeof parsed === 'string' && parsed.trim().length > 0) {
                return { response: parsed, provider: provider.name };
            }

        } catch (err) {
            console.log(`❌ ${provider.name} failed:`, err.message);
            continue;
        }
    }

    throw new Error('All AI services are currently unavailable');
};

module.exports = {
    name: 'ai',
    aliases: ['ia', 'ask', 'chat', 'gpt', 'llm', 'assistant'],
    description: 'AI Assistant with automatic fallback',

    async execute({ sock, msg, args, jid, text, config, stats }) {
        const from = jid || msg?.key?.remoteJid;

        if (!from) {
            console.error('❌ JID not available');
            return;
        }

        // =========================
        // 📋 SHOW AI LIST
        // =========================
        if (args.length === 0 || args[0].toLowerCase() === 'list') {
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '📋', key: msg.key }
                });
            }

            const listMessage = `╭━━━━❲ *AI ASSISTANTS* ❳━━━━╮
┃
┃  🤖 *Available models :*
┃
${getProviderList()}
┃
┃  📌 *Usage :*
┃  • .ai [question]
┃  • .ai [id] [question]
┃  • .ai list
┃
┃  💡 *Examples :*
┃  .ai What is AI?
┃  .ai 1 Tell me a joke
┃  .ai 3 Explain quantum physics
┃
┃  ⚠️ *No API key required*
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
        // 🔍 DETECT SELECTED AI
        // =========================
        let selectedId = null;
        let prompt = '';

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
                text: `❌ *Question missing*\n\nUsage : .ai [question]\n\n*Examples :*\n.ai What is AI?\n.ai 1 Tell me a joke\n.ai list → View all AIs\n\n━━━━━━━━━━━━━━━\n_©CybernovA_`
            }, { quoted: msg });
        }

        if (msg?.key) {
            await sock.sendMessage(from, {
                react: { text: '🤖', key: msg.key }
            });
        }

        await sock.sendMessage(from, {
            text: '🤖 *Generating response...*\n\n_This may take a few seconds._'
        }, { quoted: msg });

        // =========================
        // 🔄 ASK AI WITH FALLBACK
        // =========================
        try {
            const result = await askAI(prompt, selectedId);
            
            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '✅', key: msg.key }
                });
            }

            // Truncate if too long
            const maxLength = 4000;
            let response = result.response;
            if (response.length > maxLength) {
                response = response.substring(0, maxLength) + '...\n\n_(Response truncated)_';
            }

            const responseMessage = `╭━━━━❲ *AI RESPONSE* ❳━━━━╮
┃
┃  🤖 *Question :*
┃  ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}
┃
┃  ✨ *Answer :*
┃  ${response}
┃
┃  📡 *Source :* ${result.provider}
┃  ⏱️ *Time :* ${new Date().toLocaleTimeString()}
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
                        serverMessageId: 195
                    }
                }
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ AI Error:', error);

            if (msg?.key) {
                await sock.sendMessage(from, {
                    react: { text: '💥', key: msg.key }
                });
            }

            const errorMessage = `╭━━━━❲ *AI ERROR* ❳━━━━╮
┃
┃  ❌ *All AI services are*
┃  *temporarily unavailable*
┃
┃  📝 *Error :* ${error.message}
┃
┃  💡 *Solutions :*
┃  • Try again in a few minutes
┃  • Use .ai list to see
┃    available services
┃  • Try with a specific ID
┃    ex: .ai 1 [question]
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
