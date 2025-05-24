document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const csvFile = document.getElementById('csvFile');
  const startBtn = document.getElementById('startBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const status = document.getElementById('status');

  let messageData = [];
  let isProcessing = false;

  // File Drop Handlers
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = '#f0f0f0';
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = '';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      handleFile(file);
    } else {
      alert('Please upload a CSV file');
    }
  });

  dropZone.addEventListener('click', () => {
    csvFile.click();
  });

  csvFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  });

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        processCSV(text);
      } catch (error) {
        alert('Error processing CSV file: ' + error.message);
      }
    };
    reader.readAsText(file);
  }

  function processCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].toLowerCase().split(',').map(header => header.trim());
    
    const phoneIndex = headers.indexOf('phone number');
    const messageIndex = headers.indexOf('message');

    if (phoneIndex === -1 || messageIndex === -1) {
      alert('CSV must contain "phone number" and "message" columns');
      return;
    }

    messageData = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(value => value.trim());
        return {
          phone: values[phoneIndex].replace(/[^0-9]/g, ''),
          message: values[messageIndex]
        };
      })
      .filter(data => data.phone && data.message); // Filter out empty entries

    if (messageData.length > 0) {
      startBtn.disabled = false;
      status.textContent = `Ready to send ${messageData.length} messages`;
    } else {
      status.textContent = 'No valid messages found in CSV';
      startBtn.disabled = true;
    }
  }

  function updateStatus(text) {
    status.style.whiteSpace = 'pre-line';  // Preserve line breaks
    status.textContent = text;
  }

  startBtn.addEventListener('click', async () => {
    if (messageData.length === 0) return;

    try {
      const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      if (tabs.length === 0) {
        const proceed = confirm('WhatsApp Web is not open. Would you like to open it now?');
        if (proceed) {
          await chrome.tabs.create({ url: 'https://web.whatsapp.com' });
          alert('Please scan the QR code to log in to WhatsApp Web, then try again.');
          return;
        }
        return;
      }

      isProcessing = true;
      progressContainer.style.display = 'block';
      startBtn.disabled = true;

      let processed = 0;
      let successful = 0;
      let failed = 0;
      let errors = [];

      updateStatus(`Processing: ${processed}/${messageData.length}\nSuccess: ${successful}, Failed: ${failed}`);

      for (const data of messageData) {
        if (!isProcessing) break;

        try {
          console.log(`Attempting to send message to ${data.phone}`);
          const response = await chrome.runtime.sendMessage({
            action: 'sendWhatsAppMessage',
            data
          });

          console.log('Response received:', response);

          if (response && response.success) {
            successful++;
            console.log(`Successfully sent message to ${data.phone}`);
          } else {
            failed++;
            const errorMsg = response?.error || 'Unknown error';
            errors.push(`Failed for ${data.phone}: ${errorMsg}`);
            console.error(`Failed to send message to ${data.phone}:`, errorMsg);
          }
        } catch (error) {
          failed++;
          const errorMsg = error.message || 'Unknown error';
          errors.push(`Error for ${data.phone}: ${errorMsg}`);
          console.error(`Error sending message to ${data.phone}:`, errorMsg);
        }

        processed++;
        const progress = (processed / messageData.length) * 100;
        progressBar.style.width = `${progress}%`;
        
        updateStatus(
          `Processing: ${processed}/${messageData.length}\n` +
          `Success: ${successful}, Failed: ${failed}\n\n` +
          `Last few errors:\n${errors.slice(-3).join('\n')}`
        );

        // Add delay between messages to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 8000));
      }

      if (isProcessing) {
        let finalMessage = `Completed!\nSuccess: ${successful}, Failed: ${failed}`;
        if (errors.length > 0) {
          finalMessage += '\n\nErrors:\n' + errors.join('\n');
        }
        updateStatus(finalMessage);
        console.log('Final status:', { successful, failed, errors });
      } else {
        updateStatus(`Cancelled!\nSuccess: ${successful}, Failed: ${failed}`);
      }
    } catch (error) {
      console.error('Fatal error:', error);
      updateStatus(`Fatal error: ${error.message}`);
    } finally {
      startBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', () => {
    isProcessing = false;
    startBtn.disabled = false;
  });
}); 