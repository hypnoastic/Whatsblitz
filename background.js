// Function to inject the content script
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    return true;
  } catch (error) {
    console.error('Error injecting content script:', error);
    return false;
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendWhatsAppMessage') {
    handleWhatsAppMessage(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleWhatsAppMessage(data) {
  const { phone, message } = data;
  
  try {
    // Format phone number
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    
    // Create the WhatsApp URL
    const url = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    // Find WhatsApp tab or create new one
    let tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    let whatsappTab = tabs[0];
    
    if (!whatsappTab) {
      whatsappTab = await chrome.tabs.create({ url: 'https://web.whatsapp.com' });
      // Wait for the page to load
      await new Promise(resolve => setTimeout(resolve, 15000));
    }

    // Navigate to the specific chat
    await chrome.tabs.update(whatsappTab.id, { url });

    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Inject content script
    const injected = await injectContentScript(whatsappTab.id);
    if (!injected) {
      throw new Error('Failed to inject content script');
    }

    // Execute the send message function
    const result = await chrome.scripting.executeScript({
      target: { tabId: whatsappTab.id },
      func: async () => {
        try {
          // Function to wait for an element with multiple possible selectors
          const waitForElement = async (selectors, timeout = 30000) => {
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
              for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) return element;
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            return null;
          };

          // Function to check if page is still loading
          const isPageLoading = () => {
            const loadingSelectors = [
              'div[data-testid="popup-contents"]',
              'div[data-testid="loading-screen"]',
              '.progress-ring',
              'div[data-testid="chat-load-screen"]',
              'div[data-testid="connecting-screen"]'
            ];
            return loadingSelectors.some(selector => document.querySelector(selector));
          };

          // Function to check for error states
          const checkForErrors = () => {
            // Check for QR code
            const qrCode = document.querySelector('div[data-testid="qrcode"]');
            if (qrCode) throw new Error('WhatsApp Web requires QR code scan');

            // Check for invalid phone
            const invalidPhone = document.querySelector('div[data-testid="alert-phone"]');
            if (invalidPhone) throw new Error('Invalid phone number or not registered on WhatsApp');

            // Check for other error states
            const errorScreen = document.querySelector('div[data-testid="error-screen"]');
            if (errorScreen) throw new Error('WhatsApp Web encountered an error');
          };

          // Wait for page to finish loading
          console.log('Checking page loading state...');
          let loadingRetries = 0;
          while (loadingRetries < 30 && isPageLoading()) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            loadingRetries++;
            console.log('Page still loading...');
          }

          // Wait for chat input with multiple possible selectors
          console.log('Waiting for chat elements...');
          const chatInputSelectors = [
            'div[data-testid="conversation-compose-box-input"]',
            'div[contenteditable="true"][role="textbox"]',
            'div.selectable-text[contenteditable="true"]',
            'footer div[contenteditable="true"]'
          ];

          const chatInput = await waitForElement(chatInputSelectors);
          
          // If chat input not found, check for errors and loading state
          if (!chatInput) {
            console.log('Chat input not found, checking for errors...');
            checkForErrors();
            
            // Log visible elements for debugging
            const visibleElements = Array.from(document.querySelectorAll('[data-testid]'))
              .map(el => el.getAttribute('data-testid'));
            console.log('Visible elements:', visibleElements);
            
            throw new Error('Could not find chat input. Please check if the chat is loading correctly.');
          }

          console.log('Found chat input, looking for send button...');
          const sendButtonSelectors = [
            'button[data-testid="compose-btn-send"]',
            'button[aria-label="Send"]',
            'span[data-testid="send"]',
            'span[data-icon="send"]'
          ];
          
          const sendButton = await waitForElement(sendButtonSelectors);
          
          if (!sendButton) {
            throw new Error('Could not find send button');
          }

          console.log('Found send button, clicking...');
          sendButton.click();

          // Wait for message to be sent
          console.log('Waiting for message confirmation...');
          const messageStatusSelectors = [
            'span[data-testid="msg-dblcheck"]',
            'span[data-testid="msg-check"]',
            'span[data-icon="msg-check"]',
            'span[data-icon="msg-dblcheck"]',
            'span[data-icon="msg-time"]', // This catches the message being processed
            'span[aria-label="Sent"]',
            'span[aria-label="Delivered"]'
          ];
          
          // Shorter timeout for message confirmation (5 seconds)
          const messageStatus = await waitForElement(messageStatusSelectors, 5000);
          
          // Consider message sent if either we got a status or the send button is no longer visible
          if (!messageStatus) {
            // Double check if send button disappeared (which usually means message was sent)
            const sendButtonStillVisible = await waitForElement(sendButtonSelectors, 1000);
            if (sendButtonStillVisible) {
              throw new Error('Message not confirmed as sent');
            }
          }

          console.log('Message sent successfully');
          return { success: true };
        } catch (error) {
          console.error('Error in content script:', error);
          return { success: false, error: error.message };
        }
      }
    });

    const scriptResult = result[0].result;
    if (!scriptResult.success) {
      throw new Error(scriptResult.error);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in handleWhatsAppMessage:', error);
    throw error;
  }
} 