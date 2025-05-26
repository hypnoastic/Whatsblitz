chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendMessage') {
    sendWhatsAppMessage(request.data.phone, request.data.message)
      .then((result) => sendResponse({ success: true }))
      .catch((error) => {
        console.error('WhatsApp sending error:', {
          message: error.message,
          stack: error.stack,
          phone: request.data.phone
        });
        sendResponse({ 
          success: false, 
          error: error.message || 'Unknown error occurred'
        });
      });
    return true;
  }
});

async function sendWhatsAppMessage(phone, message) {
  try {
    // Format phone number
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    
    // Create the WhatsApp URL with the message
    const url = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    console.log('Attempting to send message to:', formattedPhone);
    
    // Navigate to the chat
    window.location.href = url;

    // Wait for either the input field or the invalid number message
    console.log('Waiting for chat to load...');
    const element = await Promise.race([
      waitForElement('div[data-testid="conversation-compose-box-input"]', 30000),
      waitForElement('div[data-testid="alert-phone"]', 30000)
    ]);

    // Check if the number is invalid
    if (element.getAttribute('data-testid') === 'alert-phone') {
      throw new Error(`Invalid phone number or not registered on WhatsApp: ${formattedPhone}`);
    }

    console.log('Chat loaded, waiting for stability...');
    // Wait for the chat to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find the send button
    console.log('Looking for send button...');
    const sendButton = await waitForElement('button[data-testid="compose-btn-send"]', 10000);
    
    if (!sendButton) {
      throw new Error('Send button not found');
    }

    // Click the send button
    console.log('Clicking send button...');
    sendButton.click();

    // Wait for the message to be sent (double check mark)
    console.log('Waiting for message confirmation...');
    const msgStatus = await waitForElement('span[data-testid="msg-dblcheck"]', 10000)
      .catch(() => null);

    if (!msgStatus) {
      throw new Error('Message was not confirmed as sent');
    }

    console.log('Message sent successfully');
    return true;
  } catch (error) {
    console.error('Error in sendWhatsAppMessage:', {
      error: error.message,
      stack: error.stack,
      phone
    });
    throw new Error(`Failed to send message to ${phone}: ${error.message}`);
  }
}

function waitForElement(selector, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    if (document.querySelector(selector)) {
      console.log(`Element found immediately: ${selector}`);
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`Element found via observer: ${selector}`);
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      console.log(`Timeout waiting for element: ${selector}`);
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}