export const metadata = {
    title: 'Privacy Policy | ISIT Game',
};

export default function PrivacyPolicy() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
            <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

            <p className="mb-4 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                <p className="mb-4">
                    Welcome to ISIT Game ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
                    If you have any questions or concerns about this privacy notice or our practices with regards to your personal information, please contact us.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
                <p className="mb-4">
                    We collect personal information that you voluntarily provide to us when you register on the website, use our services, or contact us.
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>Personal Information Provided by You:</strong> Names, email addresses, and profile images (via social login).</li>
                    <li><strong>Social Login Data:</strong> We may provide you with the option to register with us using your existing social media account details, like your Google, Facebook, or other social media account.</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
                <p className="mb-4">
                    We use personal information collected via our website for a variety of business purposes described below:
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                    <li><strong>To facilitate account creation and logon process.</strong> If you choose to link your account with us to a third-party account (such as your Google or Facebook account), we use the information you allowed us to collect from those third parties to facilitate account creation and logon preparation.</li>
                    <li><strong>To manage user accounts.</strong> We may use your information for the purposes of managing our account and keeping it in working order.</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">4. Sharing Your Information</h2>
                <p className="mb-4">
                    We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">5. Contact Us</h2>
                <p className="mb-4">
                    If you have questions or comments about this policy, you may email us at support@isitgame.com.
                </p>
            </section>
        </div>
    );
}
