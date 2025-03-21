import React, { useState, useRef, useEffect } from 'react';
import './AzureDocChat.css';
import logo from './logo.png';

const AzureDocChat = () => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Effect for automatic scrolling when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Function to handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    // Add user message to chat
    const userMessage = { role: 'user', content: currentMessage };
    setMessages([...messages, userMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
      // Call to Azure AI Foundry (Azure OpenAI)
      const response = await fetch(`${process.env.REACT_APP_AZURE_AI_ENDPOINT}/openai/deployments/${process.env.REACT_APP_AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2023-05-15`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.REACT_APP_AZURE_AI_KEY
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prevMessages => [
        ...prevMessages,
        { role: 'assistant', content: data.choices[0].message.content }
      ]);
    } catch (error) {
      console.error('Error communicating with Azure AI:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          role: 'assistant', 
          content: 'Sorry, there was an error processing your request. Please check the connection to Azure services.' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Function to upload files to Blob Storage
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Basic validation of file types
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type) && 
        !(file.name.endsWith('.pdf') || file.name.endsWith('.doc') || 
          file.name.endsWith('.docx') || file.name.endsWith('.txt'))) {
      setUploadStatus('error');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'The file format is not compatible. Please upload PDF, DOC, DOCX, or TXT files.'
      }]);
      setTimeout(() => setUploadStatus(null), 3000);
      fileInputRef.current.value = '';
      return;
    }

    if (file.size > maxSize) {
      setUploadStatus('error');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'The file is too large. The maximum allowed size is 10MB.'
      }]);
      setTimeout(() => setUploadStatus(null), 3000);
      fileInputRef.current.value = '';
      return;
    }

    try {
      const blobName = `${Date.now()}-${file.name}`;
      const blobUrl = `${process.env.REACT_APP_STORAGE_URL}${process.env.REACT_APP_CONTAINER_NAME}/${blobName}${process.env.REACT_APP_SAS_TOKEN}`;
      
      const response = await fetch(blobUrl, {
        method: 'PUT',
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(`Error uploading file: ${response.status}`);
      }

      // Register the uploaded file
      const newFile = {
        name: file.name,
        blobName: blobName,
        url: blobUrl.split('?')[0], // Remove SAS token for storage
        timestamp: new Date().toISOString()
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
      setUploadStatus('success');
      
      // Add confirmation message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I've received the document "${file.name}". You can ask me questions about it.`
      }]);
      
      // Create a system message for Azure OpenAI that includes the document
      const systemMessage = {
        role: 'system',
        content: `A new document has been uploaded: ${file.name}. URL: ${newFile.url}`
      };
      
      // Send system message to Azure OpenAI to register the document
      await fetch(`${process.env.REACT_APP_AZURE_AI_ENDPOINT}/openai/deployments/${process.env.REACT_APP_AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2023-05-15`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.REACT_APP_AZURE_AI_KEY
        },
        body: JSON.stringify({
          messages: [systemMessage],
          temperature: 0.7,
          max_tokens: 50
        })
      });
      
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('error');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'There was an error uploading the document. Please check Azure Blob Storage configuration.'
      }]);
      setTimeout(() => setUploadStatus(null), 3000);
    }
    
    // Clear file input
    fileInputRef.current.value = '';
  };

  // Improved function to send emails (simulated)
  const handleSendEmails = async () => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'There is no chat content to send by email.'
      }]);
      return;
    }
    
    setLoading(true);
    
    try {
      // We simulate an email sending process
      // In a real implementation, this would connect to an email service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'A summary of this conversation has been sent by email. (Note: This is a simulated function. To fully implement it, you would need a backend service.)'
      }]);
    } catch (error) {
      console.error('Error simulating email sending:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'There was an error trying to send the email.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="azure-doc-chat-container">
      {/* Header */}
      <header className="app-header">
        <img src={logo} alt="SkillAble AI Logo" className="app-logo" />
        <div className="header-text">
          <h1 className="app-title">SkillAble AI</h1>
          <p className="app-subtitle">Empower talent, break down barriers</p>
        </div>
      </header>

      {/* Instructions Section */}
      <section className="instructions-section">
        <h2>Instructions</h2>
        <p>
          Hi, Coach! Upload a document.
          I'll analyze it and create audio and braille versions for your sessions.
          I'll send everything to your email, ready to use.
          Questions? Just ask me, I'm here to help!
        </p>
      </section>

      {/* Chat Section */}
      <section className="chat-section">
        <div className="action-buttons">
          <div className="file-upload-container">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt"
            />
            <button 
              className="upload-button" 
              onClick={() => fileInputRef.current.click()}
              disabled={loading || uploadStatus === 'uploading'}
            >
              Upload file
            </button>
            {uploadStatus === 'success' && (
              <div className="upload-status success">Document uploaded successfully</div>
            )}
            {uploadStatus === 'error' && (
              <div className="upload-status error">Error uploading document</div>
            )}
          </div>
          
          <button 
            className="send-emails-button" 
            onClick={handleSendEmails}
            disabled={loading || messages.length === 0}
          >
            Send emails
          </button>
        </div>

        {/* List of uploaded files */}
        {uploadedFiles.length > 0 && (
          <div className="uploaded-files-container">
            <h3>Uploaded documents:</h3>
            <ul className="uploaded-files-list">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="uploaded-file-item">
                  <span className="file-name">{file.name}</span>
                  <span className="file-timestamp">{new Date(file.timestamp).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.role === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">{message.content}</div>
            </div>
          ))}
          {loading && (
            <div className="message ai-message">
              <div className="message-content">Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Type your message here..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !currentMessage.trim()}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
};

export default AzureDocChat;


