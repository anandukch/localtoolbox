import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode-generator';

interface QRTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  placeholder: string;
  generate: (data: any) => string;
  fields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'email' | 'tel';
    placeholder: string;
  }>;
}

export const QRCodeGenerator: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [qrDataURL, setQrDataURL] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('text');
  const [qrSize, setQrSize] = useState<number>(256);
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [templateData, setTemplateData] = useState<{[key: string]: string}>({});
  const [copySuccess, setCopySuccess] = useState<string>('');

  // QR Code templates
  const templates: QRTemplate[] = [
    {
      id: 'text',
      name: 'Text',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>,
      placeholder: 'Enter any text...',
      generate: (data) => data.text || ''
    },
    {
      id: 'url',
      name: 'URL',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
      placeholder: 'https://example.com',
      generate: (data) => data.url || ''
    },
    {
      id: 'wifi',
      name: 'WiFi',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>,
      placeholder: 'WiFi network details',
      generate: (data) => `WIFI:T:${data.security || 'WPA'};S:${data.ssid || ''};P:${data.password || ''};H:${data.hidden || 'false'};;`,
      fields: [
        { key: 'ssid', label: 'Network Name (SSID)', type: 'text', placeholder: 'MyWiFiNetwork' },
        { key: 'password', label: 'Password', type: 'password', placeholder: 'password123' },
        { key: 'security', label: 'Security Type', type: 'text', placeholder: 'WPA (WPA/WEP/nopass)' }
      ]
    },
    {
      id: 'email',
      name: 'Email',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      placeholder: 'Email details',
      generate: (data) => `mailto:${data.email || ''}?subject=${encodeURIComponent(data.subject || '')}&body=${encodeURIComponent(data.body || '')}`,
      fields: [
        { key: 'email', label: 'Email Address', type: 'email', placeholder: 'contact@example.com' },
        { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Hello!' },
        { key: 'body', label: 'Message', type: 'text', placeholder: 'Your message here...' }
      ]
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
      placeholder: 'SMS details',
      generate: (data) => `sms:${data.phone || ''}?body=${encodeURIComponent(data.message || '')}`,
      fields: [
        { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1234567890' },
        { key: 'message', label: 'Message', type: 'text', placeholder: 'Hello from QR code!' }
      ]
    },
    {
      id: 'phone',
      name: 'Phone',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
      placeholder: '+1234567890',
      generate: (data) => `tel:${data.phone || ''}`
    }
  ];

  // Generate QR code
  const generateQR = useCallback((text: string) => {
    if (!text.trim()) {
      setQrDataURL('');
      return;
    }

    try {
      const qr = QRCode(0, errorCorrection);
      qr.addData(text);
      qr.make();
      
      const cellSize = Math.floor(qrSize / qr.getModuleCount());
      const margin = Math.floor(cellSize * 2);
      
      setQrDataURL(qr.createDataURL(cellSize, margin));
    } catch (error) {
      console.error('QR generation failed:', error);
      setQrDataURL('');
    }
  }, [qrSize, errorCorrection]);

  // Get current template
  const currentTemplate = templates.find(t => t.id === selectedTemplate) || templates[0];

  // Generate text based on template
  const getGeneratedText = useCallback(() => {
    if (selectedTemplate === 'text' || selectedTemplate === 'url' || selectedTemplate === 'phone') {
      return inputText;
    } else {
      return currentTemplate.generate(templateData);
    }
  }, [selectedTemplate, inputText, templateData, currentTemplate]);

  // Update QR when inputs change
  useEffect(() => {
    const text = getGeneratedText();
    generateQR(text);
  }, [getGeneratedText, generateQR]);

  // Handle template data change
  const handleTemplateDataChange = (key: string, value: string) => {
    setTemplateData(prev => ({ ...prev, [key]: value }));
  };

  // Download QR code
  const downloadQR = (format: 'png' | 'svg') => {
    if (!qrDataURL) return;

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `qrcode-${Date.now()}.png`;
      link.href = qrDataURL;
      link.click();
    } else {
      // Generate SVG
      try {
        const qr = QRCode(0, errorCorrection);
        qr.addData(getGeneratedText());
        qr.make();
        
        const svgString = qr.createSvgTag(4, 0);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `qrcode-${Date.now()}.svg`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('SVG generation failed:', error);
      }
    }
    
    setCopySuccess('Downloaded!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    if (!qrDataURL) return;

    try {
      const response = await fetch(qrDataURL);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopySuccess('Copied to clipboard!');
    } catch (error) {
      // Fallback: copy the text instead
      try {
        await navigator.clipboard.writeText(getGeneratedText());
        setCopySuccess('Text copied to clipboard!');
      } catch (textError) {
        setCopySuccess('Copy failed');
      }
    }
    
    setTimeout(() => setCopySuccess(''), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0D0E10] text-white">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">
            QR Code Generator
          </h1>
          <p className="text-gray-400 text-sm">
            Create QR codes for text, URLs, WiFi, contacts, and more
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* Template Selection */}
            <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
              <h2 className="text-lg font-medium text-white mb-4">QR Code Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setInputText('');
                      setTemplateData({});
                    }}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-colors duration-200 ${
                      selectedTemplate === template.id
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#2A2B2E] border-[#3A3B3E] text-gray-300 hover:bg-[#3A3B3E]'
                    }`}
                  >
                    {template.icon}
                    <span className="text-sm mt-1">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Fields */}
            <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
              <h2 className="text-lg font-medium text-white mb-4">Content</h2>
              
              {currentTemplate.fields ? (
                <div className="space-y-4">
                  {currentTemplate.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={templateData[field.key] || ''}
                        onChange={(e) => handleTemplateDataChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={currentTemplate.placeholder}
                  className="w-full h-32 px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white resize-none focus:outline-none focus:border-blue-500"
                />
              )}
              
              {/* Character count */}
              <div className="mt-2 text-xs text-gray-400">
                Characters: {getGeneratedText().length} / 2953 (max for QR)
              </div>
            </div>

            {/* Settings */}
            <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
              <h2 className="text-lg font-medium text-white mb-4">Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Size</label>
                  <select
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500 appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value={128}>Small (128px)</option>
                    <option value={256}>Medium (256px)</option>
                    <option value={512}>Large (512px)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Error Correction</label>
                  <select
                    value={errorCorrection}
                    onChange={(e) => setErrorCorrection(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                    className="w-full px-3 py-2 bg-[#2A2B2E] border border-[#3A3B3E] rounded-lg text-white focus:outline-none focus:border-blue-500 appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="L">Low (~7%)</option>
                    <option value="M">Medium (~15%)</option>
                    <option value="Q">Quartile (~25%)</option>
                    <option value="H">High (~30%)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Output Panel */}
          <div className="space-y-6">
            {/* QR Code Display */}
            <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">QR Code</h2>
                {copySuccess && (
                  <span className="text-green-400 text-sm">{copySuccess}</span>
                )}
              </div>
              
              <div className="flex flex-col items-center">
                {qrDataURL ? (
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <img src={qrDataURL} alt="QR Code" className="block" />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-[#2A2B2E] border-2 border-dashed border-[#3A3B3E] rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <p className="text-gray-500 text-sm">Enter content to generate QR code</p>
                    </div>
                  </div>
                )}
                
                {qrDataURL && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={copyToClipboard}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => downloadQR('png')}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      PNG
                    </button>
                    <button
                      onClick={() => downloadQR('svg')}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      SVG
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Generated Text Preview */}
            {getGeneratedText() && (
              <div className="bg-[#1A1B1E] rounded-xl p-6 border border-[#2A2B2E]">
                <h3 className="text-lg font-medium text-white mb-3">Generated Content</h3>
                <div className="bg-[#0D0E10] rounded-lg p-3">
                  <code className="text-sm text-gray-300 break-all">{getGeneratedText()}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
