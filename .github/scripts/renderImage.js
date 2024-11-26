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

    getIconDataUrl(iconName) {
        const iconPath = path.join(this.templatesPath, 'assets', 'icons', `${iconName}.svg`);
        const iconBuffer = fs.readFileSync(iconPath);
        return `data:image/svg+xml;base64,${iconBuffer.toString('base64')}`;
    }

    getFontDataUrl() {
        const fontPath = path.join(this.templatesPath, 'assets', 'fonts', 'MonaSansVF-Regular.woff2');
        const fontBuffer = fs.readFileSync(fontPath);
        return `data:font/woff2;base64,${fontBuffer.toString('base64')}`;
    }

    renderTemplate(data, baseURL) {
        const templatePath = path.join(this.templatesPath, 'template.html');
        const template = fs.readFileSync(templatePath, 'utf8');
        data.background_image = this.getImageDataUrl();
        data.star_icon = this.getIconDataUrl('star');
        data.fork_icon = this.getIconDataUrl('repo-forked');
        data.contributors_icon = this.getIconDataUrl('people');
        data.font_url = this.getFontDataUrl();
        data.baseURL = baseURL;
        data.language_distribution = data.language_distribution || [];
        return mustache.render(template, data);
    }

    async generateImage(html, baseURL, headless = true, keepOpen = false) { // Add keepOpen parameter
        const browser = await puppeteer.launch({
            defaultViewport: { width: 1280, height: 640, deviceScaleFactor: 1 },
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--enable-local-file-accesses'],
            headless: headless // Use the headless parameter
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
                if (document.fonts && document.fonts.ready) {
                    document.fonts.ready.then(() => {
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
                } else {
                    resolve();
                }
            });
        });

        // Log relevant computed styles for debugging
        // await page.evaluate(() => {
        //     const elements = document.querySelectorAll('.repo-name, .description, .stats');
        //     elements.forEach(el => {
        //         const styles = getComputedStyle(el);
        //         console.log(`Computed styles for ${el.className}:`);
        //         console.log(`font-family: ${styles.getPropertyValue('font-family')}`);
        //         console.log(`font-size: ${styles.getPropertyValue('font-size')}`);
        //         console.log(`font-weight: ${styles.getPropertyValue('font-weight')}`);
        //         console.log(`font-feature-settings: ${styles.getPropertyValue('font-feature-settings')}`);
        //     });
        // });

        // Increase wait time to ensure font is loaded
        await new Promise(resolve => setTimeout(resolve, 3000));

        const buffer = await page.screenshot({ type: 'png' });

        if (!keepOpen) {
            await browser.close();
        }

        return buffer;
    }
}

module.exports = ImageGenerator;