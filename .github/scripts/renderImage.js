const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const mustache = require('mustache');

class ImageGenerator {
    constructor(templatesPath) {
        this.templatesPath = templatesPath;
    }

    getImageDataUrl() {
        const imagePath = path.join(this.templatesPath, 'background.png');
        const imageBuffer = fs.readFileSync(imagePath);
        return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }

    renderTemplate(data) {
        const templatePath = path.join(this.templatesPath, 'template.html');
        const template = fs.readFileSync(templatePath, 'utf8');
        data.background_image = this.getImageDataUrl();
        return mustache.render(template, data);
    }

    async generateImage(html, baseURL) {
        const browser = await puppeteer.launch({
            defaultViewport: { width: 1200, height: 630, deviceScaleFactor: 1 },
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--enable-local-file-accesses'],
            headless: true
        });

        const page = await browser.newPage();
        
        page.on('console', msg => console.log('Browser console:', msg.text()));
        page.on('pageerror', err => console.error('Browser page error:', err));

        await page.setContent(html, { 
            waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
            timeout: 30000,
            baseURL: baseURL 
        });

        await page.evaluate(async () => {
            return new Promise((resolve) => {
                const backgroundUrl = getComputedStyle(document.body).backgroundImage;
                if (backgroundUrl === 'none') {
                    resolve();
                    return;
                }
                
                const img = new Image();
                img.src = backgroundUrl.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
                img.complete ? resolve() : img.onload = () => resolve();
                img.onerror = () => {
                    console.error('Failed to load background image:', img.src);
                    resolve();
                };
            });
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        const buffer = await page.screenshot({ type: 'png' });
        await browser.close();
        return buffer;
    }
}

module.exports = ImageGenerator;