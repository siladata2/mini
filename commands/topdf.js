// ./commands/document.js

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Supported formats and their extensions
const FORMATS = {
    pdf: {
        label: 'PDF',
        ext: '.pdf',
        mime: 'application/pdf',
    },
    docx: {
        label: 'Word (DOCX)',
        ext: '.docx',
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    txt: {
        label: 'Plain Text',
        ext: '.txt',
        mime: 'text/plain',
    },
    html: {
        label: 'HTML',
        ext: '.html',
        mime: 'text/html',
    },
    md: {
        label: 'Markdown',
        ext: '.md',
        mime: 'text/markdown',
    },
    csv: {
        label: 'CSV',
        ext: '.csv',
        mime: 'text/csv',
    },
    json: {
        label: 'JSON',
        ext: '.json',
        mime: 'application/json',
    },
    xml: {
        label: 'XML',
        ext: '.xml',
        mime: 'application/xml',
    },
    rtf: {
        label: 'Rich Text (RTF)',
        ext: '.rtf',
        mime: 'application/rtf',
    },
};

// ═══════════════════════════════════════
// PDF GENERATOR
// ═══════════════════════════════════════

async function textToPDF(text, title = 'Document') {
    return new Promise((resolve, reject) => {
        try {
            const pdfPath = path.join(TEMP_DIR, `text_${Date.now()}.pdf`);
            const doc = new PDFDocument({
                size: 'A3',
                margin: 40,
                bufferPages: true,
                info: {
                    Title: title,
                    Author: 'Zenitsu Bot',
                    Creator: 'Zenitsu Document Generator',
                },
            });

            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);

            // Title
            doc.fontSize(20)
               .font('Helvetica-Bold')
               .text(title, { align: 'center' })
               .moveDown(2);

            // Date
            doc.fontSize(4)
               .font('Helvetica')
               .fillColor('gray')
               .text(`Generated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}`, { align: 'right' })
               .moveDown(2);

            // Content
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('black');

            const paragraphs = text.split('\n');
            paragraphs.forEach(paragraph => {
                if (paragraph.trim()) {
                    doc.text(paragraph, {
                        align: 'left',
                        lineGap: 5,
                    }).moveDown(0.5);
                }
            });

            // Footer with page numbers
            doc.flushPages();
            const pageRange = doc.bufferedPageRange();
            for (let i = 0; i < pageRange.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8)
                   .fillColor('gray')
                   .text(`Page ${i + 1}`, 50, doc.page.height - 50, { align: 'center' });
            }

            doc.end();

            stream.on('finish', () => resolve(pdfPath));
            stream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
}

// ═══════════════════════════════════════
// DOCX GENERATOR
// ═══════════════════════════════════════

async function textToDOCX(text, title = 'Document') {
    const paragraphs = text.split('\n').filter(p => p.trim());

    const children = [
        new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: `Generated on ${new Date().toLocaleDateString('en-US')}`,
                    size: 16,
                    color: '808080',
                }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 400 },
        }),
    ];

    paragraphs.forEach(para => {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: para,
                        size: 16,
                    }),
                ],
                spacing: { after: 100 },
            })
        );
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    return await Packer.toBuffer(doc);
}

// ═══════════════════════════════════════
// HTML GENERATOR
// ═══════════════════════════════════════

