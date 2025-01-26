<p align="center">
  <img src="https://github.com/soumt-r/VRCNotify/blob/main/img/splash.png" style="width:500px">
</p>

# VRCNotify

VRCNotify is a real-time notification tool designed for VRChat users. It monitors VRChat logs and sends notifications to Discord webhooks. This tool is ideal for users who want to stay informed about player join / leave events in VRChat.

## Features

- **Real-time VRChat Log Monitoring**: Tracks player join/leave events and room changes.
- **Discord Notifications**: Sends updates directly to a specified Discord webhook.
- **Dynamic Status Display**: Displays the current application state with visually engaging UI elements.
- **Configurable Webhook Setup**: Simple configuration through an intuitive interface.
- **Lightweight and Easy to Use**: Built with Python and Eel, providing cross-platform compatibility.

## Requirements

- Python 3.10 or higher
- pip (Python package manager)
- VRChat installed on the target machine

## Usage

1. Build the application by running the `build.bat` script.
2. Run `dist\VRCNotify`
3. Enter your Discord Webhook URL when prompted to set up notifications.
4. Start VRChat and enjoy real-time notifications for various activities.

## Configuration

The application generates a `config.json` file upon initial setup. This file contains the Discord Webhook URL and other settings. To update your webhook, delete the `config.json` file and restart the application.

## Development

### Building Executable

You can build a standalone executable using the provided `build.bat` script. This script ensures all dependencies are included and creates a packaged version of the application.

```bash
build.bat
```

### Folder Structure

```
VRCNotify/
├── app.py            # Main application logic
├── build.bat         # Build script for packaging
├── requirements.txt  # Python dependencies
├── web/              # Frontend files
│   ├── index.html    # Main UI
│   └── ...           # Additional assets
├── config.json       # Configuration file (auto-generated)
└── README.md         # Project documentation
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to enhance the project. Make sure to follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Acknowledgments

- Developed by [@soumt-r](https://github.com/soumt-r)
- Built with [Eel](https://github.com/ChrisKnott/Eel) for the Python-Web integration
- Inspired by VRChat's vibrant community

## Contact

For support or feedback, please open an issue in the repository.

