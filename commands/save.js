
// ./commands/save.js

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
// ═══════════════════════════════════════
// UTILITY: Delay
// ═══════════════════════════════════════

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ═══════════════════════════════════════
// UTILITY: Download media from quoted message
// ═══════════════════════════════════════

/**
 * Download media from a quoted message
 * @param {object} quotedMessage - The quoted message object
 * @returns {Promise<{buffer: Buffer, mime: string, type: string}>}
 */
async function downloadQuotedMedia(quotedMessage) {
    // Detect media type
    const types = [
        { key: 'imageMessage', type: 'image', mime: 'image/jpeg' },
        { key: 'videoMessage', type: 'video', mime: 'video/mp4' },
        { key: 'stickerMessage', type: 'sticker', mime: 'image/webp' },
        { key: 'audioMessage', type: 'audio', mime: 'audio/mpeg' },
        { key: 'voiceMessage', type: 'voice', mime: 'audio/ogg' },
        { key: 'documentMessage', type: 'document', mime: 'application/octet-stream' },
        { key: 'viewOnceMessage', type: 'view-once', mime: 'application/octet-stream' },
        { key: 'viewOnceMessageV2', type: 'view-once-v2', mime: 'application/octet-stream' },
    ];

    let detectedType = null;
    let messageToDownload = quotedMessage;

    for (const t of types) {
        if (quotedMessage[t.key]) {
            detectedType = t;
            break;
        }
    }

    // Handle view-once: unwrap inner message
    if (detectedType?.type === 'view-once' || detectedType?.type === 'view-once-v2') {
        const inner = quotedMessage[detectedType.key]?.message;
        if (inner) {
            for (const t of types) {
                if (inner[t.key]) {
                    detectedType = {
                        ...t,
                        mime: t.mime,
                    };
                    messageToDownload = inner;
                    break;
                }
            }
        }
    }

    if (!detectedType) {
        throw new Error('No supported media found in the quoted message.');
    }

    // Download
    const stream = await downloadContentFromMessage(
        messageToDownload[detectedType.key],
        detectedType.type
    );

    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    return {
        buffer,
        mime: detectedType.mime,
        type: detectedType.type,
        key: detectedType.key,
    };
}

// ═══════════════════════════════════════
// UTILITY: Get file extension from MIME
// ═══════════════════════════════════════

function getExtension(mime) {
    const map = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'audio/mpeg': '.mp3',
        'audio/ogg': '.ogg',
        'audio/mp4': '.m4a',
    };
    return map[mime] || '.bin';
}

