import React from 'react';

const TermsOfService = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Terms of Service</h1>
        <p className="text-gray-500 mb-6">Last Updated: 7/29/2024</p>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p className="mb-4">
            By accessing or using <span className="font-semibold">MyBrickLog.com</span> ("we," "us," or "our"), you agree to be bound by these
            Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our website
            <span className="font-semibold"> MyBrickLog.com</span> (the "Site").
          </p>
          
          <p className="mb-6">
            This website, <span className="font-semibold">MyBrickLog.com</span>, is a fan-operated site and is not officially associated with LEGO Group or its affiliates. 
            All LEGO trademarks, logos, and other intellectual property are the property of LEGO Group and its licensors. 
            The use of LEGO-related content on this site is for fan enjoyment and is used in compliance with intellectual property laws.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">1. User Accounts</h2>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><span className="font-semibold">Registration:</span> To access certain features of the Site, you may need to create an account. You must provide accurate and complete information during the registration process.</li>
            <li><span className="font-semibold">Account Security:</span> You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. Notify us immediately of any unauthorized use of your account.</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">2. Acceptable Use</h2>
          <p className="mb-2">
            <span className="font-semibold">Prohibited Conduct:</span> You agree not to use the Site for any unlawful or prohibited activities, including but not limited to:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Using or selecting a username that is offensive, defamatory, or contains profanity.</li>
            <li>Attempting to gain unauthorized access to the Site, other user accounts, or any computer systems or networks connected to the Site.</li>
            <li>Engaging in any activity that disrupts or interferes with the Site or the servers and networks hosting the Site.</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">3. User Content</h2>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><span className="font-semibold">Responsibility:</span> You are responsible for any content you post or share on the Site. You agree not to post any content that is illegal, harmful, or violates the rights of others.</li>
            <li><span className="font-semibold">Rights:</span> By posting content on the Site, you grant us a non-exclusive, royalty-free, worldwide license to use, display, and distribute your content in connection with the Site.</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">4. Intellectual Property</h2>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><span className="font-semibold">Ownership:</span> The content, design, and layout of the Site, including trademarks, logos, and software, are owned by us or our licensors and are protected by intellectual property laws.</li>
            <li><span className="font-semibold">Restrictions:</span> You may not copy, modify, distribute, or reverse engineer any part of the Site without our express written permission.</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">5. Disclaimers and Limitation of Liability</h2>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Disclaimer: The Site is provided on an "as-is" and "as-available" basis. We make no warranties or representations regarding the accuracy, completeness, or reliability of the Site.</li>
            <li>Limitation of Liability: To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Site.</li>
          </ul>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">6. Termination</h2>
          <p className="mb-6">
            We reserve the right to suspend or terminate your account and access to the Site at our discretion, without notice, for any reason, including a breach of these Terms.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">7. Changes to These Terms</h2>
          <p className="mb-6">
            We may update these Terms from time to time. We will notify you of any changes by posting the new Terms on the Site. Your continued use of the Site after any changes constitutes your acceptance of the new Terms.
          </p>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">8. Governing Law</h2>
          <p className="mb-6">
            These Terms are governed by and construed in accordance with the laws of [Your Country/State], without regard to its conflict of law principles.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;