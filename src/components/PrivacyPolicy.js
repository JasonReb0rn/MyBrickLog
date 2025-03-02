import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Privacy Policy</h1>
        <p className="text-gray-500 mb-6">Last Updated: 7/29/2024</p>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p className="mb-4">
            Welcome to <span className="font-semibold">MyBrickLog.com</span> ("we," "us," or "our"). We value your privacy and are
            committed to protecting your personal information. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you visit our website <span className="font-semibold">MyBrickLog.com</span> (the "Site"). 
            By using the Site, you agree to the terms of this Privacy Policy.
          </p>
          
          <p className="mb-6">
            Please note that <span className="font-semibold">MyBrickLog.com</span> is a fan site and is not affiliated with, endorsed by, or sponsored by LEGO Group 
            or its affiliates. LEGO and its associated trademarks, logos, and other intellectual property are owned by LEGO Group 
            and its licensors. The use of LEGO assets and branding on this site is intended for fan purposes and complies with 
            intellectual property laws.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">1. Information We Collect</h2>
          <p className="mb-2">
            We may collect the following types of information:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><span className="font-semibold">Personal Information:</span> When you create an account, we collect personal information, such as your username, email address, and password.</li>
            <li><span className="font-semibold">Non-Personal Information:</span> We may collect non-personal information, such as browser type, IP address, and data about your interactions with the Site.</li>
            <li><span className="font-semibold">Cookies and Tracking Technologies:</span> We use cookies and similar tracking technologies to enhance your experience, analyze site traffic, and for marketing purposes.</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="mb-2">
            We use the information we collect for various purposes, including:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>To provide and maintain our services.</li>
            <li>To manage your account and respond to your requests.</li>
            <li>To improve and personalize your experience on the Site.</li>
            <li>To communicate with you, including sending you updates, newsletters, and promotional materials.</li>
            <li>To analyze and understand how our services are used and to enhance the Site's functionality.</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">3. Information Sharing and Disclosure</h2>
          <p className="mb-2">
            We do not sell or rent your personal information to third parties. However, we may share your information in the following circumstances:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><span className="font-semibold">With Service Providers:</span> We may share information with third-party vendors who assist us in operating the Site, conducting our business, or serving our users.</li>
            <li><span className="font-semibold">Legal Requirements:</span> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
            <li><span className="font-semibold">Business Transfers:</span> In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of the transaction.</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">4. Data Security</h2>
          <p className="mb-6">
            We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">5. Your Rights</h2>
          <p className="mb-2">
            Depending on your jurisdiction, you may have the following rights regarding your personal information:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><span className="font-semibold">Access and Update:</span> You can access and update your personal information through your account settings.</li>
            <li><span className="font-semibold">Deletion:</span> You may request the deletion of your personal information by contacting us at <span className="font-semibold">legal@mybricklog.com</span>.</li>
            <li><span className="font-semibold">Withdrawal of Consent:</span> You can withdraw your consent to our data processing at any time by deleting your account or contacting us.</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">6. Cookies and Tracking Technologies</h2>
          <p className="mb-6">
            We use cookies and similar technologies to collect non-personal information and enhance your experience. You can control cookie settings through your browser settings.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">7. Changes to This Privacy Policy</h2>
          <p className="mb-6">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on the Site. You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;