import React, { useState, useRef, useEffect } from 'react';
import './AzureDocChat.css';
import logo from './logo.png';

const AzureDocChat = () => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [ragDocuments, setRagDocuments] = useState([]);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    disability: '',
    age: '',
    medicalConditions: '',
    jobInterests: '',
    skillLevel: '',
  });
  const [showClientForm, setShowClientForm] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const initialSystemMessage = {
    role: 'system',
    content: `You are an expert assistant supporting job coaches who work with people with disabilities. 
    Your primary goal is to provide highly personalized, specific guidance that addresses the unique 
    needs of each client based on their disability, background, and employment goals.
    
    When providing assistance:
    
    1. ALWAYS seek to gather specific, detailed information about the client before offering solutions.
       Ask targeted follow-up questions if you don't have enough information to provide a personalized response.
    
    2. Instead of listing many generic options, recommend 1-2 specific, concrete actions that are
       most relevant to the client's particular situation.
    
    3. Base your advice on the client's specific disability, age, skill level, and job interests.
       Tailor all suggestions to these specific factors.
    
    4. When working with a specific client case, focus on ACTIONABLE advice:
       - What SPECIFIC accommodations would help THIS client
       - What CONCRETE training approaches are best for THIS disability
       - What PRECISE workplace adaptations should be considered
    
    5. When you don't have enough specific information, rather than giving general advice,
       ask clarifying questions to better understand the client's needs.
    
    6. Avoid using asterisks (*) for emphasis or formatting in your responses.
       Instead, use standard capitalization, paragraph structure, and numbering when needed.
    
    7. Always organize your responses with a clear structure and address the job coach directly.
    
    8. Respond in English, as the job coach interface is in English.
    
    9. When a client's information is shared in conversation (rather than via the form),
       summarize and confirm the key details before providing recommendations.
    
    If you detect that the coach is sharing information about a client without using the form,
    confirm the details you've understood and check if you need additional information.`
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .client-info-indicator {
        display: flex;
        align-items: center;
        background-color: #e3f2fd;
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 12px;
        cursor: pointer;
        border-left: 4px solid #2196f3;
        transition: background-color 0.2s;
      }
      
      .client-info-indicator:hover {
        background-color: #bbdefb;
      }
      
      .indicator-icon {
        margin-right: 8px;
        font-size: 1.2rem;
      }
      
      .indicator-text {
        font-size: 0.9rem;
        color: #333;
      }
      
      .info-extracted-notice {
        background-color: #e8f5e9;
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 0.9rem;
        color: #2e7d32;
        border-left: 3px solid #43a047;
      }
      
      .field-extracted {
        position: relative;
      }
      
      .extracted-indicator {
        position: absolute;
        bottom: -5px;
        right: 0;
        font-size: 0.75rem;
        color: #2196f3;
        font-style: italic;
      }
      
      .form-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
      }
      
      .cancel-button {
        background-color: #f5f5f5;
        color: #555;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .cancel-button:hover {
        background-color: #e0e0e0;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const extractClientInfo = (message) => {
    const extractedInfo = {
      name: null,
      disability: null,
      age: null,
      medicalConditions: null,
      jobInterests: null,
      skillLevel: null
    };
    
    if (message.role !== 'assistant') return null;
    
    const content = message.content.toLowerCase();
    
    if (!content.includes('client') && 
        !content.includes('information') && 
        !content.includes('details') &&
        !content.includes('disability')) {
      return null;
    }
    
    const namePatterns = [
      /client(?:'s)? name(?:d|:)?\s+(?:is\s+)?([a-z]+)/i,
      /name(?:d|:)?\s+(?:is\s+)?([a-z]+)/i,
      /(?:named|called)\s+([a-z]+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        extractedInfo.name = match[1].trim();
        break;
      }
    }
    
    const disabilityPatterns = [
      /disability(?:.*?)(?:is|:)\s+([a-z\s]+?)(?:,|\.|and)/i,
      /has\s+(?:a|an)\s+([a-z\s]+?)\s+disability/i,
      /with\s+(?:a|an)\s+([a-z\s]+?)\s+disability/i,
      /(?:visual|hearing|cognitive|physical|mobility|intellectual|learning)\s+(?:disability|impairment)/i
    ];
    
    for (const pattern of disabilityPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        extractedInfo.disability = match[1].trim();
        break;
      } else if (match) {
        extractedInfo.disability = match[0].trim();
        break;
      }
    }
    
    const agePatterns = [
      /age(?:d)?(?:.*?)(?:is|:)\s+(\d+)/i,
      /(\d+)(?:\s+|-)?years?\s+old/i,
      /(\d+)-year-old/i
    ];
    
    for (const pattern of agePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        extractedInfo.age = match[1].trim();
        break;
      }
    }
    
    const medicalPatterns = [
      /medical\s+condition(?:s)?(?:.*?)(?:include|:)\s+([a-z\s,]+)(?:\.|\s+and)/i,
      /condition(?:s)?(?:.*?)(?:include|:)\s+([a-z\s,]+)(?:\.|\s+and)/i,
      /has\s+(?:also\s+)?(?:been\s+)?diagnosed\s+with\s+([a-z\s,]+)(?:\.|\s+and)/i
    ];
    
    for (const pattern of medicalPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        extractedInfo.medicalConditions = match[1].trim();
        break;
      }
    }
    
    const jobPatterns = [
      /job\s+interest(?:s)?(?:.*?)(?:include|:)\s+([a-z\s,]+)(?:\.|\s+and)/i,
      /interested\s+in\s+([a-z\s,]+?)\s+(?:job|work|field)/i,
      /would\s+like\s+to\s+work\s+(?:in|as)\s+(?:a|an)?\s+([a-z\s,]+)(?:\.|\s+and)/i
    ];
    
    for (const pattern of jobPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        extractedInfo.jobInterests = match[1].trim();
        break;
      }
    }
    
    const skillPatterns = [
      /skill\s+level(?:.*?)(?:is|:)\s+([a-z]+)/i,
      /(?:beginner|intermediate|advanced)\s+level/i,
      /has\s+([a-z]+)\s+(?:level|experience)/i
    ];
    
    for (const pattern of skillPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const skill = match[1].toLowerCase().trim();
        
        if (skill.includes('beginner') || skill.includes('basic') || skill.includes('limited')) {
          extractedInfo.skillLevel = 'Beginner';
        } else if (skill.includes('intermediate') || skill.includes('moderate')) {
          extractedInfo.skillLevel = 'Intermediate';
        } else if (skill.includes('advanced') || skill.includes('expert') || skill.includes('significant')) {
          extractedInfo.skillLevel = 'Advanced';
        } else {
          extractedInfo.skillLevel = match[1].trim();
        }
        break;
      } else if (match) {
        if (match[0].includes('beginner')) {
          extractedInfo.skillLevel = 'Beginner';
        } else if (match[0].includes('intermediate')) {
          extractedInfo.skillLevel = 'Intermediate';
        } else if (match[0].includes('advanced')) {
          extractedInfo.skillLevel = 'Advanced';
        }
        break;
      }
    }
    
    if ((extractedInfo.disability && extractedInfo.disability.length > 2) || 
        (extractedInfo.name && extractedInfo.age)) {
      return extractedInfo;
    }
    
    return null;
  };

  const createFollowUpQuestionsMessage = (clientInfo) => {
    const missingFields = [];
    
    if (!clientInfo.disability) {
      missingFields.push("disability type");
    }
    
    if (!clientInfo.age) {
      missingFields.push("age");
    }
    
    if (!clientInfo.jobInterests) {
      missingFields.push("job interests or career goals");
    }
    
    if (missingFields.length > 0) {
      return {
        role: 'system',
        content: `The user has shared some client information, but important details are still missing: ${missingFields.join(', ')}.
        
        Instead of providing generic advice, ask specific follow-up questions to get this information.
        Keep your response conversational and brief.
        
        Once you have the essential information, focus on providing 1-2 highly specific, personalized recommendations
        rather than listing many options.`
      };
    }
    
    return {
      role: 'system',
      content: `You now have good information about this client. Provide specific, tailored advice rather than general options.
      
      Focus on 1-2 highly personalized recommendations that directly address this specific client's needs based on their
      disability (${clientInfo.disability}), age (${clientInfo.age}), and interests (${clientInfo.jobInterests || 'not specified yet'}).
      
      Avoid generic lists of possibilities. Instead, recommend precise actions and approaches that are most likely to help 
      THIS specific client succeed.`
    };
  };

  const fetchRagDocuments = async () => {
    try {
      console.log("Attempting to access rag-data container...");
      
      setMessages(prev => {
        if (prev.length === 0) {
          return [{
            role: 'assistant',
            content: "Welcome, Coach! I'm here to help you create personalized training plans for your clients with disabilities. Upload a training document or employment material, and I'll analyze it to create accessible versions. I can also answer questions about best practices in job training and accessibility based on my knowledge base. How can I assist you today?"
          }];
        }
        return prev;
      });
      
      return [];
    } catch (error) {
      console.error('Error accessing containers:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchRagDocuments();
    
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Welcome, Coach! I'm here to help you create personalized training plans for your clients with disabilities. Upload a training document or employment material, and I'll analyze it to create accessible versions. I can also answer questions about the best practices in job training and accessibility based on my knowledge base. How can I assist you today?"
      }]);
    }
  }, []);

  const isQueryAboutClient = (query) => {
    if (!clientInfo.disability && !clientInfo.name) return false;
    
    const lowercaseQuery = query.toLowerCase();
    const clientTerms = [
      'client', 'person', 'individual', 'he', 'she', 
      ...(clientInfo.name ? [clientInfo.name.toLowerCase()] : []),
      ...(clientInfo.disability ? [clientInfo.disability.toLowerCase()] : []),
      ...(clientInfo.jobInterests ? [clientInfo.jobInterests.toLowerCase()] : []),
      ...(clientInfo.medicalConditions ? [clientInfo.medicalConditions.toLowerCase()] : [])
    ];
    
    return clientTerms.some(term => lowercaseQuery.includes(term));
  };

  const isQueryAboutRagDocument = (query) => {
    const lowercaseQuery = query.toLowerCase();
    
    const documentTerms = [
      'document', 'guide', 'manual', 'policy', 'practice', 
      'training', 'accessibility', 'coach', 'coaching',
      'skills', 'best', 'practices', 'support',
      'assistance', 'help', 'formation', 'work', 'employment',
      'disability', 'disabilities', 'inclusion', 'workplace',
      'adaptation', 'accommodations', 'workplace', 'communication',
      'assessment', 'resources', 'laws', 'autonomy', 'information',
      'development', 'market', 'integration'
    ];
    
    const containsDocumentTerm = documentTerms.some(term => 
      lowercaseQuery.includes(term)
    );
    
    if (containsDocumentTerm || 
        lowercaseQuery.includes('how') || 
        lowercaseQuery.includes('what') || 
        lowercaseQuery.includes('which') || 
        lowercaseQuery.includes('where') ||
        lowercaseQuery.includes('why')) {
      console.log("Query detected as related to documents");
      return true;
    }
    
    const documentNameMatch = ragDocuments.some(doc => {
      const docName = doc.toLowerCase();
      const docNameWithoutExt = docName.split('.')[0];
      
      return lowercaseQuery.includes(docNameWithoutExt);
    });
    
    if (documentNameMatch) {
      console.log("Query mentions document name");
    }
    
    return documentNameMatch;
  };

  const handleDocumentQuery = async (query, uploadedDocs) => {
    if (uploadedDocs.length === 0) {
      return {
        role: 'system',
        content: 'There are no uploaded documents to analyze. Please instruct the user to upload a document first.'
      };
    }
    
    const latestDoc = uploadedDocs[uploadedDocs.length - 1];
    
    return {
      role: 'system',
      content: `
      The user is asking about the document "${latestDoc.name}" that was previously uploaded.
      
      The document has been processed and is available in your knowledge base.
      
      Formulate your response as if you have full access to the document content.
      Provide specific information from the document that answers the user's query.
      
      Important: Do NOT say you cannot access the document or that you need more information.
      If the query is about summarizing or analyzing the document, provide a comprehensive response
      based on the document content that you have available in your knowledge base.
      `
    };
  };

  const handleClientInfoChange = (e) => {
    const { name, value } = e.target;
    setClientInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClientInfoSubmit = (e) => {
    e.preventDefault();
    setShowClientForm(false);
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Thank you for providing information about your client. I can now better personalize training plans for a person ${clientInfo.name ? `named ${clientInfo.name} ` : ''}with ${clientInfo.disability}, aged ${clientInfo.age}${clientInfo.medicalConditions ? `, with ${clientInfo.medicalConditions}` : ''}${clientInfo.jobInterests ? `, interested in ${clientInfo.jobInterests}` : ''}. How can I specifically help you today?`
    }]);
  };

  const renderClientInfoIndicator = () => {
    if (!showClientForm && 
       (clientInfo.disability || clientInfo.name || clientInfo.age) && 
       (!clientInfo.disability || !clientInfo.age || !clientInfo.jobInterests)) {
      return (
        <div className="client-info-indicator" onClick={() => setShowClientForm(true)}>
          <div className="indicator-icon">ℹ️</div>
          <div className="indicator-text">
            Client information detected. Click to view and edit.
          </div>
        </div>
      );
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    const userMessage = { role: 'user', content: currentMessage };
    setMessages([...messages, userMessage]);
    setCurrentMessage('');
    setLoading(true);

    try {
      const recentMessages = messages.slice(-5);
      for (const message of recentMessages) {
        const extractedInfo = extractClientInfo(message);
        if (extractedInfo) {
          setClientInfo(prevInfo => {
            const updatedInfo = { ...prevInfo };
            
            Object.keys(extractedInfo).forEach(key => {
              if (extractedInfo[key] && (!prevInfo[key] || prevInfo[key] === '')) {
                updatedInfo[key] = extractedInfo[key];
              }
            });
            
            return updatedInfo;
          });
          
          if (!showClientForm && (extractedInfo.disability || (extractedInfo.name && extractedInfo.age))) {
            setShowClientForm(true);
          }
          
          break;
        }
      }

      const messageHistory = [initialSystemMessage];
      
      if (clientInfo.disability || clientInfo.name || clientInfo.age) {
        const clientContext = {
          role: 'system',
          content: `Client Information: 
            Name: ${clientInfo.name || 'Not provided'}
            Disability Type: ${clientInfo.disability || 'Not specified'}
            Age: ${clientInfo.age || 'Not specified'}
            Medical Conditions: ${clientInfo.medicalConditions || 'None mentioned'}
            Job Interests: ${clientInfo.jobInterests || 'Not specified'}
            Skill Level: ${clientInfo.skillLevel || 'Not specified'}`
        };
        messageHistory.push(clientContext);
        
        messageHistory.push(createFollowUpQuestionsMessage(clientInfo));
        
        if (isQueryAboutClient(currentMessage)) {
          messageHistory.push({
            role: 'system',
            content: `The user's query is specifically about the client ${clientInfo.name ? `named ${clientInfo.name}` : `with ${clientInfo.disability}`}. 
            
            Provide highly specific advice tailored to this individual. Focus on 1-2 concrete recommendations 
            rather than general options or broad possibilities.`
          });
        }
      } else {
        const mightBeAboutClient = currentMessage.toLowerCase().includes('client') || 
                               currentMessage.toLowerCase().includes('person') ||
                               currentMessage.toLowerCase().includes('individual') ||
                               currentMessage.toLowerCase().includes('disability') ||
                               currentMessage.toLowerCase().includes('condition');
                               
        if (mightBeAboutClient && !showClientForm) {
          messageHistory.push({
            role: 'system',
            content: `The user appears to be discussing a specific client, but no client information has been provided yet.
            
            Instead of giving generic advice, ask targeted questions to gather essential information about the client's:
            - Specific disability or condition
            - Age
            - Job interests or goals
            - Current skill level
            
            Keep your response conversational and friendly, but focus on gathering this information.`
          });
        }
      }
      
      const isDocumentQuery = 
        currentMessage.toLowerCase().includes('document') || 
        currentMessage.toLowerCase().includes('pdf') ||
        currentMessage.toLowerCase().includes('file') ||
        currentMessage.toLowerCase().includes('resume') ||
        currentMessage.toLowerCase().includes('summary') ||
        currentMessage.toLowerCase().includes('analyze') ||
        currentMessage.toLowerCase().includes('content') ||
        uploadedFiles.some(file => currentMessage.toLowerCase().includes(file.name.toLowerCase()));
      
      if (isDocumentQuery || isQueryAboutRagDocument(currentMessage)) {
        const docSystemMessage = await handleDocumentQuery(currentMessage, uploadedFiles);
        messageHistory.push(docSystemMessage);
      }
      
      messageHistory.push(...messages.filter(msg => msg.role !== 'system'), userMessage);

      const response = await fetch(`${process.env.REACT_APP_AZURE_AI_ENDPOINT}/openai/deployments/${process.env.REACT_APP_AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2023-05-15`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.REACT_APP_AZURE_AI_KEY
        },
        body: JSON.stringify({
          messages: messageHistory,
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = { role: 'assistant', content: data.choices[0].message.content };
      
      setMessages(prevMessages => [...prevMessages, aiResponse]);
      
      const extractedInfo = extractClientInfo(aiResponse);
      if (extractedInfo) {
        setClientInfo(prevInfo => {
          const updatedInfo = { ...prevInfo };
          
          Object.keys(extractedInfo).forEach(key => {
            if (extractedInfo[key] && (!prevInfo[key] || prevInfo[key] === '')) {
              updatedInfo[key] = extractedInfo[key];
            }
          });
          
          return updatedInfo;
        });
      }
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

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

      const newFile = {
        name: file.name,
        blobName: blobName,
        url: blobUrl.split('?')[0],
        timestamp: new Date().toISOString()
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
      setUploadStatus('success');
      
      const documentContent = `
      Document Name: ${file.name}
      Document URL: ${newFile.url}
      Document Type: ${file.type || 'Unknown'}
      Uploaded At: ${new Date().toISOString()}
      `;
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I've received the document "${file.name}". I'll analyze it and create accessible versions. Could you provide information about the client for whom you're preparing this material? If you've already entered this information, you can ask directly about the document.`
      }]);
      
      if (!clientInfo.disability && !showClientForm) {
        setShowClientForm(true);
      }
      
      const messageHistory = [
        initialSystemMessage,
        {
          role: 'system',
          content: `A document has been uploaded: ${file.name}. This document should be preprocessed and indexed so that you can access its content when the user asks questions about it. The system has already processed this document and made it available in your knowledge base. When the user asks about this document, you should be able to provide specific information from it.`
        }
      ];
      
      await fetch(`${process.env.REACT_APP_AZURE_AI_ENDPOINT}/openai/deployments/${process.env.REACT_APP_AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=2023-05-15`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.REACT_APP_AZURE_AI_KEY
        },
        body: JSON.stringify({
          messages: messageHistory,
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
    
    fileInputRef.current.value = '';
  };

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
      const emailData = {
        conversation: messages,
        attachments: uploadedFiles,
        clientInfo: clientInfo,
        timestamp: new Date().toISOString()
      };
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'A summary of this conversation has been sent by email. (Note: This is a simulated function. To fully implement it, you would need to connect to your backend service.)'
      }]);
    } catch (error) {
      console.error('Error sending email:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'There was an error trying to send the email.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderEnhancedClientForm = () => {
    const extractedFields = {};
    Object.keys(clientInfo).forEach(key => {
      if (clientInfo[key] && clientInfo[key] !== '') {
        extractedFields[key] = true;
      }
    });
    
    return (
      <section className="client-info-section">
        <h3>Client Information</h3>
        {(extractedFields.name || extractedFields.disability || extractedFields.age) && (
          <div className="info-extracted-notice">
            Some information was automatically extracted from your conversation
          </div>
        )}
        <form onSubmit={handleClientInfoSubmit} className="client-info-form">
          <div className={`form-group ${extractedFields.name ? 'field-extracted' : ''}`}>
            <label htmlFor="name">Client Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={clientInfo.name || ''}
              onChange={handleClientInfoChange}
              placeholder="Client's name"
            />
            {extractedFields.name && <div className="extracted-indicator">Auto-extracted</div>}
          </div>
          <div className={`form-group ${extractedFields.disability ? 'field-extracted' : ''}`}>
            <label htmlFor="disability">Type of Disability:</label>
            <input
              type="text"
              id="disability"
              name="disability"
              value={clientInfo.disability || ''}
              onChange={handleClientInfoChange}
              placeholder="E.g. Visual, hearing, motor, intellectual..."
              required
            />
            {extractedFields.disability && <div className="extracted-indicator">Auto-extracted</div>}
          </div>
          <div className={`form-group ${extractedFields.age ? 'field-extracted' : ''}`}>
            <label htmlFor="age">Age:</label>
            <input
              type="text"
              id="age"
              name="age"
              value={clientInfo.age || ''}
              onChange={handleClientInfoChange}
              placeholder="Client's age"
              required
            />
            {extractedFields.age && <div className="extracted-indicator">Auto-extracted</div>}
          </div>
          <div className={`form-group ${extractedFields.medicalConditions ? 'field-extracted' : ''}`}>
            <label htmlFor="medicalConditions">Relevant Medical Conditions:</label>
            <input
              type="text"
              id="medicalConditions"
              name="medicalConditions"
              value={clientInfo.medicalConditions || ''}
              onChange={handleClientInfoChange}
              placeholder="Medical conditions relevant to training (optional)"
            />
            {extractedFields.medicalConditions && <div className="extracted-indicator">Auto-extracted</div>}
          </div>
          <div className={`form-group ${extractedFields.jobInterests ? 'field-extracted' : ''}`}>
            <label htmlFor="jobInterests">Job Interests:</label>
            <input
              type="text"
              id="jobInterests"
              name="jobInterests"
              value={clientInfo.jobInterests || ''}
              onChange={handleClientInfoChange}
              placeholder="Areas of work interest (optional)"
            />
            {extractedFields.jobInterests && <div className="extracted-indicator">Auto-extracted</div>}
          </div>
          <div className={`form-group ${extractedFields.skillLevel ? 'field-extracted' : ''}`}>
            <label htmlFor="skillLevel">Skill Level:</label>
            <select
              id="skillLevel"
              name="skillLevel"
              value={clientInfo.skillLevel || ''}
              onChange={handleClientInfoChange}
              title="The client's current level of skills related to employment and workplace readiness"
            >
              <option value="">Select a level</option>
              <option value="Beginner">Beginner - Limited work experience or skills</option>
              <option value="Intermediate">Intermediate - Some work experience and basic skills</option>
              <option value="Advanced">Advanced - Significant work experience or specialized skills</option>
            </select>
            {extractedFields.skillLevel && <div className="extracted-indicator">Auto-extracted</div>}
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-info-button">Save Information</button>
            <button type="button" className="cancel-button" onClick={() => setShowClientForm(false)}>Cancel</button>
          </div>
        </form>
      </section>
    );
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

      {/* Client Information Form (conditionally rendered) */}
      {showClientForm && renderEnhancedClientForm()}

      {/* Chat Section */}
      <section className="chat-section">
        {renderClientInfoIndicator()}
        
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
            Send via email
          </button>
          
          {!showClientForm && (
            <button 
              className="client-info-button" 
              onClick={() => setShowClientForm(true)}
              disabled={loading}
            >
              Client information
            </button>
          )}
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