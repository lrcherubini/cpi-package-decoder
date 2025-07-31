# SAP CPI Package Decoder 🔓

A web tool to decode and visualize the contents of packages exported from SAP Cloud Platform Integration (CPI).

## 📋 Overview

SAP CPI Package Decoder is a client-side web application that allows SAP CPI developers and administrators to inspect exported integration packages, including scripts, metadata and resources, without the need for external tools.

## ✨ Features
- **Automatic decoding**: Processes `.zip` files exported from SAP CPI
- **Metadata view**: Shows detailed package information (`contentmetadata.md`)
- **Resource exploration**: Lists and displays all package resources (`resources.cnt`)
- **Script visualization**: Supports ScriptCollections and individual scripts (Groovy, JavaScript, etc.)
- **BPMN visualization**: Button to show `.iflw` files as BPMN diagrams
- **iFlow artifact support**: Load ZIPs exported directly from an iFlow
- **Intuitive interface**: Drag & drop or file selection
- **Local processing**: Everything runs in the browser (no uploads)

## 🚀 How to Use

1. **Export your SAP CPI package**
   - In the SAP CPI Web UI, open your integration package
   - Click "Actions" → "Export"
   - Download the resulting `.zip` file
   - You can also export an individual iFlow (ZIP) and load it

2. **Load the file in the tool**
   - Open `index.html` in your browser
   - Drag the `.zip` file to the upload area OR
   - Click "Select ZIP File" and choose the file

3. **Explore the content**
   - See the package metadata
   - Click any resource in the list to view its contents
   - Scripts and ScriptCollections are decoded automatically

## 📁 Project Structure
```
sap-cpi-decoder/
├── index.html              # Main page
├── css/
│   └── style.css           # Interface styles
├── js/
│   ├── globals.js         # Globals and configuration
│   ├── editor.js          # Monaco Editor functions
│   ├── fileLoader.js      # ZIP and resource processing
│   └── uiHandlers.js      # UI events
├── lib/
│   └── jszip.min.js        # ZIP processing library
├── .vscode/
│   └── launch.json         # VS Code debug config
├── .gitattributes          # Git settings
└── README.md               # This documentation
```

## 🛠️ Technologies Used
- **HTML5**: Application structure
- **CSS3**: Modern interface with gradients and animations
- **JavaScript (ES6+)**: Processing logic
- **JSZip**: Library for ZIP files
- **FileReader API**: Local file reading
- **Base64 Decoding**: Decode encoded content

## 🔧 Development Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Code editor (recommended: VS Code)

### Running Locally

1. **Clone or download the project**
2. **Open in VS Code** (optional)
3. **Use one of the methods**:
   - **Method 1**: Open `index.html` directly in the browser
   - **Method 2**: Use VS Code's Live Server extension
   - **Method 3**: Use the provided debug config (F5 in VS Code)

### VS Code Debug

The project includes a debug configuration (`.vscode/launch.json`):
- Press `F5` to start debugging
- Or go to "Run and Debug" → "Launch in Browser"

## 📦 Processed Files

The tool handles the following files from a SAP CPI package:

| File | Description | Format |
|------|-------------|-------|
| `contentmetadata.md` | Package metadata | Base64 → Text |
| `resources.cnt` | Resource list | Base64 → JSON |
| `{resourceId}_content` | Resource contents | Binary/ZIP → Text/Scripts |
| `IFlow.zip` | Exported iFlow artifact | ZIP → Text/BPMN |

## 🔍 Supported Resource Types
- **ScriptCollection**: Script collections (internal ZIP)
- **Groovy Scripts**: Individual Groovy scripts
- **JavaScript**: JavaScript scripts
- **XML**: Configurations and mappings
- **Properties**: Properties files
- **Others**: General text files

## 🎨 Interface

The application provides a modern responsive interface with:
- **Gradients**: Eye-catching design
- **Drag & Drop**: Interactive upload area
- **Animations**: Smooth visual feedback
- **Responsive**: Works on various screen sizes
- **Code highlighting**: Better readability

## 🔒 Security & Privacy
- **Local processing**: No files are sent to servers
- **Client-side only**: All decoding happens in the browser
- **No external dependencies**: Only local libraries
- **Open source**: Fully auditable

## 🐛 Troubleshooting

### File doesn't load
- Ensure it is a valid SAP CPI `.zip` file
- Make sure the file is not corrupted

### Decoding error
- Some resources may not be supported
- Check the browser console for details

### Interface doesn't load
- Check if all files are in the correct place
- Make sure JavaScript is enabled

## 🤝 Contributions

Contributions are welcome! To contribute:

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Changelog

### v1.0.0
- Initial decoding functionality
- Support for metadata and resources
- Drag & drop interface
- ScriptCollections view

## 📄 License

This project is open source. See the LICENSE file for details.

## 🆘 Support

For issues or questions:
- Open an issue in the repository
- Check the SAP CPI documentation
- See the troubleshooting section above

## 🙏 Acknowledgments

- Open source community for the JSZip library
- Developers who provided feedback and improvements
