import '../styles/main.css';
import QRCodeStyling from "qr-code-styling";

const FORM_URL = 'https://tracx.me/kiqigo';

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

  return `${FORM_URL}?${queryString}`;
}
const qrCode = new QRCodeStyling({
  width: 450,
  height: 450,
  type: "svg",
  shape: "circle",
  data: buildUrl(),
  dotsOptions: { color: "#fff" },
  backgroundOptions: { color: "#00cd00" }
});
qrCode.append(document.getElementById("qr-code-container"));