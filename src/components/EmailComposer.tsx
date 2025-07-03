import React, { useState, useEffect } from 'react';
import { Send, Shield, Users, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface EmailComposerProps {
  user: any;
  token: string;
}

export default function EmailComposer({ user, token }: EmailComposerProps) {
  const [recipients, setRecipients] = useState([]);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    content: ''
  });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [systemStatus, setSystemStatus] = useState({
    server: 'checking',
    database: 'checking',
    encryption: 'checking'
  });

  useEffect(() => {
    checkSystemHealth();
    fetchRecipients();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/health');
      if (response.ok) {
        setSystemStatus(prev => ({ ...prev, server: 'online' }));
        const data = await response.json();
        console.log('✅ Server health check passed:', data);
      } else {
        setSystemStatus(prev => ({ ...prev, server: 'offline' }));
      }
    } catch (error) {
      console.error('❌ Server health check failed:', error);
      setSystemStatus(prev => ({ ...prev, server: 'offline' }));
    }
  };

  const fetchRecipients = async () => {
    try {
      console.log('🔍 Fetching recipients...');
      const response = await fetch('http://localhost:3001/api/auth/users');
      
      if (response.ok) {
        const users = await response.json();
        const availableRecipients = users.filter((u: any) => u.email !== user.email);
        setRecipients(availableRecipients);
        setSystemStatus(prev => ({ ...prev, database: 'online' }));
        console.log('✅ Recipients fetched:', availableRecipients.length);
      } else {
        console.error('❌ Failed to fetch recipients:', response.status);
        setSystemStatus(prev => ({ ...prev, database: 'offline' }));
      }
    } catch (error) {
      console.error('❌ Network error fetching recipients:', error);
      setSystemStatus(prev => ({ ...prev, database: 'offline' }));
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!emailData.to.trim()) {
      errors.push('Please select a recipient');
    }
    
    if (!emailData.subject.trim()) {
      errors.push('Please enter a subject');
    }
    
    if (!emailData.content.trim()) {
      errors.push('Please enter message content');
    }
    
    if (emailData.content.length > 10000) {
      errors.push('Message content is too long (max 10,000 characters)');
    }
    
    if (!user.privateKey) {
      errors.push('Private key not available - please log out and log back in');
    }
    
    return errors;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous messages
    setMessage({ type: '', text: '' });
    
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setMessage({ 
        type: 'error', 
        text: validationErrors.join('. ') 
      });
      return;
    }

    setSending(true);
    console.log('📧 Starting email send process...');

    try {
      const requestPayload = {
        fromEmail: user.email,
        toEmail: emailData.to,
        subject: emailData.subject.trim(),
        content: emailData.content.trim(),
        privateKey: user.privateKey
      };

      console.log('📤 Sending request:', {
        fromEmail: requestPayload.fromEmail,
        toEmail: requestPayload.toEmail,
        subject: requestPayload.subject,
        contentLength: requestPayload.content.length,
        hasPrivateKey: !!requestPayload.privateKey
      });

      const response = await fetch('http://localhost:3001/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📨 Response status:', response.status);
      
      const result = await response.json();
      console.log('📨 Response data:', result);

      if (response.ok && result.success) {
        setMessage({ 
          type: 'success', 
          text: `Email sent successfully! Message encrypted and digitally signed. Email ID: ${result.emailId}` 
        });
        
        // Clear form
        setEmailData({ to: '', subject: '', content: '' });
        
        // Update system status
        setSystemStatus(prev => ({ 
          ...prev, 
          encryption: 'online',
          database: 'online'
        }));
        
      } else {
        console.error('❌ Send failed:', result);
        setMessage({ 
          type: 'error', 
          text: result.error || result.details || 'Failed to send email - unknown error' 
        });
      }

    } catch (error) {
      console.error('❌ Network error during send:', error);
      setMessage({ 
        type: 'error', 
        text: `Network error: ${error.message}. Please check if the server is running on port 3001.` 
      });
      
      setSystemStatus(prev => ({ ...prev, server: 'offline' }));
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'checking': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '✅';
      case 'offline': return '❌';
      case 'checking': return '🔄';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Compose Secure Email</h2>
              <p className="text-sm text-gray-600">End-to-end encrypted communication</p>
            </div>
          </div>
          
          <button
            onClick={checkSystemHealth}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded-md hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-3">System Status</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span>{getStatusIcon(systemStatus.server)}</span>
            <span className="text-gray-600">Server:</span>
            <span className={`font-medium ${getStatusColor(systemStatus.server)}`}>
              {systemStatus.server}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{getStatusIcon(systemStatus.database)}</span>
            <span className="text-gray-600">Database:</span>
            <span className={`font-medium ${getStatusColor(systemStatus.database)}`}>
              {systemStatus.database}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🔐</span>
            <span className="text-gray-600">User Keys:</span>
            <span className={`font-medium ${user.privateKey ? 'text-green-600' : 'text-red-600'}`}>
              {user.privateKey ? 'Available' : 'Missing'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSend} className="p-6 space-y-6">
        {/* Recipient Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient *
          </label>
          <select
            required
            value={emailData.to}
            onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={recipients.length === 0}
          >
            <option value="">
              {recipients.length === 0 ? 'Loading recipients...' : 'Select a recipient...'}
            </option>
            {recipients.map((recipient: any) => (
              <option key={recipient.id} value={recipient.email}>
                {recipient.name} ({recipient.email})
              </option>
            ))}
          </select>
          {recipients.length === 0 && (
            <p className="text-sm text-amber-600 mt-1 flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>No recipients available. Register additional users to send emails.</span>
            </p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject *
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={emailData.subject}
            onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter email subject"
          />
          <p className="text-xs text-gray-500 mt-1">
            {emailData.subject.length}/200 characters
          </p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Content *
          </label>
          <textarea
            required
            rows={8}
            maxLength={10000}
            value={emailData.content}
            onChange={(e) => setEmailData({ ...emailData, content: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Type your secure message here..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {emailData.content.length}/10,000 characters
          </p>
        </div>

        {/* Security Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Security Features Applied:</p>
              <ul className="space-y-1">
                <li>• Hybrid AES-256 + RSA-2048 encryption</li>
                <li>• SHA-256 digital signature for authenticity</li>
                <li>• End-to-end encryption using recipient's public key</li>
                <li>• Non-repudiation through cryptographic signing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {message.text && (
          <div className={`border rounded-lg p-4 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start space-x-2">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 mt-0.5" />
              )}
              <div>
                <p className="font-medium">
                  {message.type === 'success' ? 'Success!' : 'Error'}
                </p>
                <p className="text-sm mt-1">{message.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={sending || recipients.length === 0 || !user.privateKey || systemStatus.server === 'offline'}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Encrypting and Sending...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Send Encrypted Email</span>
            </div>
          )}
        </button>

        {/* Disabled Button Help */}
        {(recipients.length === 0 || !user.privateKey || systemStatus.server === 'offline') && (
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Cannot send email:</p>
            <ul className="space-y-1">
              {recipients.length === 0 && <li>• No recipients available</li>}
              {!user.privateKey && <li>• Private key missing (please re-login)</li>}
              {systemStatus.server === 'offline' && <li>• Server is offline</li>}
            </ul>
          </div>
        )}
      </form>
      
    </div>
  );
}