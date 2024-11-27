import Alpine from 'alpinejs';
import '../styles/main.css';
import QRCodeStyling from "qr-code-styling";

Alpine.store('core', {
  style: getStyle(),
  settings: screenly.settings,
  metadata: screenly.metadata,
});

function buildUrl() {
  const { location, hostname } = screenly.metadata;
  const queryParams = {
    src: 'screenly',
    loc: encodeURIComponent(location),
    placement: encodeURIComponent(hostname),
  };

  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `${screenly.settings.url}?${queryString}`;
}

function getStyle(){
  return {
    logo_url: 'resources/images/logo.svg',
    primary_colour: '#025E73',
    secondary_colour: '#011F26'
  }
}

const qrCode = new QRCodeStyling({
  width: 280,
  height: 280,
  type: "svg",
  data: buildUrl(),
  // STYLE BELOW WILL COME FROM TRACX LINK ENDPOINT
  // shape: "circle",
  // dotsOptions: { color: "#fff" },
  // backgroundOptions: { color: "#00cd00" }
});

qrCode.append(document.getElementById("qr-code-container"));

//START ALPINE
Alpine.start();