// ═══════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'save',

    /**
     * Save/forward a quoted message's media back to the same chat
     * Works with: images, videos, stickers, audio, voice, documents, view-once
     *
     * Usage:
     *   Reply to a media message with .save
     */
    async execute({ sock, msg, args, jid }) {
        try {
            // ── Get quoted message ──
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quoted) {
                // No quoted message
                await sock.sendMessage(jid, {
                    react: { text: '❓', key: msg.key }
                });
                return safeSendMessage(sock, jid, {
                    text: '❌ *No media found*\n\nPlease reply to a media message (image, video, sticker, audio, voice note, or document) with `.save` to forward it.',
                }, { quoted: msg });
            }

            // ── Check if quoted message contains media ──
            const hasMedia = quoted.imageMessage ||
                             quoted.videoMessage ||
                             quoted.stickerMessage ||
                             quoted.audioMessage ||
                             quoted.voiceMessage ||
                             quoted.documentMessage ||
                             quoted.viewOnceMessage ||
                             quoted.viewOnceMessageV2;

            if (!hasMedia) {
                await sock.sendMessage(jid, {
                    react: { text: '⚠️', key: msg.key }
                });
                return safeSendMessage(sock, jid, {
                    text: '⚠️ *Unsupported media type*\n\nThe quoted message does not contain downloadable media.',
                }, { quoted: msg });
            }

            // ── Step 1: Processing reaction ──
            await sock.sendMessage(jid, {
                react: { text: '⚡', key: msg.key }
            });

            // ── Step 2: Download reaction ──
            await sock.sendMessage(jid, {
                react: { text: '⬇️', key: msg.key }
            });

            // Download with timeout
            let media;
            try {
                media = await downloadQuotedMedia(quoted);
            } catch (downloadErr) {
                console.error('❌ Save download error:', downloadErr.message);

                await sock.sendMessage(jid, {
                    react: { text: '❌', key: msg.key }
                });
                return sock.sendMessage(jid, {
                    text: `❌ *Download failed*\n\n${downloadErr.message}\n\nThe media may be expired or unavailable.`,
                }, { quoted: msg });
            }

            // ── Step 3: Sending reaction ──
            await sock.sendMessage(jid, {
                react: { text: '📤', key: msg.key }
            });

            // Small delay for visual feedback
            await delay(800);

            // ── Send the media back ──
            let sent = false;

            switch (media.type) {
                case 'image':
                    try {
                        await sock.sendMessage(jid, {
                            image: media.buffer,
                            mimetype: media.mime,
                            caption: `💾 *Saved Image*\n📏 Size: ${(media.buffer.length / 1024).toFixed(2)} KB`,
                        }, { quoted: msg });
                        sent = true;
                    } catch (err) {
                        // Fallback: send as document
                        await sock.sendMessage(jid, {
                            document: media.buffer,
                            mimetype: media.mime,
                            fileName: `saved_image${getExtension(media.mime)}`,
                            caption: `💾 *Saved Image (as document)*`,
                        }, { quoted: msg });
                        sent = true;
                    }
                    break;

                case 'video':
                    try {
                        await sock.sendMessage(jid, {
                            video: media.buffer,
                            mimetype: media.mime,
                            caption: `💾 *Saved Video*\n📏 Size: ${(media.buffer.length / 1024).toFixed(2)} KB`,
                        }, { quoted: msg });
                        sent = true;
                    } catch (err) {
                        // Fallback: send as document
                        await sock.sendMessage(jid, {
                            document: media.buffer,
                            mimetype: media.mime,
                            fileName: `saved_video${getExtension(media.mime)}`,
                            caption: `💾 *Saved Video (as document)*`,
                        }, { quoted: msg });
                        sent = true;
                    }
                    break;

                case 'sticker':
                    await sock.sendMessage(jid, {
                        sticker: media.buffer,
                    }, { quoted: msg });
                    sent = true;
                    break;

                case 'audio':
                case 'voice':
                    const isVoice = media.type === 'voice';
                    await sock.sendMessage(jid, {
                        [isVoice ? 'audio' : 'audio']: media.buffer,
                        mimetype: media.mime,
                        ptt: isVoice,
                    }, { quoted: msg });
                    sent = true;
                    break;

                case 'document':
                    await sock.sendMessage(jid, {
                        document: media.buffer,
                        mimetype: media.mime,
                        fileName: `saved_document${getExtension(media.mime)}`,
                        caption: `💾 *Saved Document*`,
                    }, { quoted: msg });
                    sent = true;
                    break;

                case 'view-once':
                case 'view-once-v2':
                    // View-once unwrapped content
                    await sock.sendMessage(jid, {
                        document: media.buffer,
                        mimetype: media.mime,
                        fileName: `saved_viewonce${getExtension(media.mime)}`,
                        caption: `💾 *Saved View-Once Media*\n📏 Size: ${(media.buffer.length / 1024).toFixed(2)} KB`,
                    }, { quoted: msg });
                    sent = true;
                    break;

                default:
                    // Generic fallback as document
                    await sock.sendMessage(jid, {
                        document: media.buffer,
                        mimetype: media.mime,
                        fileName: `saved_media${getExtension(media.mime)}`,
                        caption: `💾 *Saved Media*\n📏 Size: ${(media.buffer.length / 1024).toFixed(2)} KB`,
                    }, { quoted: msg });
                    sent = true;
            }

            // ── Step 4: Success reaction ──
            if (sent) {
                await sock.sendMessage(jid, {
                    react: { text: '✅', key: msg.key }
                });
            }

        } catch (err) {
            console.error('❌ Save command error:', err.message || err);

            try {
                await sock.sendMessage(jid, {
                    react: { text: '❌', key: msg.key }
                });
            } catch (reactErr) {
                // Silently ignore
            }

            await sock.sendMessage(jid, {
                text: `❌ *Error saving media*\n\n${err.message || 'Unknown error'}`,
            }, { quoted: msg });
        }
    },
};
