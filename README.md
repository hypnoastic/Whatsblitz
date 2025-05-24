# WhatsApp Bulk Messenger Chrome Extension

A Chrome extension that allows you to send WhatsApp messages to multiple recipients using a CSV file, whether the numbers are saved in your contacts or not.

## Features

- Send messages to multiple WhatsApp numbers from a CSV file
- Works with unsaved numbers
- Progress tracking with a progress bar
- Ability to cancel the process at any time
- Modern and user-friendly interface

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the folder containing the extension files

## How to Use

1. Create a CSV file with two columns: "phone number" and "message"
   - Phone numbers should be in international format (e.g., 911234567890)
   - Do not include the "+" symbol in phone numbers
   - Make sure there are no spaces in phone numbers

2. Open WhatsApp Web (https://web.whatsapp.com) and scan the QR code if needed

3. Click the extension icon in Chrome's toolbar

4. Upload your CSV file by clicking the upload area or dragging and dropping the file

5. Click "Start Sending Messages" to begin the process

6. You can monitor the progress and cancel at any time using the "Cancel Process" button

## CSV Format Example

```csv
phone number,message
911234567890,Hello! This is a test message.
919876543210,Hi there! How are you?
```

## Notes

- Make sure you're logged into WhatsApp Web before using the extension
- The extension needs to be active on the WhatsApp Web tab to work
- There might be a delay between messages to prevent blocking
- Some numbers might not be reachable if they're not registered on WhatsApp

## Privacy

This extension runs locally on your computer and doesn't send any data to external servers. All processing is done in your browser. 