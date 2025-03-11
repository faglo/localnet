const OUIs_LINK =
  "https://raw.githubusercontent.com/nmap/nmap/refs/heads/master/nmap-mac-prefixes";
const IS_WINDOWS = process.platform === "win32";
const MANUFACTURERS = await fetchManufacturers();
const CIDR = process.argv[2];

if (!CIDR) {
  console.error("Usage: bun run index.ts <CIDR>");
  process.exit(1);
}

// Generate IP list from CIDR
function* generateIPs() {
  const [baseIp, prefix] = CIDR.split("/");
  const mask = parseInt(prefix || "24", 10);
  const ipParts = baseIp.split(".").map(Number);
  if (ipParts.length < 4) {
    console.error("IP address not valid");
    process.exit(1);
  }
  // Calculate the starting IP as a 32-bit integer
  const start =
    (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];

  // Use bit shift for faster calculation of max IPs
  const max = 1 << (32 - mask);

  for (let i = 1; i < max - 1; i++) {
    const ip = start + i;
    // Break down the 32-bit IP into octets and format as a string
    const a = (ip >>> 24) & 0xff;
    const b = (ip >>> 16) & 0xff;
    const c = (ip >>> 8) & 0xff;
    const d = ip & 0xff;
    yield `${a}.${b}.${c}.${d}`;
  }
}

async function fetchManufacturers() {
  try {
    const resp = await (await Bun.fetch(OUIs_LINK)).text();
    const lines = resp.split("\n");
    const result_object: Map<string, string> = new Map();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("#") || !line.trim()) continue;
      const [oui, ...manufacturer] = line.split(" ");
      if (!oui || !manufacturer) continue;
      result_object.set(oui, manufacturer.join(" "));
    }
    return result_object;
  } catch (e) {
    console.error(`Error when fetching OUIs\n${e}`);
    process.exit(1);
  }
}

async function getManufacturer(mac: string) {
  const oui = mac.replace(/:/g, "").slice(0, 6).toUpperCase();
  return MANUFACTURERS.get(oui) || "Unknown";
}

async function pingIP(ip: string) {
  const args = IS_WINDOWS
    ? ["-n", "1", "-w", "1000", ip]
    : ["-c", "1", "-W", "1", ip];
  return (
    (await Bun.spawn(["ping", ...args], {
      stderr: "ignore",
      stdout: "ignore",
    }).exited) === 0
  );
}

async function getMAC(ip: string) {
  try {
    let matches: string[] = [];
    const arp_cmd = IS_WINDOWS ? ["arp", "-a", ip] : ["arp", "-n", ip];
    const proc = Bun.spawn(arp_cmd, {
      stdout: "pipe",
      stderr: "ignore",
    });
    const output = await new Response(proc.stdout).text();
    const exit_code = await proc.exited;
    if (exit_code !== 0) return "Not Found";

    if (IS_WINDOWS) {
      matches =
        new RegExp(
          `${ip.replace(
            /\./g,
            "\\."
          )}\\s+(\\w{2}[-:]\\w{2}[-:]\\w{2}[-:]\\w{2}[-:]\\w{2}[-:]\\w{2})`,
          "i"
        ).exec(output) || [];
    } else {
      matches = new RegExp(/at\s+([0-9a-fA-F:]+)\s+on/g).exec(output) || [];
    }
    const mac = matches?.length ? matches[1].replace(/-/g, ":") : "Not Found";
    return mac;
  } catch {
    return "Error";
  }
}

async function main() {
  const IPs = [...generateIPs()];
  const CONCURRENCY = 50;
  console.log(`Scanning ${IPs.length} IP addresses...`);
  console.log(`IP Address\tMAC Address\t\tManufacturer`);

  for (let i = 0; i < IPs.length; i += CONCURRENCY) {
    const batch = IPs.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (ip) => {
        const up = await pingIP(ip);
        if (up) {
          const mac = await getMAC(ip);
          const manufacturer = await getManufacturer(mac);
          console.log(`${ip}\t${mac}\t${manufacturer}`);
        }
      })
    );
  }
}

main();
