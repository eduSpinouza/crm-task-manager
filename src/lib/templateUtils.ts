export interface TemplateUser {
    userName?: string;
    email?: string;
    phone?: string;
    appName?: string;
    productName?: string;
    principal?: number;
    totalAmount?: number;      // contract amount
    repayAmount?: number;      // total amount due
    overdueFee?: number;
    overdueDay?: number;
    totalExtensionAmount?: number;
    repayTime?: string;
    stageName?: string;
    idNoUrl?: string;
    livingNessUrl?: string;
    [key: string]: any;
}

/**
 * Replace {{placeholder}} tokens in a template string with user data.
 *
 * mode 'text'  — plain text output (for WhatsApp / Telegram / SMS).
 *                Image placeholders are stripped (empty string).
 *                Newlines are preserved as-is.
 *
 * mode 'html'  — HTML output (for email).
 *                Image placeholders wrap the URL in an <img> tag.
 *                Trailing newlines are converted to <br> tags.
 */
export function replacePlaceholders(
    template: string,
    user: TemplateUser,
    mode: 'text' | 'html' = 'text'
): string {
    const placeholders: Record<string, string> = {
        '{{userName}}':        user.userName       || '',
        '{{email}}':           user.email          || '',
        '{{phone}}':           user.phone          || '',
        '{{appName}}':         user.appName        || '',
        '{{productName}}':     user.productName    || '',
        '{{principal}}':       String(user.principal       ?? ''),
        '{{contractAmount}}':  String(user.totalAmount     ?? ''),
        '{{totalAmount}}':     String(user.repayAmount     ?? ''),
        '{{overdueFee}}':      String(user.overdueFee      ?? ''),
        '{{overdueDay}}':      String(user.overdueDay      ?? ''),
        '{{extensionAmount}}': String(user.totalExtensionAmount ?? ''),
        '{{repayTime}}':       user.repayTime   || '',
        '{{stageName}}':       user.stageName   || '',
        '{{idNoUrl}}': mode === 'html' && user.idNoUrl
            ? `<img src="${user.idNoUrl}" width="200" style="max-width:100%;" />`
            : '',
        '{{livingNessUrl}}': mode === 'html' && user.livingNessUrl
            ? `<img src="${user.livingNessUrl}" width="200" style="max-width:100%;" />`
            : '',
    };

    let result = template;
    for (const [token, value] of Object.entries(placeholders)) {
        result = result.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    if (mode === 'html') {
        result = result.replace(/\n/g, '<br>\n');
    }

    return result;
}
