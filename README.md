# FurbyWeb - Furby Connect Web Controller

This is a standalone JavaScript port of PyFluff that runs entirely in the browser using the Web Bluetooth API. This is helpful if you are just trying to ensure your Furby is working properly, or if you want to see what it can do without having to install Python or a backend server.

## Features

* **Control Furby Connect** - Change antenna colors, trigger actions, set moods
* **Upload DLC Files** - Upload DownLoadable Content (DLC) files directly from your browser
* **No Backend Required** - Everything runs locally in your browser
* **Dark Mode** - Toggle between light and dark themes
* **Modern UI** - Clean, responsive design that works on desktop and mobile

## Try it Live

You can try the app right now in your browser without installing anything:

[**Launch FurbyWeb Controller**](https://cardonator.github.io/FurbyWeb/index.html)

**Note**: This runs entirely locally in your browser. No data is sent to any server and it does not phone home.

## Requirements

* A browser with Web Bluetooth support (Chrome, Edge, or Bluefy on iOS).
* A Furby Connect toy.
* A computer with Bluetooth support.

## How to Run

Because Web Bluetooth requires a secure context (HTTPS or localhost), you cannot simply open `index.html` from the file system. You must serve it via a local web server.

### Using npx

Run this command from this directory:

```bash
npx http-server
```

Then open your browser to: [http://localhost:8080](http://localhost:8080)

### Usage

1. Click the "Connect" button.
2. Select your Furby from the browser's Bluetooth picker.
3. Once connected, use the controls to:
   - Change antenna color
   - Trigger actions
   - Set moods
   - Change Furby's name
   - **Upload DLC files** to customize your Furby's content

## DLC Upload

DLC (DownLoadable Content) files contain custom audio, animations, and other content for your Furby Connect. With FurbyWeb, you can upload DLC files directly from your browser:

1. Click "Select DLC File" to choose a .dlc file
2. Select a slot (0-7) to upload to
3. Click "Upload" to transfer the file to your Furby
4. Use "Load DLC" to load the content from a slot
5. Use "Activate" to enable the DLC content
6. Use "Deactivate" to return to default content
7. Use "Delete Slot" to remove a DLC file from a slot

**Note**: DLC uploads may take several minutes depending on file size. A progress bar will show the upload status.

### DLC File Sources

Since the official Furby Connect servers are no longer online, you may need to source DLC files from community archives or create your own custom content.

## Notes

* **No Backend Required**: This runs entirely in your browser. The Python server is NOT used.
* **F2F Mode**: If your Furby is talking to another Furby (F2F mode), it may not be visible in the scan. Wake it up or wait for it to stop talking. 
* **Connection Issues**: If connection fails, try refreshing the page or restarting the Furby (reset button in battery compartment).

## Python and Code Control

If you are looking to use Python or control your Furby from code/scripts, please visit the [martinwoodward/PyFluff](https://github.com/martinwoodward/PyFluff) repository.

## Acknowledgements

This project is a JavaScript port of the original Python implementation [PyFluff](https://github.com/martinwoodward/PyFluff) by Martin Woodward.

## License

This project is licensed under the MIT License.
