import React, { useState, useEffect } from 'react';
import { Mail, Shield, CheckCircle, XCircle, Eye, Lock, Key } from 'lucide-react';

interface EmailViewerProps {
  user: any;
  token: string;
}

interface Email {
  id: number;
  from_email: string;
  to_email: string;
  subject: string;
  encrypted_content: string;
  signature: string;
  sent_at: string;
  sender_name: string;
  sender_public_key: string;
}

export default function EmailViewer({ user, token }: EmailViewerProps) {
  const [activeTab, setActiveTab] = useState('inbox');
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [decryptedContent, setDecryptedContent] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<{verified: boolean, message: string} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [activeTab]);

  const fetchEmails = async () => {
    try {
      const endpoint = activeTab === 'inbox' ? 'inbox' : 'sent';
      const response = await fetch(`http://localhost:3001/api/emails/${endpoint}/${user.email}`);
      const emailData = await response.json();
      setEmails(emailData);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    }
  };

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email);
    setDecryptedContent('');
    setVerificationStatus(null);
    setLoading(true);

    try {
      // Decrypt email content
      const decryptResponse = await fetch('http://localhost:3001/api/emails/decrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encryptedContent: email.encrypted_content,
          privateKey: user.privateKey
        })
      });
      const decryptData = await decryptResponse.json();
      setDecryptedContent(decryptData.content);

      // Verify signature
      const verifyResponse = await fetch('http://localhost:3001/api/emails/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: email.subject,
          content: decryptData.content,
          fromEmail: email.from_email,
          toEmail: email.to_email,
          signature: email.signature,
          senderPublicKey: email.sender_public_key
        })
      });
      const verifyData = await verifyResponse.json();
      setVerificationStatus({
        verified: verifyData.isValid,
        message: verifyData.isValid ? 'Signature verified successfully' : 'Signature verification failed'
      });
    } catch (error) {
      console.error('Failed to process email:', error);
      setVerificationStatus({
        verified: false,
        message: 'Failed to decrypt or verify email'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Email List */}
      <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'sent'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sent
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {emails.length > 0 ? (
            emails.map((email) => (
              <div
                key={email.id}
                onClick={() => handleEmailSelect(email)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedEmail?.id === email.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {email.subject}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {activeTab === 'inbox' ? `From: ${email.sender_name}` : `To: ${email.to_email}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(email.sent_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Shield className="h-4 w-4 text-green-500 ml-2" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center">
              <Mail className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-600">No emails found</p>
            </div>
          )}
        </div>
      </div>

      {/* Email Content */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
        {selectedEmail ? (
          <div className="h-full">
            {/* Email Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedEmail.subject}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>From: {selectedEmail.sender_name} ({selectedEmail.from_email})</span>
                    <span>To: {selectedEmail.to_email}</span>
                    <span>{new Date(selectedEmail.sent_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">Encrypted</span>
                </div>
              </div>

              {/* Verification Status */}
              {verificationStatus && (
                <div className={`mt-4 p-3 rounded-lg border ${
                  verificationStatus.verified
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {verificationStatus.verified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      verificationStatus.verified ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {verificationStatus.message}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Email Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">Decrypting and verifying...</span>
                  </div>
                </div>
              ) : decryptedContent ? (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {decryptedContent}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Security Info */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-start space-x-3">
                <Key className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Security Information:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Message encrypted with hybrid AES+RSA encryption</li>
                    <li>• Digital signature verified using sender's public key</li>
                    <li>• SHA-256 hash algorithm used for integrity verification</li>
                    <li>• Content decrypted using your private key</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Eye className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600">Select an email to view its content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}