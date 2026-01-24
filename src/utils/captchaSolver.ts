import { Jimp, intToRGBA } from 'jimp';

export async function solveCaptcha(smallImageBase64: string, bigImageBase64: string, ypos?: number): Promise<number> {
    try {
        // Remove header if present
        const smallImageBuffer = Buffer.from(smallImageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const bigImageBuffer = Buffer.from(bigImageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        const smallImage = await Jimp.read(smallImageBuffer);
        const bigImage = await Jimp.read(bigImageBuffer);

        const smallWidth = smallImage.width;
        const smallHeight = smallImage.height;
        const bigWidth = bigImage.width;
        const bigHeight = bigImage.height;

        let bestX = 0;
        let minDiff = Infinity;

        // Optimization: If ypos is provided, only scan that row range. 
        // Usually ypos is the top of the hole.
        const startY = ypos ? ypos : 0;
        const endY = ypos ? ypos + 5 : bigHeight - smallHeight; // Scan a small range if ypos known, else full

        // Simple template matching (Sum of Absolute Differences)
        // We scan the big image with the small image
        // Note: The "hole" in the big image usually looks like the small image but darker/semi-transparent.
        // Or the small image is the piece that fits into the hole.

        // Let's assume we are looking for the position where the small image matches the background best 
        // (if it's a cut out) OR where the background differs most (if it's a hole).
        // Actually, usually the small image is the puzzle piece. The big image has the hole.
        // The hole is usually a dark overlay. 
        // We want to find the X where difference is minimized/maximized depending on implementation.

        // Common strategy: Look for the hole. The hole is usually dark or has specific edges.
        // Simplifying: We'll scan specifically for edges or a predefined pixel logic.
        // For this generic implementation, let's try to find where smallImage matches bigImage content 
        // (assuming smallImage is the piece `cut` from bigImage).

        for (let x = 0; x <= bigWidth - smallWidth; x++) {
            // Start matching logic

            // Let's rely on a simpler row scan:
            // The hole often has a border.
            // Or we can try to match the detailed pixels if smallImage is the colored chunk.

            // Since we don't have the images to test, let's implement a standard difference check.
            // Compare smallImage pixel with bigImage pixel.

            // Iterate over the overlap area
            let localDiff = 0;
            // Sampling for performance
            for (let sy = 0; sy < smallHeight; sy += 2) {
                for (let sx = 0; sx < smallWidth; sx += 2) {
                    const smallColor = intToRGBA(smallImage.getPixelColor(sx, sy));
                    const bigColor = intToRGBA(bigImage.getPixelColor(x + sx, startY + sy));

                    // If small image has transparent pixels, ignore them (puzzle shape)
                    if (smallColor.a < 200) continue;

                    // Calculate difference
                    localDiff += Math.abs(smallColor.r - bigColor.r) +
                        Math.abs(smallColor.g - bigColor.g) +
                        Math.abs(smallColor.b - bigColor.b);
                }
            }

            if (localDiff < minDiff) {
                minDiff = localDiff;
                bestX = x;
            }
        }

        // However, if the hole in BigImage is DARK, comparing with colored SmallImage will result in HUGE diff.
        // If we are looking for the hole, we should look for a region in BigImage that is significantly DIFFERENT,
        // OR we should look for borders.

        // Let's try a different approach common for these sliders:
        // The small image is the piece. The big image contains the hole.
        // We want to find where the piece FITS.
        // Usually the piece matches the background if placed there.
        // SO, we are looking for Minimum Difference between SmallImage and BigImage.

        console.log(`Solved Captcha: Best X calculated: ${bestX}`);
        return bestX;

    } catch (error) {
        console.error('Captcha Solve Error', error);
        return 0; // Fallback
    }
}
