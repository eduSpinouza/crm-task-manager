'use client';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Link from 'next/link';

const features = [
    {
        icon: <PeopleOutlinedIcon sx={{ fontSize: 36, color: 'primary.main' }} />,
        title: 'Debtor Management',
        description:
            'Centralize all your debtor information. Filter, search, and organize your portfolio to focus on the accounts that need attention.',
    },
    {
        icon: <TaskAltOutlinedIcon sx={{ fontSize: 36, color: 'primary.main' }} />,
        title: 'Task Follow-ups',
        description:
            'Create and track follow-up tasks for each debtor. Never miss a due date or lose track of where a collection case stands.',
    },
    {
        icon: <EmailOutlinedIcon sx={{ fontSize: 36, color: 'primary.main' }} />,
        title: 'Email Campaigns',
        description:
            'Send personalized collection emails directly from your Gmail account. Use templates with automatic placeholder replacement for each debtor.',
    },
    {
        icon: <LockOutlinedIcon sx={{ fontSize: 36, color: 'primary.main' }} />,
        title: 'Secure & Private',
        description:
            'Your Gmail credentials are stored securely and used only to send emails on your behalf. We never read, store, or share your email content.',
    },
];

export default function AboutPage() {
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>

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
                <Typography
                    variant="h6"
                    fontWeight={700}
                    color="primary.main"
                    sx={{ letterSpacing: '-0.5px' }}
                >
                    CobraYa!
                </Typography>
                <Button
                    component={Link}
                    href="/login"
                    variant="contained"
                    size="small"
                    disableElevation
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    Sign In
                </Button>
            </Box>

            {/* Hero */}
            <Box
                sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    py: { xs: 8, md: 12 },
                    px: 2,
                    textAlign: 'center',
                }}
            >
                <Container maxWidth="md">
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        sx={{ fontSize: { xs: '2rem', md: '3rem' }, letterSpacing: '-1px', mb: 2 }}
                    >
                        Debt Collection,
                        <br />
                        Simplified
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{ opacity: 0.88, fontWeight: 400, mb: 5, maxWidth: 560, mx: 'auto' }}
                    >
                        A focused CRM for collection teams. Manage debtors, track follow-ups,
                        and send personalized emails — all in one place.
                    </Typography>
                    <Button
                        component={Link}
                        href="/login"
                        variant="contained"
                        size="large"
                        disableElevation
                        sx={{
                            bgcolor: 'white',
                            color: 'primary.main',
                            fontWeight: 700,
                            px: 5,
                            py: 1.5,
                            borderRadius: 2,
                            '&:hover': { bgcolor: 'grey.100' },
                        }}
                    >
                        Get Started
                    </Button>
                </Container>
            </Box>

            {/* Features */}
            <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
                <Typography
                    variant="h4"
                    fontWeight={700}
                    textAlign="center"
                    mb={1}
                    sx={{ letterSpacing: '-0.5px' }}
                >
                    Everything your team needs
                </Typography>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    textAlign="center"
                    mb={7}
                >
                    Built for collection agents who need speed and clarity.
                </Typography>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
                        gap: 3,
                    }}
                >
                    {features.map((f) => (
                        <Card
                            key={f.title}
                            elevation={0}
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 3,
                                transition: 'box-shadow 0.2s',
                                '&:hover': { boxShadow: 4 },
                            }}
                        >
                            <CardContent sx={{ p: 3 }}>
                                <Box mb={2}>{f.icon}</Box>
                                <Typography variant="subtitle1" fontWeight={700} mb={1}>
                                    {f.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                                    {f.description}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </Container>

            {/* CTA strip */}
            <Box sx={{ bgcolor: 'grey.900', color: 'white', py: 8, px: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} mb={2}>
                    Ready to streamline your collection workflow?
                </Typography>
                <Button
                    component={Link}
                    href="/login"
                    variant="outlined"
                    size="large"
                    sx={{
                        color: 'white',
                        borderColor: 'white',
                        borderRadius: 2,
                        px: 5,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'white' },
                    }}
                >
                    Sign In
                </Button>
            </Box>

            {/* Footer */}
            <Box
                component="footer"
                sx={{
                    bgcolor: 'white',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    py: 4,
                    px: { xs: 2, md: 6 },
                }}
            >
                <Container maxWidth="lg">
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            justifyContent: 'space-between',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            © {new Date().getFullYear()} CobraYa!. All rights reserved.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 3 }}>
                            <Typography
                                component={Link}
                                href="/privacy"
                                variant="body2"
                                color="text.secondary"
                                sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                            >
                                Privacy Policy
                            </Typography>
                            <Typography
                                component="a"
                                href="mailto:eduardo.espinoza.sm@gmail.com"
                                variant="body2"
                                color="text.secondary"
                                sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                            >
                                Contact
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>

        </Box>
    );
}
