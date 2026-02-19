export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Terms of Service | ISIT Game',
};

export default function TermsOfService() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
            <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

            <p className="mb-4 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
                <p className="mb-4">
                    By accessing the ISIT Game website (the "Site"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">2. User Accounts</h2>
                <p className="mb-4">
                    When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">3. Intellectual Property</h2>
                <p className="mb-4">
                    The Service and its original content, features, and functionality are and will remain the exclusive property of ISIT Game and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">4. Termination</h2>
                <p className="mb-4">
                    We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">5. Limitation of Liability</h2>
                <p className="mb-4">
                    In no event shall ISIT Game, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">6. Governing Law</h2>
                <p className="mb-4">
                    These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is established, without regard to its conflict of law provisions.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">7. Changes</h2>
                <p className="mb-4">
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">8. Contact Us</h2>
                <p className="mb-4">
                    If you have any questions about these Terms, please contact us at support@isitgame.com.
                </p>
            </section>
        </div>
    );
}