function textToHTML(text, title = 'Document') {
    const paragraphs = text.split('\n').filter(p => p.trim());
    const htmlParagraphs = paragraphs.map(p => `<p>${p}</p>`).join('\n    ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: 'Helvetica', Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; color: #333; }
        h1 { text-align: center; color: #1a1a1a; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        .date { text-align: right; color: #808080; font-size: 12px; margin-bottom: 30px; }
        p { line-height: 1.8; margin-bottom: 15px; }
        .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 15px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <p class="date">Generated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}</p>
    ${htmlParagraphs}
    <p class="footer">Generated by Zenitsu Bot · Powered by CyberNova</p>
</body>
</html>`;
}

// ═══════════════════════════════════════
// MARKDOWN GENERATOR
// ═══════════════════════════════════════

function textToMarkdown(text, title = 'Document') {
    const lines = text.split('\n');
    let md = `# ${title}\n\n`;
    md += `*Generated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}*\n\n`;
    md += `---\n\n`;

    lines.forEach(line => {
        if (line.trim()) {
            md += `${line}\n\n`;
        }
    });

    md += `---\n\n`;
    md += `*Generated by Zenitsu Bot · Powered by CyberNova*`;
    return md;
}

// ═══════════════════════════════════════
// RTF GENERATOR
// ═══════════════════════════════════════

function textToRTF(text, title = 'Document') {
    const paragraphs = text.split('\n').filter(p => p.trim());
    const rtfParagraphs = paragraphs.map(p => `\\par ${p}\\par`).join('\n');

    return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Helvetica;}}
{\\colortbl;\\red0\\green0\\blue0;\\red128\\green128\\blue128;}
\\viewkind4\\uc1\\pard\\sa200\\qc\\f0\\fs48\\b ${title}\\b0\\par
\\pard\\qr\\fs18\\cf2 Generated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}\\cf1\\par
\\pard\\sa200\\fs24
${rtfParagraphs}
\\pard\\qc\\fs18\\cf2 Generated by Zenitsu Bot · Powered by CyberNova\\cf1
}`;
}

// ═══════════════════════════════════════
// CSV GENERATOR (simple)
// ═══════════════════════════════════════

function textToCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    // Try to detect if already CSV-like, otherwise wrap each line as a single column
    const hasCommas = lines.some(l => l.includes(','));
    if (hasCommas) {
        return lines.join('\n');
    }
    // Wrap each line as a row with one column
    return 'Content\n' + lines.map(l => `"${l.replace(/"/g, '""')}"`).join('\n');
}

// ═══════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════

