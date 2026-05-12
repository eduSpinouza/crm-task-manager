'use client';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Link from 'next/link';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const CONTACT_EMAIL = 'eduardo.espinoza.sm@gmail.com';
const APP_URL = 'https://crm-task-manager-three.vercel.app';
const LAST_UPDATED = 'May 10, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Box mb={5}>
            <Typography variant="h6" fontWeight={700} mb={1.5} color="text.primary">
                {title}
            </Typography>
            {children}
        </Box>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return (
        <Typography variant="body1" color="text.secondary" lineHeight={1.8} mb={2}>
            {children}
        </Typography>
    );
}

function Ul({ items }: { items: string[] }) {
    return (
        <Box component="ul" sx={{ pl: 3, mt: 0, mb: 2 }}>
            {items.map((item, i) => (
                <Typography component="li" key={i} variant="body1" color="text.secondary" lineHeight={1.8}>
                    {item}
                </Typography>
            ))}
        </Box>
    );
}

export default function PrivacyPage() {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>

            {/* Nav */}
            <Box
                component="header"
                sx={{
                    bgcolor: 'white',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    py: 2,
                    px: { xs: 2, md: 6 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Typography variant="h6" fontWeight={700} color="primary.main">
                    CobraYa!
                </Typography>
                <Button
                    component={Link}
                    href="/about"
                    startIcon={<ArrowBackIcon />}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                >
                    Back
                </Button>
            </Box>

            <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>

                {/* Header */}
                <Typography variant="h3" fontWeight={800} mb={1} sx={{ letterSpacing: '-1px' }}>
                    Privacy Policy
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                    Last updated: {LAST_UPDATED}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={5}>
                    Effective URL:{' '}
                    <Typography component="span" variant="body2" color="primary.main">
                        {APP_URL}/privacy
                    </Typography>
                </Typography>

                <Divider sx={{ mb: 5 }} />

                {/* 1 */}
                <Section title="1. Overview">
                    <P>
                        CobraYa! (&quot;the App&quot;, &quot;we&quot;, &quot;us&quot;) is a web-based
                        customer relationship management tool designed to help debt collection teams manage
                        debtors, track follow-up tasks, and send collection emails. This Privacy Policy explains
                        how we collect, use, and protect your information when you use the App, including when
                        you connect a Google account.
                    </P>
                    <P>
                        By using the App, you agree to the collection and use of information as described in
                        this policy. If you do not agree, please discontinue use.
                    </P>
                </Section>

                {/* 2 */}
                <Section title="2. Information We Collect">
                    <P>We collect the following categories of information:</P>
                    <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.primary">
                        Account Information
                    </Typography>
                    <Ul items={[
                        'Username and hashed password (stored in our database — plaintext passwords are never stored)',
                        'User role (admin or standard user)',
                        'Session tokens (stored temporarily, invalidated on logout or new login)',
                    ]} />
                    <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.primary">
                        Google Account Data (when you connect Gmail)
                    </Typography>
                    <Ul items={[
                        'Your Gmail address (e.g. yourname@gmail.com) — obtained via Google\'s userinfo endpoint after you grant permission',
                        'A Google OAuth refresh token — used solely to send emails on your behalf via Gmail',
                    ]} />
                    <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.primary">
                        Data We Do NOT Collect
                    </Typography>
                    <Ul items={[
                        'Email content (subjects, bodies, or recipient addresses are never stored on our servers)',
                        'Your Gmail inbox, sent mail, or any other Gmail data',
                        'Payment information',
                        'Any data beyond what is necessary to operate the App',
                    ]} />
                </Section>

                {/* 3 */}
                <Section title="3. How We Use Your Information">
                    <P>We use the information collected solely to operate and improve the App:</P>
                    <Ul items={[
                        'To authenticate you and maintain a secure session',
                        'To send emails to debtors on your behalf using your connected Gmail account',
                        'To display your connected Gmail address in the Settings panel',
                        'To enforce single-session security (a new login invalidates previous sessions)',
                    ]} />
                    <P>
                        We do not use your information for advertising, profiling, data brokering, or any
                        purpose unrelated to providing the App&apos;s core functionality.
                    </P>
                </Section>

                {/* 4 — Critical Google section */}
                <Section title="4. Google API Services and Gmail Data">
                    <P>
                        The App integrates with Google&apos;s Gmail API to allow you to send emails directly
                        from your Gmail account. This integration requires you to explicitly grant permission
                        through Google&apos;s OAuth 2.0 consent flow.
                    </P>
                    <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.primary">
                        What we access
                    </Typography>
                    <Ul items={[
                        'Permission to send emails via Gmail on your behalf (https://mail.google.com/ scope)',
                        'Your Gmail address to identify the connected account',
                    ]} />
                    <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.primary">
                        What we do with it
                    </Typography>
                    <Ul items={[
                        'Your Gmail address is stored in our database to display in the Settings panel',
                        'The OAuth refresh token is stored securely to enable ongoing email sending without requiring you to log in to Google each time',
                        'Email content (subject lines, body text, recipient addresses) is processed in memory only and transmitted directly to Gmail — it is never written to our database or logs',
                    ]} />
                    <Typography variant="subtitle2" fontWeight={600} mb={1} color="text.primary">
                        Revoking access
                    </Typography>
                    <P>
                        You can disconnect your Gmail account at any time from the Settings panel inside the
                        App. This immediately deletes the stored refresh token and revokes the App&apos;s
                        access. You can also revoke access directly from your{' '}
                        <Typography
                            component="a"
                            href="https://myaccount.google.com/permissions"
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="body1"
                            color="primary.main"
                            sx={{ textDecoration: 'none' }}
                        >
                            Google Account permissions page
                        </Typography>
                        .
                    </P>

                    {/* Mandatory Google compliance statement */}
                    <Box
                        sx={{
                            bgcolor: 'primary.50',
                            border: '1px solid',
                            borderColor: 'primary.200',
                            borderRadius: 2,
                            p: 3,
                            mt: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
                            <strong>Google API Limited Use Disclosure:</strong> CobraYa!&apos;s use of
                            information received from Google APIs will adhere to the{' '}
                            <Typography
                                component="a"
                                href="https://developers.google.com/terms/api-services-user-data-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="body2"
                                color="primary.main"
                                sx={{ textDecoration: 'none' }}
                            >
                                Google API Services User Data Policy
                            </Typography>
                            , including the Limited Use requirements.
                        </Typography>
                    </Box>
                </Section>

                {/* 5 */}
                <Section title="5. Data Storage and Security">
                    <P>
                        User account data and Gmail OAuth tokens are stored in Upstash Redis, a managed
                        cloud database with encryption at rest and in transit. We apply the following
                        security practices:
                    </P>
                    <Ul items={[
                        'Passwords are hashed using bcrypt before storage — plaintext passwords are never stored',
                        'Session tokens are invalidated on logout and upon new login from another device',
                        'OAuth tokens are stored server-side only — they are never exposed to the browser',
                        'All communication between the App and external services uses HTTPS/TLS',
                        'The App enforces single-session policy: a new login automatically terminates prior sessions',
                    ]} />
                </Section>

                {/* 6 */}
                <Section title="6. Data Sharing and Third Parties">
                    <P>
                        We do not sell, rent, or share your personal data with third parties for commercial
                        purposes. Data is shared only with the following service providers, strictly to
                        operate the App:
                    </P>
                    <Ul items={[
                        'Upstash Redis — cloud database for session and account storage (upstash.com)',
                        'Vercel — cloud hosting platform where the App runs (vercel.com)',
                        'Google — for Gmail OAuth authentication and email delivery',
                    ]} />
                    <P>
                        Each of these providers maintains their own privacy policies and security practices.
                        We do not grant them permission to use your data for any purpose other than
                        providing their services to us.
                    </P>
                </Section>

                {/* 7 */}
                <Section title="7. Data Retention">
                    <P>
                        We retain your data for as long as your account exists within the App. Specifically:
                    </P>
                    <Ul items={[
                        'Account credentials and session data: retained while the account is active; deleted when removed by an administrator',
                        'Gmail OAuth tokens: retained until you disconnect your Gmail account from Settings, or until an administrator removes your account',
                        'Email content: never retained — processed in memory and discarded immediately after sending',
                    ]} />
                </Section>

                {/* 8 */}
                <Section title="8. Your Rights">
                    <P>
                        You have the right to:
                    </P>
                    <Ul items={[
                        'Access the personal data we hold about you — contact us at the email below',
                        'Request correction of inaccurate data',
                        'Request deletion of your account and associated data by contacting an administrator',
                        'Revoke Gmail access at any time from the Settings panel or from your Google Account',
                        'Withdraw consent for data processing, which will require discontinuing use of the App',
                    ]} />
                </Section>

                {/* 9 */}
                <Section title="9. Children's Privacy">
                    <P>
                        The App is intended for professional use by adults. We do not knowingly collect
                        personal information from individuals under 18 years of age. If you believe a minor
                        has provided us with personal information, please contact us immediately.
                    </P>
                </Section>

                {/* 10 */}
                <Section title="10. Changes to This Policy">
                    <P>
                        We may update this Privacy Policy from time to time. When we do, we will update
                        the &quot;Last updated&quot; date at the top of this page. Continued use of the App
                        after changes are posted constitutes your acceptance of the updated policy.
                        We encourage you to review this page periodically.
                    </P>
                </Section>

                {/* 11 */}
                <Section title="11. Contact">
                    <P>
                        If you have any questions, concerns, or requests regarding this Privacy Policy or
                        your personal data, please contact us at:
                    </P>
                    <Typography
                        component="a"
                        href={`mailto:${CONTACT_EMAIL}`}
                        variant="body1"
                        color="primary.main"
                        sx={{ textDecoration: 'none', fontWeight: 600 }}
                    >
                        {CONTACT_EMAIL}
                    </Typography>
                </Section>

                <Divider sx={{ my: 5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        © {new Date().getFullYear()} CobraYa!
                    </Typography>
                    <Button
                        component={Link}
                        href="/about"
                        startIcon={<ArrowBackIcon />}
                        size="small"
                        color="primary"
                    >
                        Back to Home
                    </Button>
                </Box>

            </Container>
        </Box>
    );
}
