Connect Your FlightScope X3C
The FlightScope X3C is a radar-tracking-based Launch Monitor system by FlightScope that captures club and ball data for indoor and outdoor use. It features Wi-Fi connectivity for use in your Simulator setup.

Wi-Fi Direct Connection - iOS/iPadOS, MacOS & Windows (PC)
The Wi-Fi Direct connection method details the method of connecting your device directly to the Wi-Fi network broadcast by the FlightScope X3C Launch Monitor so that it can be used with Awesome Golf Simulator. This connection method requires a secondary Internet connection such that you can establish connectivity to both the Internet and Launch Monitor at once.

An Internet connection is required to use Awesome Golf Simulator. When using an iPhone or iPad (cellular) this Internet connectivity can be provided by the cellular (4G/5G) connection. On MacOS or Windows, this connectivity can be provided by using an ethernet cable for connectivity or adding a USB Wi-Fi adapter, such as the TP-Link T3U Nano USB Wi-Fi Adapter. It may also be possible to use a secondary Internet connection using Bluetooth from another device with an Internet connection.

If your FlightScope X3C is off, hold down the power button until a beep is heard and the user interface illuminates.

On your primary device (iOS/iPadOS, MacOS, or Windows), go to your device's Wi-Fi settings and search for the network named after your device's serial number (for example FS X3C-010234).

Connect to the network, entering the Launch Monitor's 10-digit serial number as the password (for example X3C-010234).

On your primary device, use your secondary Internet connection to connect to your preferred Wi-Fi network, hotspot, or cellular data.

Open Awesome Golf Simulator on your primary device, select FlightScope from the Launch Monitor connection screen, then select the FlightScope X3C when it appears in the list of discovered devices, or select the Auto select & connect option to automatically connect to the first-discovered Launch Monitor.

The following links can be used to download Awesome Golf Simulator:

Awesome Golf Simulator - Windows.
Awesome Golf Simulator - Apple App Store.
Ethernet Connection - iOS/iPadOS, MacOS & Windows (PC)
The Ethernet connection method allows a FlightScope X3C to be connected to Awesome Golf Simulator using an Ethernet (RJ45) cable. This method provides a stable and reliable connection - when connecting to the Launch Monitor using a Router or Network Switch, this connection method can also ensure Internet connectivity without needing a secondary connectivity method.

Connect one end of an Ethernet (RJ45) cable to the Ethernet port on the back of the FlightScope X3C

Using a Router or Network Switch: Connect the other end of the Ethernet cable to an available LAN port on your Router or Network Switch.

Using a Direct Connection: Connect the other end of the Ethernet cable directly to an Ethernet port on your primary device. Using this method of connection may require you to use a secondary connection to the Internet to maintain Internet connectivity. If your device has multiple Ethernet ports, you may be able to connect one port to a source of Internet connectivity and the other to the Launch Monitor - alternatively, Wi-Fi or Hotspot connectivity may be used for Internet access.

If your FlightScope X3C is off, hold down the power button until a beep is heard and the user interface illuminates.

Open Awesome Golf Simulator on your primary device, select FlightScope from the Launch Monitor connection screen, then select the FlightScope X3C when it appears in the list of discovered devices, or select the Auto select & connect option to automatically connect to the first-discovered Launch Monitor.

The following links can be used to download Awesome Golf Simulator:

Awesome Golf Simulator - Windows.
Awesome Golf Simulator - Apple App Store.
Related Links
FlightScope X3C Product Page: flightscope.com/products/flightscope-x3c
FlightScope X3C Manuals: flightscope.com/pages/user-manuals
FlightScope Firmware and Apps: flightscope.com/pages/firmware-apps

---

## Research Notes (2026-07-10): App/API Integration Options

Context: evaluating how the Golfer360 data model (see `CLAUDE.md`) could pull live shot data
out of a bay's launch monitor instead of relying on manual/mock entry.

### FlightScope X3C has no public API or SDK
- The Awesome Golf connection guide above only documents Wi-Fi Direct / Ethernet *network*
  setup (how a simulator PC/tablet joins the device's network) — nothing about data format,
  discovery protocol, or a developer API.
- FlightScope does not publish its protocol. Anything talking to an X3C/Mevo+ today is either
  FlightScope's own approved software (Awesome Golf, E6 Connect, GSPro, The Golf Club 2019) or
  a reverse-engineered client.
- Community project [`ironsight`](https://github.com/divotmaker/ironsight) reverse-engineered
  the Mevo+/Gen2 binary protocol (TCP port 5100: handshake → config → arm → keepalive → shot).
  X3C is the same product family but **not confirmed identical** — this path is unofficial,
  undocumented, and can break on firmware updates. Treat as experimental only, not something to
  architect the bay integration around.

### The one open, documented contract in this ecosystem: GSPro Open Connect
[GSPro Open Connect v1](https://gsprogolf.com/GSProConnectV1.html) is a real, documented, local
JSON-over-TCP socket (`127.0.0.1:0921`, no auth) that launch monitor software pushes shot data
to:
- LM → GSPro: `DeviceID`, `ShotNumber`, `BallData` (Speed, Spin, HLA/VLA, Carry), optional
  `ClubData`, `ShotDataOptions` (ready/ball-detected/heartbeat flags).
- GSPro → LM: `200`/`201` responses, plus a `Player` object (handedness, current club).
- This is how the community bridges non-native launch monitors into GSPro. It's the one open
  socket in this whole vendor landscape worth building against.

### Implication for Golfer360 integration phasing
- **Phase 1 (native API)** — not available for FlightScope. Dead end unless FlightScope opens a
  real developer API in the future.
- **Best near-term path** — if bays run GSPro as the sim software, sit as a second client on the
  Open Connect socket (or a small local relay) so shot JSON gets mirrored to Salesforce/middleware
  at the same time GSPro consumes it for gameplay. Only works for GSPro; Awesome Golf Simulator
  has no equivalent open socket documented.
- **Phase 2 (session export)** stays the realistic fallback for any bay/software combo without an
  open socket — pull post-round exports rather than live shot-by-shot streaming.
- Before committing to a bay's simulator software choice, confirm whether it'll be GSPro
  specifically — that's what unlocks the Open Connect integration path.