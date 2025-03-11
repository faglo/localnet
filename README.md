# localnet

A fast network scanner that discovers devices on your local network by sending ping requests and retrieving MAC addresses and manufacturer information.

## Features

- Scans IP ranges using CIDR notation
- Identifies online devices with ping
- Retrieves MAC addresses of discovered devices
- Shows manufacturer information for each device
- Cross-platform support (Windows and Unix-based systems)
- High-performance concurrent scanning

## Requirements

- [Bun](https://bun.sh/) runtime
- Network with ARP protocol support
- Administrative/root privileges (required for some operations on certain platforms)

## Usage

Run the scanner with a CIDR notation:

```bash
bunx localnet 192.168.1.0/24
```

This will scan the entire 192.168.1.0/24 subnet and display information about discovered devices.

## Output Format

The output displays discovered devices with the following information:

```
IP Address      MAC Address             Manufacturer
192.168.1.1     34:af:2c:bb:d1:c9       NETGEAR
192.168.1.5     dc:a6:32:01:71:86       Intel Corporate
192.168.1.10    48:65:ee:15:19:ac       Apple, Inc.
```

## Performance

The tool uses concurrent requests with a default batch size of 50 simultaneous operations for optimal performance.

## Dependencies

- Uses the nmap MAC prefixes database to identify device manufacturers
- No external npm packages - relies solely on Bun's built-in APIs

## License

[MIT License](LICENSE)
