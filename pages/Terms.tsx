import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-blake-950 text-blake-200 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/login" className="flex items-center text-blake-400 hover:text-white transition-colors mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Back to Login
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-light text-white">Terms and Conditions</h1>
          </div>
          <p className="text-blake-500 text-sm font-mono">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-8 bg-blake-900/30 border border-blake-800 p-8 rounded-lg">
          
          <section>
            <h2 className="text-xl font-medium text-white mb-4 border-b border-blake-800 pb-2">1. Introduction</h2>
            <p className="text-blake-300 leading-relaxed">
              Welcome to the Blake Association platform. By accessing or using our services, you agree to be bound by these terms. 
              This platform is designed as an academic collaboration network for students and researchers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-4 border-b border-blake-800 pb-2">2. Service Disclaimer</h2>
            <p className="text-blake-300 leading-relaxed">
              The service is provided "as is" without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-4 border-b border-blake-800 pb-2">3. User Responsibilities</h2>
            <div className="text-blake-300 leading-relaxed space-y-2">
              <p>Users are solely responsible for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Maintaining the security of their account credentials.</li>
                <li>All activities that occur under their account.</li>
                <li>Ensuring their contributions adhere to academic integrity standards.</li>
                <li>Refraining from using the platform for cheating, plagiarism, or any illegal activities.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-4 border-b border-blake-800 pb-2">4. Limitation of Liability</h2>
            <p className="text-blake-300 leading-relaxed mb-4">
              The website owner and administrators are not responsible or liable for:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-blake-300">
              <li>User-generated content, including messages, listings, and Q&A posts.</li>
              <li>The accuracy, completeness, or reliability of any academic information shared by users.</li>
              <li>Transactions made using platform points or any disputes arising from such transactions.</li>
              <li>Any direct, indirect, incidental, or consequential damages resulting from the use of the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-white mb-4 border-b border-blake-800 pb-2">5. Content Moderation</h2>
            <p className="text-blake-300 leading-relaxed">
              We reserve the right, but have no obligation, to monitor user content. We may remove any content or suspend any account that we determine, in our sole discretion, violates these terms, harms the community, or is otherwise objectionable.
            </p>
          </section>

          <div className="pt-8 border-t border-blake-800 text-center">
            <p className="text-blake-500 text-sm">
              By continuing to use the Blake Association platform, you acknowledge that you have read, understood, and agree to these terms.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
