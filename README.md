# FurbyWeb - Furby Connect Web Controller

This is a standalone JavaScript port of PyFluff that runs entirely in the browser using the Web Bluetooth API. This is helpful if you are just trying to ensure your Furby is working properly, or if you want to see what it can do without having to install Python or a backend server.

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
3. Once connected, use the controls to change antenna color, trigger actions, or set moods.

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