module.exports = {
    name: 'document',

    /**
     * Generate documents from text in various formats
     * Usage:
     *   .document pdf|docx|txt|html|md|csv|json|xml|rtf <text>
     *   .document pdf Title|Content here
     *   Reply to a message with .document pdf
     */
    async execute({ sock, msg, args, jid, safeSendMessage }) {
        try {
            // ── Determine format ──
            let format = 'pdf';
            let textStartIndex = 0;

            if (args[0] && FORMATS[args[0].toLowerCase()]) {
                format = args[0].toLowerCase();
                textStartIndex = 1;
            }

            const formatInfo = FORMATS[format];

            // ── Get text ──
            let text = '';
            let title = 'Document';

            // From arguments
            if (args.length > textStartIndex) {
                text = args.slice(textStartIndex).join(' ');

                // Extract title if format "Title|Content"
                if (text.includes('|')) {
                    const parts = text.split('|');
                    title = parts[0].trim();
                    text = parts.slice(1).join('|').trim();
                } else {
                    // First 5 words as title
                    const words = text.split(' ');
                    title = words.slice(0, 5).join(' ') || 'Document';
                }
            }
            // From quoted message
            else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                text = quoted.conversation ||
                       quoted.extendedTextMessage?.text ||
                       quoted.imageMessage?.caption || '';
                title = 'Quoted Message';
            }
            // No text provided → show help
            else {
                const formatList = Object.entries(FORMATS)
                    .map(([key, val]) => `  • *${key}* — ${val.label}`)
                    .join('\n');

                return sock.sendMessage(jid, {
                    text:
                        `📝 *Document Generator*\n\n` +
                        `📌 *Usage:*\n` +
                        `.document [format] <text>\n\n` +
                        `✨ *Examples:*\n` +
                        `.document pdf Hello World\n` +
                        `.document docx Title|Full content here\n` +
                        `.document html My HTML document\n` +
                        `.document md # Markdown text\n` +
                        `.document csv name,age,city\n` +
                        `.document json {"key":"value"}\n` +
                        `.document txt Plain text file\n` +
                        `.document xml <root>data</root>\n` +
                        `.document rtf Rich text format\n\n` +
                        `📋 *Available formats:*\n${formatList}\n\n` +
                        `💡 *Tip:* Reply to a message with .document pdf\n` +
                        `💡 *Tip:* Use | to separate title from content`,
                }, { quoted: msg });
            }

            // ── Validate text ──
            if (!text || text.length < 2) {
                return sock.sendMessage(sock, jid, {
                    text: '❌ *Text too short*\n\nMinimum 2 characters required.',
                }, { quoted: msg });
            }

            // ── Sanitize filename ──
            const safeTitle = title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').substring(0, 50);
            const filename = `${safeTitle}${formatInfo.ext}`;

            // ── Generate document ──
            let resultBuffer = null;

            switch (format) {
                case 'pdf': {
                    const pdfPath = await textToPDF(text, title);
                    resultBuffer = fs.readFileSync(pdfPath);
                    fs.unlinkSync(pdfPath);
                    break;
                }

                case 'docx': {
                    resultBuffer = await textToDOCX(text, title);
                    break;
                }

                case 'html': {
                    resultBuffer = Buffer.from(textToHTML(text, title), 'utf-8');
                    break;
                }

                case 'md':
                case 'markdown': {
                    resultBuffer = Buffer.from(textToMarkdown(text, title), 'utf-8');
                    break;
                }

                case 'txt': {
                    const header = `${title}\n${'='.repeat(title.length)}\nGenerated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}\n\n`;
                    resultBuffer = Buffer.from(header + text, 'utf-8');
                    break;
                }

                case 'csv': {
                    resultBuffer = Buffer.from(textToCSV(text), 'utf-8');
                    break;
                }

                case 'json': {
                    // Try to parse as JSON, if fails wrap as JSON string
                    try {
                        JSON.parse(text);
                        resultBuffer = Buffer.from(text, 'utf-8');
                    } catch {
                        const jsonObj = {
                            title: title,
                            date: new Date().toISOString(),
                            content: text,
                        };
                        resultBuffer = Buffer.from(JSON.stringify(jsonObj, null, 2), 'utf-8');
                    }
                    break;
                }

                case 'xml': {
                    // Wrap in basic XML structure if not already XML
                    if (text.trim().startsWith('<')) {
                        resultBuffer = Buffer.from(text, 'utf-8');
                    } else {
                        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n  <title>${title}</title>\n  <date>${new Date().toISOString()}</date>\n  <content>${text}</content>\n</document>`;
                        resultBuffer = Buffer.from(xmlContent, 'utf-8');
                    }
                    break;
                }

                case 'rtf': {
                    resultBuffer = Buffer.from(textToRTF(text, title), 'utf-8');
                    break;
                }

                default:
                    return sock.sendMessage(jid, {
                        text: `❌ *Unknown format:* ${format}`,
                    }, { quoted: msg });
            }

            // ── Send document ──
            const sizeKB = (resultBuffer.length / 1024).toFixed(2);

            await sock.sendMessage(jid, {
                document: resultBuffer,
                mimetype: formatInfo.mime,
                fileName: filename,
                caption:
                    `✅ *Document Generated!*\n\n` +
                    `📄 *Title:* ${title}\n` +
                    `📐 *Format:* ${formatInfo.label}\n` +
                    `📏 *Size:* ${sizeKB} KB\n` +
                    `📝 *Characters:* ${text.length}\n` +
                    `📅 *Date:* ${new Date().toLocaleDateString('en-US')}`,
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Document generation error:', error);

            // Fallback: send as plain text
            try {
                const fallbackText =
                    `❌ *Generation Error*\n\n` +
                    `The ${args[0] || 'PDF'} format failed.\n\n` +
                    `*Fallback — Plain Text:*\n\n${(args.slice(1).join(' ')).substring(0, 1000)}`;

                await sock.sendMessage(jid, {
                    text: fallbackText,
                }, { quoted: msg });
            } catch (fallbackErr) {
                console.error('❌ Fallback also failed:', fallbackErr.message);
            }
        }
    },
};
